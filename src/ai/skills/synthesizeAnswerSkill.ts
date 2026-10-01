import type { Candidate, Concern, ExperienceResponse, QuestionRoute } from '../types'
import { extractResponseEvidence } from '../../utils/synthesizeResponses.ts'
import type { EvidenceStatement, Fact, RawResponse } from '../../utils/synthesizeResponses'

export type Consensus = EvidenceStatement & { supportCount: number; totalCount: number }
export type Synthesis = {
  conclusion: string
  summary: string
  confidenceLabel: string
  consensus: Consensus[]
  differences: EvidenceStatement[]
  rawResponses: RawResponse[]
  hasConflict: boolean
  timeEvidence?: EvidenceStatement
  conclusionResponseIds: string[]
  sampleSize: number
  limitedEvidence: boolean
}

const statements: [Fact, string][] = [
  ['crowd', '散场后人比较多'],
  ['routeEasy', '回新宿的路线不算复杂'],
  ['languageEasy', '不会日语的影响有限'],
  ['slow', '进站或行走需要慢下来'],
]

export function synthesizeAnswerSkill(input: { responses: ExperienceResponse[]; concerns: Concern[]; routes: QuestionRoute[]; candidates: Candidate[] }): Synthesis {
  const evidence = extractResponseEvidence(input.responses, input.concerns, input.routes, input.candidates)
  const { rawResponses, relatedResponseIds, conflictingDifferences, disputedFacts, timeEvidence } = evidence
  const sampleSize = rawResponses.length
  const limitedEvidence = sampleSize < 2
  const disputed = new Set(disputedFacts)
  const related = (fact: Fact) => relatedResponseIds[fact]
  const hasConflict = conflictingDifferences.length > 0

  // Consensus is a product policy: at least two traceable responses must
  // support the same non-disputed statement.
  const consensus: Consensus[] = limitedEvidence ? [] : statements.flatMap(([fact, statement]) => {
    const ids = related(fact)
    return ids.length >= 2 && !disputed.has(fact)
      ? [{ id: fact, statement, supportCount: ids.length, totalCount: sampleSize, relatedResponseIds: ids }]
      : []
  }).slice(0, 3)

  const differences = [...conflictingDifferences]
  if (!hasConflict && sampleSize > 1) {
    if (related('walk').length && related('slow').length) differences.push({ id: 'pace', statement: '有人还能正常走，也有人需要慢下来。行动节奏不完全一样。', relatedResponseIds: [...new Set([...related('walk'), ...related('slow')])] })
    else differences.push({ id: 'focus', statement: '这些回答描述的是不同侧面，还不能把它们当作每个人都会有的同一种体验。', relatedResponseIds: rawResponses.map(response => response.id) })
  }

  const defaultSupported = related('routeEasy').length >= 2 && related('crowd').length >= 2 && !hasConflict
  const conclusion = sampleSize === 0
    ? '还没有足够的回答。'
    : sampleSize === 1
      ? '先看看这一位的亲身经历。'
      : hasConflict
        ? '这件事的体验差异比较大。'
        : defaultSupported
          ? '整体没有想象中难，真正需要准备的是散场人流。'
          : consensus[0]?.statement ?? '先看各自经历，再判断自己的情况。'
  const summaryParts = statements
    .filter(([fact]) => related(fact).length >= 2 && !disputed.has(fact))
    .map(([fact, statement]) => `${related(fact).length} 份回答提到${statement}。`)
  const summary = sampleSize === 0
    ? '收到回答后再整理，不补充没有依据的经历。'
    : sampleSize === 1
      ? `这位经历者说：“${rawResponses[0].selectedOption}”。目前只是一份参考。`
      : hasConflict
        ? '回答里出现了不同的感受，暂时不合成一个统一结论。先看差异，再对照原话判断。'
        : defaultSupported
          ? `这几份经历里，回新宿的路线普遍不算复杂，更需要预留的是散场人流${timeEvidence ? '和进站时间' : ''}。`
          : summaryParts.slice(0, 3).join('') || '现有回答还不足以形成共同判断，可以先对照原始经验。'

  // Final evidence guard: every aggregate claim must point to a response that
  // survived filtering and deduplication. Missing information cannot become a conclusion.
  const validResponseIds = new Set(rawResponses.map(response => response.id))
  const safeConsensus = consensus.filter(item => item.relatedResponseIds.length === item.supportCount && item.relatedResponseIds.every(id => validResponseIds.has(id)))
  const safeDifferences = differences.filter(item => item.relatedResponseIds.length > 0 && item.relatedResponseIds.every(id => validResponseIds.has(id))).slice(0, 2)

  return { conclusion, summary, confidenceLabel: `基于 ${sampleSize} 位经历者`, consensus: safeConsensus, differences: safeDifferences, rawResponses, hasConflict, timeEvidence, conclusionResponseIds: [...validResponseIds], sampleSize, limitedEvidence }
}
