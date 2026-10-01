import type { ParsedIntent } from '../types'

const tokyoRequirements: ParsedIntent['experienceRequirements'] = [
  { id: 'venue', label: '东京巨蛋演唱会', priority: 'must', source: 'ai' },
  { id: 'night', label: '夜间散场', priority: 'must', source: 'ai' },
  { id: 'solo', label: '一个人行动', priority: 'preferred', source: 'ai' },
  { id: 'language', label: '不会日语', priority: 'preferred', source: 'ai' },
  { id: 'destination', label: '回新宿', priority: 'preferred', source: 'ai' },
]
const tokyoConcerns: ParsedIntent['concerns'] = [
  { id: 'crowd', label: '散场后到底有多挤？', selected: true, source: 'ai' },
  { id: 'route', label: '回新宿实际好不好走？', selected: true, source: 'ai' },
  { id: 'language', label: '不会日语会不会真的造成困难？', selected: true, source: 'ai' },
  { id: 'solo', label: '一个人行动会不会很慌？', selected: false, source: 'ai' },
]

const domainRules = [
  { type: 'travel' as const, keywords: /东京|演唱会|日本|散场/, must: '相关旅行经历', concerns: ['实际行程会不会困难？', '现场最需要准备什么？'] },
  { type: 'career' as const, keywords: /转行|转岗|产品|AI|工作|面试/, must: '相关职业经历', concerns: ['实际转岗过程怎么样？', '准备和面试最难的是什么？'] },
  { type: 'fashion' as const, keywords: /穿搭|大衣|身高|肩宽/, must: '相关穿着经历', concerns: ['实际穿起来怎么样？', '哪些身形条件会影响效果？'] },
]

export function understandQuerySkill(question: string): ParsedIntent {
  const normalized = question.trim()
  if (/东京巨蛋/.test(normalized) && /演唱会/.test(normalized) && /散场/.test(normalized)) {
    return { question: normalized, problemType: 'experience', experienceRequirements: tokyoRequirements.map(item => ({ ...item })), concerns: tokyoConcerns.map(item => ({ ...item })), confidence: .92, needsClarification: false }
  }
  const domain = domainRules.find(rule => rule.keywords.test(normalized))
  if (domain) return {
    question: normalized,
    problemType: domain.type,
    experienceRequirements: [{ id: `${domain.type}-experience`, label: domain.must, priority: 'must', source: 'ai' }],
    concerns: domain.concerns.map((label, index) => ({ id: `${domain.type}-${index + 1}`, label, selected: true, source: 'ai' })),
    confidence: .68,
    needsClarification: false,
  }
  return {
    question: normalized,
    problemType: 'experience',
    experienceRequirements: [{ id: 'related-experience', label: '相关真实经历', priority: 'must', source: 'ai' }],
    concerns: [{ id: 'actual-experience', label: '实际体验怎么样？', selected: true, source: 'ai' }],
    confidence: .45,
    needsClarification: true,
    clarificationQuestion: '你最想确认的是实际体验、操作难度，还是可能遇到的问题？',
  }
}
