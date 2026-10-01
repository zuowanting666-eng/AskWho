import type { HumanResponse, QuestionRoute } from '../ai/types'
export type { HumanResponse } from '../ai/types'
import type { feedbackOptions } from '../data/demoData'

export type RequestStatus = 'answering' | 'success' | 'mismatch' | 'skipped'
export type InvitationRoute = QuestionRoute & { id: string }
export type Invitation = { id: string; routes: InvitationRoute[]; status: RequestStatus }
export type ExperienceFeedback = { candidateId: string; type: typeof feedbackOptions[number]; timestamp: string }
export type RequestStore = { invitation: Invitation | null; responses: HumanResponse[]; experienceFeedback: ExperienceFeedback[] }
export const initialRequestStore: RequestStore = { invitation: null, responses: [], experienceFeedback: [] }
export type RequestAction =
  | { type: 'prepare'; id: string; routes: QuestionRoute[] }
  | { type: 'invalidate' }
  | { type: 'submit'; selectedOption: string; note: string; timestamp: string; experienceAssetId?: string }
  | { type: 'feedback'; reason: ExperienceFeedback['type']; timestamp: string }
  | { type: 'skip' }

// A single parent transaction changes status and records data, including rapid taps.
export function requestReducer(state: RequestStore, action: RequestAction): RequestStore {
  if (action.type === 'invalidate') return { ...state, invitation: null }
  if (action.type === 'prepare') {
    if (state.invitation || !action.routes.length) return state
    return { ...state, invitation: { id: action.id, status: 'answering', routes: action.routes.map((route, index) => ({ ...route, id: `${action.id}-${index}` })) } }
  }
  const invitation = state.invitation
  if (!invitation || invitation.status !== 'answering') return state
  const route = invitation.routes[0]
  if (action.type === 'submit') {
    if (!action.selectedOption.trim()) return state
    const response: HumanResponse = { id: `response-${route.id}`, candidateId: route.candidateId, routeId: route.id, concernId: route.concern.id, question: route.microQuestion, selectedOption: action.selectedOption, note: action.note.trim().slice(0, 80), createdAt: action.timestamp, source: 'human' }
    if (action.experienceAssetId) response.experienceAssetId = action.experienceAssetId
    return { ...state, invitation: { ...invitation, status: 'success' }, responses: [...state.responses, response] }
  }
  if (action.type === 'feedback') return { ...state, invitation: { ...invitation, status: 'mismatch' }, experienceFeedback: [...state.experienceFeedback, { candidateId: route.candidateId, type: action.reason, timestamp: action.timestamp }] }
  return { ...state, invitation: { ...invitation, status: 'skipped' } }
}
