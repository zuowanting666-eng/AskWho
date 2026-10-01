import type { Concern, ExperiencePriority, ExperienceRequirement } from '../ai/types'
export type { ExperiencePriority, ExperienceRequirement } from '../ai/types'

export type Calibration = {
  experienceRequirements: ExperienceRequirement[]
  concerns: Concern[]
}

export const calibrationLimits = { must: 2, preferred: 3, user: 1, active: 5, concernCharacters: 30 } as const

export function createInitialCalibration(): Calibration {
  return {
    experienceRequirements: [
      { id: 'venue', label: '东京巨蛋演唱会', priority: 'must', source: 'ai' },
      { id: 'night', label: '夜间散场', priority: 'must', source: 'ai' },
      { id: 'solo', label: '一个人行动', priority: 'preferred', source: 'ai' },
      { id: 'language', label: '不会日语', priority: 'preferred', source: 'ai' },
      { id: 'destination', label: '回新宿', priority: 'preferred', source: 'ai' },
    ],
    concerns: [
      { id: 'crowd', label: '散场后到底有多挤？', selected: true, source: 'ai' },
      { id: 'route', label: '回新宿实际好不好走？', selected: true, source: 'ai' },
      { id: 'language', label: '不会日语会不会真的造成困难？', selected: true, source: 'ai' },
      { id: 'solo', label: '一个人行动会不会很慌？', selected: false, source: 'ai' },
    ],
  }
}

// Demo estimate only: stricter requirements reduce the eligible pool.
export function estimateMatches(requirements: ExperienceRequirement[]) {
  const must = requirements.filter((item) => item.priority === 'must').length
  const preferred = requirements.filter((item) => item.priority === 'preferred').length
  return Math.max(3, Math.min(42, 42 - must * 12 - preferred * 2))
}

export function priorityLimitMessage(requirements: ExperienceRequirement[], id: string, priority: ExperiencePriority) {
  if (priority === 'ignored') return null
  const count = requirements.filter((item) => item.id !== id && item.priority === priority).length
  if (count >= calibrationLimits[priority]) return priority === 'must'
    ? '必须匹配最多保留 2 个，先放宽一个条件。'
    : '优先匹配最多保留 3 个，先调整一个已有条件。'
  const activeOthers = requirements.filter((item) => item.id !== id && item.priority !== 'ignored').length
  return activeOthers >= calibrationLimits.active ? '有效条件最多保留 5 个，先调整一个已有条件。' : null
}
