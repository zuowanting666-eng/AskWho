import type { Concern, MatchResult, QuestionRoute } from '../types'

type Topic = 'crowd' | 'route' | 'language' | 'solo'
const topics: { topic: Topic; keywords: RegExp; expertise: RegExp; question: string; label: string }[] = [
  { topic: 'solo', keywords: /一个人|独自|女生|安全|慌/, expertise: /一个人|安全|独自/, question: '你第一次一个人散场时，最不适应的是什么？', label: '独自行动' },
  { topic: 'language', keywords: /日语|语言|沟通/, expertise: /日语|语言/, question: '你当时不会日语，在哪些环节遇到了困难？', label: '语言障碍' },
  { topic: 'route', keywords: /新宿|路线|车站|末班车|交通|地铁|返程/, expertise: /路线|车站|耗时/, question: '你当时从东京巨蛋回新宿，路线实际好找吗？', label: '返程路线' },
  { topic: 'crowd', keywords: /挤|人流|人多|拥挤/, expertise: /拥挤|现场体验|耗时/, question: '你当时散场后，人流大概是什么程度？', label: '散场人流' },
]
const topicFor = (concern: Concern) => topics.find(topic => topic.keywords.test(concern.label))

function affinity(concern: Concern, match: MatchResult) {
  const topic = topicFor(concern)
  if (!topic) return match.score / 100
  const expertiseHits = match.candidate.expertise.filter(item => topic.expertise.test(item)).length
  const experienceHits = match.candidate.experiences.filter(item => topic.keywords.test(item)).length
  return expertiseHits * 10 + experienceHits * 2 + match.score / 100
}

export function routeQuestionSkill(concerns: Concern[], matches: MatchResult[]): QuestionRoute[] {
  const selected = concerns.filter(item => item.selected).slice(0, matches.length)
  if (!selected.length || !matches.length) return []
  let bestScore = -Infinity
  let best: { concern: Concern; match: MatchResult }[] = []
  function assign(index: number, available: MatchResult[], routes: typeof best, score: number) {
    if (index === selected.length) { if (score > bestScore) { bestScore = score; best = routes }; return }
    for (const match of available) assign(index + 1, available.filter(item => item.candidate.id !== match.candidate.id), [...routes, { concern: selected[index], match }], score + affinity(selected[index], match))
  }
  assign(0, matches, [], 0)
  return selected.flatMap(concern => {
    const assignment = best.find(item => item.concern.id === concern.id)
    if (!assignment) return []
    const topic = topicFor(concern)
    const routedQuestion = concern.source === 'user' ? `按你的亲身经历，${concern.label}` : topic?.question ?? concern.label
    const reason = topic
      ? `${assignment.match.candidate.name}的经历与${topic.label}最相关，更适合回答这个问题。`
      : `${assignment.match.candidate.name}是当前未分配问题的最高匹配经历者。`
    return [{ id: `route-${concern.id}-${assignment.match.candidate.id}`, concernId: concern.id, candidateId: assignment.match.candidate.id, originalConcern: concern.label, routedQuestion, reason, concern, candidateName: assignment.match.candidate.name, microQuestion: routedQuestion }]
  })
}
