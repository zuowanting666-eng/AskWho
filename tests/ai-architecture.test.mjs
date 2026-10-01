import test from 'node:test'
import assert from 'node:assert/strict'
import { routingAgent } from '../src/ai/routingAgent.ts'
import { understandQuerySkill } from '../src/ai/skills/understandQuerySkill.ts'
import { matchExperienceSkill } from '../src/ai/skills/matchExperienceSkill.ts'
import { routeQuestionSkill } from '../src/ai/skills/routeQuestionSkill.ts'
import { synthesizeAnswerSkill } from '../src/ai/skills/synthesizeAnswerSkill.ts'
import { buildExperienceAssetSkill } from '../src/ai/skills/buildExperienceAssetSkill.ts'
import { clearAITraces, getAITraces } from '../src/ai/trace.ts'
import { demoCandidates, demoExperienceAssets, mockResponses } from '../src/data/demoData.ts'
import { collectAnswerResponses } from '../src/utils/synthesizeResponses.ts'

const question = '我第一次一个人去东京看演唱会，也不会日语。东京巨蛋晚上散场以后回新宿会不会特别困难？'
const intent = understandQuerySkill(question)
const matches = matchExperienceSkill(intent.experienceRequirements, demoCandidates).slice(0, 3)
const routes = routeQuestionSkill(intent.concerns, matches)
const human = {
  id: 'round7-human', candidateId: routes[0].candidateId, routeId: routes[0].id,
  concernId: routes[0].concernId, question: routes[0].routedQuestion,
  selectedOption: '人很多，但还能正常走', note: '我当时跟着人流走，大概25分钟坐上车。',
  createdAt: '2026-10-01T00:00:00Z', source: 'human', experienceAssetId: 'tokyo-dome',
}

test('Tokyo question becomes the fixed 2 must / 3 preferred / 4 concern intent', () => {
  assert.equal(intent.problemType, 'experience')
  assert.equal(intent.experienceRequirements.filter(item => item.priority === 'must').length, 2)
  assert.equal(intent.experienceRequirements.filter(item => item.priority === 'preferred').length, 3)
  assert.equal(intent.concerns.length, 4)
  assert.equal(intent.confidence, .92)
})

test('unknown questions return a safe clarification fallback', () => {
  const fallback = understandQuerySkill('这件事到底怎么样？')
  assert.equal(fallback.needsClarification, true)
  assert.equal(fallback.experienceRequirements[0].label, '相关真实经历')
  assert(fallback.clarificationQuestion)
})

test('ignored language requirement is absent from match reasons', () => {
  const requirements = intent.experienceRequirements.map(item => item.id === 'language' ? { ...item, priority: 'ignored' } : item)
  const results = matchExperienceSkill(requirements, demoCandidates)
  assert(results.every(result => !result.matchedPreferred.includes('不会日语')))
  assert(results.every(result => !result.reason.includes('3 个优先经历')))
})

test('routing produces at most one selected concern per candidate', () => {
  const three = routeQuestionSkill(intent.concerns.map((item, index) => ({ ...item, selected: index < 3 })), matches)
  assert.equal(three.length, 3)
  assert.equal(new Set(three.map(item => item.candidateId)).size, 3)
  const two = routeQuestionSkill(intent.concerns.map((item, index) => ({ ...item, selected: index < 2 })), matches)
  assert.equal(two.length, 2)
  assert.equal(new Set(two.map(item => item.candidateId)).size, 2)
})

test('one response stays limited and never claims group consensus', () => {
  const result = synthesizeAnswerSkill({ responses: [human], concerns: intent.concerns, routes, candidates: demoCandidates })
  assert.equal(result.limitedEvidence, true)
  assert.equal(result.consensus.length, 0)
  assert(!`${result.conclusion}${result.summary}`.includes('大家一致认为'))
})

test('zero responses produce a wait decision instead of an invented answer', () => {
  const outcome = routingAgent.synthesize({ responses: [], concerns: intent.concerns, routes, candidates: demoCandidates })
  assert.equal(outcome.result.sampleSize, 0)
  assert.equal(outcome.result.limitedEvidence, true)
  assert.equal(outcome.result.conclusion, '还没有足够的回答。')
  assert.equal(outcome.decision.action, 'wait_for_human_experience')
})

test('three traceable responses can produce consensus and differences', () => {
  const responses = collectAnswerResponses([human], routes, mockResponses)
  const result = synthesizeAnswerSkill({ responses, concerns: intent.concerns, routes, candidates: demoCandidates })
  assert.equal(result.sampleSize, 3)
  assert(result.consensus.length > 0)
  assert(result.differences.length > 0)
})

test('a new Tokyo response merges into the existing asset', () => {
  const result = buildExperienceAssetSkill({ assets: demoExperienceAssets, responses: [human], routes })
  assert.equal(result.mergedIntoAssetId, 'tokyo-dome')
  assert.equal(result.createdNewAsset, false)
  assert.equal(result.assets.length, demoExperienceAssets.length)
  assert.equal(result.updatedAsset.answerCount, demoExperienceAssets[0].answerCount + 1)
})

test('agent handles an empty candidate pool without crashing', () => {
  const result = routingAgent.prepareMatch({ parsedIntent: intent, currentRequirements: intent.experienceRequirements, concerns: intent.concerns, candidates: [] })
  assert.deepEqual(result.result, [])
  assert.equal(result.decision.action, 'no_match')
})

test('trace records summaries without storing the raw question', () => {
  clearAITraces()
  routingAgent.analyzeQuestion(question)
  const trace = getAITraces()[0]
  assert.equal(trace.status, 'success')
  assert.equal(trace.skill, 'understandQuerySkill')
  assert(!trace.inputSummary.includes('东京巨蛋'))
})
