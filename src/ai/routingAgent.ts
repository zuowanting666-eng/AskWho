import type { AgentContext, AgentDecision, Candidate, Concern, ExperienceAsset, ExperienceRequirement, ExperienceResponse, HumanResponse, MatchResult, ParsedIntent, QuestionRoute } from './types'
import { traceExecution } from './trace.ts'
import { understandQuerySkill } from './skills/understandQuerySkill.ts'
import { matchExperienceSkill } from './skills/matchExperienceSkill.ts'
import { routeQuestionSkill } from './skills/routeQuestionSkill.ts'
import { synthesizeAnswerSkill } from './skills/synthesizeAnswerSkill.ts'
import { buildExperienceAssetSkill } from './skills/buildExperienceAssetSkill.ts'

export type AgentResult<T> = { result: T; decision: AgentDecision; context: AgentContext }

class RoutingAgent {
  analyzeQuestion(question: string): AgentResult<ParsedIntent> {
    const result = traceExecution({ stage: 'understand', skill: 'understandQuerySkill', inputSummary: `${question.trim().length} characters`, outputSummary: value => `${value.experienceRequirements.length} requirements / ${value.concerns.length} concerns`, execute: () => understandQuerySkill(question) })
    const decision: AgentDecision = result.needsClarification
      ? { stage: 'understand', action: 'request_clarification', reason: '当前本地规则只能识别到泛化的经历问题，保留一个澄清问题供后续流程使用。', metadata: { confidence: result.confidence } }
      : { stage: 'understand', action: 'use_initial_interpretation', reason: `已识别为${result.problemType}类经历问题，交给用户校准经历条件与关注点。`, metadata: { confidence: result.confidence } }
    return { result, decision, context: { question, parsedIntent: result, experienceRequirements: result.experienceRequirements, concerns: result.concerns } }
  }

  prepareMatch(input: { parsedIntent?: ParsedIntent; currentRequirements: ExperienceRequirement[]; concerns: Concern[]; candidates: Candidate[] }): AgentResult<MatchResult[]> {
    const summary = `${input.currentRequirements.filter(item => item.priority === 'must').length} must / ${input.currentRequirements.filter(item => item.priority === 'preferred').length} preferred / ${input.candidates.length} candidates`
    const strict = traceExecution({ stage: 'match', skill: 'matchExperienceSkill', inputSummary: summary, outputSummary: value => `${value.filter(item => !item.missingMust.length && item.score >= 70).length} high matches`, execute: () => matchExperienceSkill(input.currentRequirements, input.candidates) })
    const highMatches = strict.filter(item => !item.missingMust.length && item.score >= 70)
    if (highMatches.length >= 3) {
      const result = highMatches.slice(0, 3)
      return { result, decision: { stage: 'match', action: 'use_strict_match', reason: `已有 ${result.length} 位候选人满足核心经历要求。`, metadata: { strategy: 'strict' } }, context: { parsedIntent: input.parsedIntent, experienceRequirements: input.currentRequirements, concerns: input.concerns, matches: result } }
    }
    const relaxed = traceExecution({ stage: 'match', skill: 'matchExperienceSkill', inputSummary: `${summary} / preferred relaxed`, outputSummary: value => `${value.filter(item => !item.missingMust.length).length} must-qualified candidates`, execute: () => matchExperienceSkill(input.currentRequirements, input.candidates, { relaxPreferred: true }) }).filter(item => !item.missingMust.length).slice(0, 3)
    const decision: AgentDecision = relaxed.length
      ? { stage: 'match', action: 'relax_preferred', reason: '核心经历保持不变，已适当放宽优先条件。', metadata: { strategy: 'relaxed_preferred', count: relaxed.length } }
      : { stage: 'match', action: 'no_match', reason: '当前条件下没有足够匹配的经历者。', metadata: { strategy: 'strict', count: 0 } }
    return { result: relaxed, decision, context: { parsedIntent: input.parsedIntent, experienceRequirements: input.currentRequirements, concerns: input.concerns, matches: relaxed } }
  }

  prepareRoutes(input: { concerns: Concern[]; matchResults: MatchResult[] }): AgentResult<QuestionRoute[]> {
    const selected = input.concerns.filter(item => item.selected).length
    const result = traceExecution({ stage: 'route', skill: 'routeQuestionSkill', inputSummary: `${selected} selected concerns / ${input.matchResults.length} matches`, outputSummary: value => `${value.length} unique routes`, execute: () => routeQuestionSkill(input.concerns, input.matchResults) })
    const decision: AgentDecision = result.length
      ? { stage: 'route', action: 'route_to_best_experience', reason: `已把 ${result.length} 个问题分别交给最适合的经历者，每人最多收到一个。` }
      : { stage: 'route', action: 'no_route', reason: '当前没有可分配的问题或匹配经历者。' }
    return { result, decision, context: { concerns: input.concerns, matches: input.matchResults, routes: result } }
  }

  synthesize(input: { responses: ExperienceResponse[]; concerns: Concern[]; routes: QuestionRoute[]; candidates: Candidate[] }) {
    const result = traceExecution({ stage: 'synthesize', skill: 'synthesizeAnswerSkill', inputSummary: `${input.responses.length} response records / ${input.concerns.filter(item => item.selected).length} concerns`, outputSummary: value => `${value.sampleSize} usable responses / ${value.consensus.length} consensus / ${value.differences.length} differences`, execute: () => synthesizeAnswerSkill(input) })
    const decision: AgentDecision = result.sampleSize === 0
      ? { stage: 'synthesize', action: 'wait_for_human_experience', reason: '还没有收到足够的真人经验，不能生成答案。' }
      : result.limitedEvidence
        ? { stage: 'synthesize', action: 'show_limited_evidence', reason: '目前只有 1 份真人经验，只展示原话和轻总结。', metadata: { sampleSize: 1 } }
        : result.hasConflict
          ? { stage: 'synthesize', action: 'surface_differences', reason: '回答中存在明显冲突，不强行合并为统一结论。', metadata: { sampleSize: result.sampleSize } }
          : { stage: 'synthesize', action: 'show_consensus_and_differences', reason: '已有足够回答，可以展示可追溯的共识与差异。', metadata: { sampleSize: result.sampleSize } }
    return { result, decision, context: { concerns: input.concerns, routes: input.routes, responses: input.responses.filter((item): item is HumanResponse => item.source === 'human') } }
  }

  updateExperienceAssets(input: { assets: ExperienceAsset[]; responses: HumanResponse[]; routes?: QuestionRoute[] }) {
    const result = traceExecution({ stage: 'asset', skill: 'buildExperienceAssetSkill', inputSummary: `${input.assets.length} assets / ${input.responses.length} confirmed responses`, outputSummary: value => value.createdNewAsset ? '1 new asset' : value.mergedIntoAssetId ? `merged into ${value.mergedIntoAssetId}` : 'no asset change', execute: () => buildExperienceAssetSkill(input) })
    const decision: AgentDecision = result.createdNewAsset
      ? { stage: 'asset', action: 'create_experience_asset', reason: '这条主动确认的回答没有对应资产，已建立新的经验资产。', metadata: { assetId: result.mergedIntoAssetId } }
      : result.mergedIntoAssetId
        ? { stage: 'asset', action: 'merge_into_existing_asset', reason: '新回答与已有经验资产相符，已合并而不创建重复资产。', metadata: { assetId: result.mergedIntoAssetId } }
        : { stage: 'asset', action: 'keep_existing_assets', reason: '本次没有新的真人回答需要沉淀。' }
    return { result, decision, context: { routes: input.routes, responses: input.responses, experienceAssets: result.assets } }
  }
}

export const routingAgent = new RoutingAgent()
