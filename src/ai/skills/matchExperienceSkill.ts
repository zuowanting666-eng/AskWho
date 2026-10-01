import type { Candidate, ExperienceRequirement, MatchResult } from '../types'

export function matchExperienceSkill(requirements: ExperienceRequirement[], candidates: Candidate[], options: { relaxPreferred?: boolean } = {}): MatchResult[] {
  const active = requirements.filter(item => item.priority !== 'ignored' && (!options.relaxPreferred || item.priority === 'must'))
  const must = active.filter(item => item.priority === 'must')
  const weight = (item: ExperienceRequirement) => item.priority === 'must' ? 5 : 2
  const totalWeight = active.reduce((sum, item) => sum + weight(item), 0)

  return candidates.map(candidate => {
    const matchedRequirements = active.filter(item => candidate.experiences.includes(item.label))
    const missingMustRequirements = must.filter(item => !candidate.experiences.includes(item.label))
    const matchedWeight = matchedRequirements.reduce((sum, item) => sum + weight(item), 0)
    const coverage = totalWeight ? matchedWeight / totalWeight : 0
    const recencyBonus = (candidate.experienceDaysAgo ?? 365) <= 30 ? 6 : (candidate.experienceDaysAgo ?? 365) <= 90 ? 3 : 2
    const evidenceStrength = Math.min(6, candidate.evidence.reduce((sum, item) => sum + (item.type === 'comment' ? 1 : 2), 0))
    const rawScore = coverage * 88 + recencyBonus + evidenceStrength
    const penalty = missingMustRequirements.length ? Math.max(.2, 1 - missingMustRequirements.length * .35) : 1
    const score = Math.round(Math.max(0, Math.min(missingMustRequirements.length ? 59 : 100, rawScore * penalty)))
    const matchedMust = matchedRequirements.filter(item => item.priority === 'must').map(item => item.label)
    const matchedPreferred = matchedRequirements.filter(item => item.priority === 'preferred').map(item => item.label)
    const missingMust = missingMustRequirements.map(item => item.label)
    const reason = missingMust.length
      ? `匹配 ${matchedMust.length} 个核心经历和 ${matchedPreferred.length} 个优先经历，但缺少${missingMust.join('、')}。`
      : `匹配 ${matchedMust.length} 个核心经历和 ${matchedPreferred.length} 个优先经历${candidate.evidence.length ? '，并有可核验的公开经验记录' : ''}。`
    return { candidate, score, matchedMust, matchedPreferred, missingMust, evidenceStrength, reason, matchedRequirements, missingMustRequirements }
  }).sort((a, b) => Number(a.missingMust.length > 0) - Number(b.missingMust.length > 0) || b.score - a.score || a.candidate.id.localeCompare(b.candidate.id))
}
