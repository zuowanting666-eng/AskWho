import type { Candidate, Concern, ExperienceResponse } from '../ai/types'
import type { HumanResponse, InvitationRoute } from './requestState'

export type AnswerResponse = ExperienceResponse
type MockResponse = Pick<AnswerResponse, 'candidateId' | 'concernId' | 'question' | 'selectedOption' | 'note' | 'source'>

export function collectAnswerResponses(responses: HumanResponse[], routes: InvitationRoute[], mocks: readonly MockResponse[]): AnswerResponse[] {
  return routes.flatMap<AnswerResponse>((route, index) => {
    const human = responses.find((item) => item.routeId === route.id && item.candidateId === route.candidateId && item.concernId === route.concern.id)
    if (human) return [human]
    // The operated invitation must never be replaced by a fabricated answer.
    if (index === 0 || route.concern.source === 'user') return []
    const mock = mocks.find((item) => item.candidateId === route.candidateId && item.concernId === route.concern.id)
    return mock ? [{ ...mock, id: `mock-${route.id}`, routeId: route.id, question: route.microQuestion, createdAt: '', source: 'mock' as const }] : []
  })
}

export type Fact = 'crowd' | 'clear' | 'routeEasy' | 'routeHard' | 'languageEasy' | 'languageHard' | 'soloEasy' | 'soloHard' | 'slow' | 'walk'
// Exact structured answers are interpreted in the question's context, never by keywords alone.
const optionFacts: Record<string, Record<string, Fact[]>> = {
  crowd: { '人很多，但还能正常走': ['crowd', 'walk'], '非常拥挤，需要跟着人流慢慢走': ['crowd', 'slow'], '比我预想得轻松': [] },
  route: { '很好找，跟着指引就可以': ['routeEasy'], '路线不难，但进站比较慢': ['routeEasy', 'slow'], '路线本身不难，但散场后进站会比较慢。': ['routeEasy', 'slow'], '第一次去有点绕': ['routeHard'] },
  language: { '基本不影响': ['languageEasy'], '有一点影响，但手机导航够用': ['languageEasy'], '比较困难，需要提前做攻略': ['languageHard'] },
  solo: { '人太多，有点慌': ['crowd', 'soloHard'], '找路线最麻烦': ['routeHard'], '一个人其实没有明显问题': ['soloEasy'] },
}
// A small explicit phrase vocabulary, not a general language model. Unknown text
// remains verbatim evidence; it is never guessed into a positive conclusion.
const clauses: Record<string, Fact[]> = {
  '人很多': ['crowd'], '进站时人很多': ['crowd'], '人太多': ['crowd'], '人不多': ['clear'], '不拥挤': ['clear'],
  '但还能正常走': ['walk'], '但回新宿的路线不难': ['routeEasy'], '回新宿的路线不难': ['routeEasy'],
  '路线不难': ['routeEasy'], '路线很好找': ['routeEasy'], '路线很难找': ['routeHard'], '路线不好找': ['routeHard'],
  '进站时需要慢慢走': ['slow'], '不会日语影响很大': ['languageHard'], '不会日语基本不影响': ['languageEasy'],
  '一个人很慌': ['soloHard'], '一个人不慌': ['soloEasy'], '真正让我紧张的是人多': ['crowd', 'soloHard'],
}
function factsFor(response: AnswerResponse, route: InvitationRoute) {
  // Custom questions have no established semantic scope in this demo.
  if (route.concern.source === 'user') return new Set<Fact>()
  const facts = new Set<Fact>(optionFacts[response.concernId]?.[response.selectedOption] ?? [])
  // Split only complete clauses. Negated/conditional/quoted near matches do not match.
  const note = /如果|假如|听说|朋友说|别人说|并不是|并非|[“”「」"]/.test(response.note) ? '' : response.note
  for (const clause of `${response.selectedOption}。${note}`.split(/[，。！？；\n]/).map(s => s.trim())) {
    for (const fact of clauses[clause] ?? []) facts.add(fact)
  }
  return facts
}

export type EvidenceStatement = { id: string; statement: string; relatedResponseIds: string[] }
export type RawResponse = AnswerResponse & { candidate: Candidate }
export type ResponseEvidence = {
  rawResponses: RawResponse[]
  relatedResponseIds: Record<Fact, string[]>
  conflictingDifferences: EvidenceStatement[]
  disputedFacts: Fact[]
  timeEvidence?: EvidenceStatement
}

const allFacts: Fact[] = ['crowd', 'clear', 'routeEasy', 'routeHard', 'languageEasy', 'languageHard', 'soloEasy', 'soloHard', 'slow', 'walk']

export function extractResponseEvidence(responses: AnswerResponse[], selectedConcerns: Concern[], routes: InvitationRoute[], candidates: Candidate[]): ResponseEvidence {
  const selected = new Set(selectedConcerns.filter(c => c.selected).map(c => c.id))
  const seen = new Set<string>()
  const rawResponses: RawResponse[] = []
  // Route order + human precedence, excluding old batches and duplicates.
  for (const route of routes) {
    if (!selected.has(route.concern.id)) continue
    const candidate = candidates.find(c => c.id === route.candidateId)
    const choices = responses.filter(r => r.routeId === route.id && r.candidateId === route.candidateId && r.concernId === route.concern.id)
    const response = choices.find(r => r.source === 'human') ?? choices[0]
    if (candidate && response && !seen.has(response.candidateId)) { rawResponses.push({ ...response, candidate }); seen.add(response.candidateId) }
  }
  const facts = new Map(rawResponses.map(r => [r.id, factsFor(r, routes.find(route => route.id === r.routeId)!)]))
  const ids = (fact: Fact) => rawResponses.filter(r => facts.get(r.id)!.has(fact)).map(r => r.id)
  const conflictingDifferences: EvidenceStatement[] = []
  const conflicts: [Fact, Fact, string][] = [
    ['crowd', 'clear', '对人流拥挤程度的描述不同'], ['routeEasy', 'routeHard', '路线是否好找，体验有差异'],
    ['languageEasy', 'languageHard', '语言障碍的影响不一样'], ['soloEasy', 'soloHard', '独自行动时的心理感受不同'],
  ]
  const disputed = new Set<Fact>()
  for (const [positive, negative, statement] of conflicts) {
    if (ids(positive).length && ids(negative).length) {
      disputed.add(positive); disputed.add(negative)
      conflictingDifferences.push({ id: positive, statement, relatedResponseIds: [...new Set([...ids(positive), ...ids(negative)])] })
    }
  }
  const times = rawResponses.flatMap(r => {
    // Only reported departure-to-boarding durations, not forecasts, negations,
    // walking-only/train-ride durations, hypothetical advice or unrelated numbers.
    const durations = r.note.split(/[。！？；\n]/).flatMap(s => {
      const sentence = s.trim()
      const match = sentence.match(/^我(?:当时)?从(?:离场|散场)到(?:真正)?坐上车(?:大概)?(?:用了)?\s*(\d{1,3})\s*分钟$/)
        ?? sentence.match(/^我(?:当时)?(?:跟着人流走|跟着现场指引走)[，,]\s*(?:大概|约)?\s*(\d{1,3})\s*分钟(?:就)?坐上车$/)
      return match ? [Number(match[1])] : []
    })
    if (durations.length !== 1) return []
    const value = durations[0]
    return value > 0 && value <= 240 ? [{ id: r.id, value }] : []
  })
  let timeEvidence: EvidenceStatement | undefined
  if (times.length >= 2) {
    const min = Math.min(...times.map(t => t.value)), max = Math.max(...times.map(t => t.value))
    timeEvidence = { id: 'time', statement: `这 ${times.length} 份回答里，从散场到坐上车约 ${min === max ? min : `${min}–${max}`} 分钟。`, relatedResponseIds: times.map(t => t.id) }
  }
  return {
    rawResponses,
    relatedResponseIds: Object.fromEntries(allFacts.map(fact => [fact, ids(fact)])) as Record<Fact, string[]>,
    conflictingDifferences,
    disputedFacts: [...disputed],
    timeEvidence,
  }
}
