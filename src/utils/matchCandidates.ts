import type { Candidate, MatchResult } from '../ai/types'
import type { ExperienceRequirement } from '../data/understand'
import { matchExperienceSkill } from '../ai/skills/matchExperienceSkill.ts'

export type CandidateMatch = MatchResult

// Fixed weights and relative dates keep this demo reproducible offline.
export function matchCandidates(requirements: ExperienceRequirement[], candidates: Candidate[]): MatchResult[] {
  return matchExperienceSkill(requirements, candidates)
}
