import type { Concern, MatchResult, QuestionRoute } from '../ai/types'
import { routeQuestionSkill } from '../ai/skills/routeQuestionSkill.ts'
export type { QuestionRoute } from '../ai/types'

export function routeQuestions(concerns: Concern[], matches: MatchResult[]): QuestionRoute[] {
  return routeQuestionSkill(concerns, matches)
}
