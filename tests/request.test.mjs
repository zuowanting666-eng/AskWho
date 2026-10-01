import test from 'node:test'
import assert from 'node:assert/strict'
import { answersFor, demoCandidates, mockResponses, quickAnswerSets } from '../src/data/demoData.ts'
import { createInitialCalibration } from '../src/data/understand.ts'
import { matchCandidates } from '../src/utils/matchCandidates.ts'
import { routeQuestions } from '../src/utils/routeQuestions.ts'
import { initialRequestStore, requestReducer } from '../src/utils/requestState.ts'

const calibration = createInitialCalibration()
const routes = routeQuestions(calibration.concerns, matchCandidates(calibration.experienceRequirements, demoCandidates).slice(0, 3))
const prepare = () => requestReducer(initialRequestStore, { type: 'prepare', id: 'batch-1', routes })

test('invitation preserves the actual first routing and owns stable, unique route IDs', () => {
  const state = prepare()
  assert.equal(state.invitation.routes[0].candidateId, 'mika')
  assert.equal(state.invitation.routes[0].microQuestion, routes[0].microQuestion)
  assert.equal(new Set(state.invitation.routes.map(r => r.id)).size, 3)
  assert.strictEqual(requestReducer(state, { type: 'prepare', id: 'double-tap', routes }), state)
})

test('all core questions have distinct options and any user concern uses the generic set', () => {
  for (const id of ['crowd', 'route', 'language', 'solo']) {
    const route = { ...routes[0], concern: { id, source: 'ai' } }
    assert.deepEqual(answersFor(route), quickAnswerSets[id])
    assert.equal(answersFor(route).options.length, 4)
    assert.deepEqual(answersFor({ ...route, concern: { id, source: 'user' } }), quickAnswerSets.custom)
  }
})

test('submission stores actual human input, limits note and rejects duplicates or blank answers', () => {
  const before = prepare()
  assert.strictEqual(requestReducer(before, { type: 'submit', selectedOption: '', note: '', timestamp: 'now' }), before)
  const action = { type: 'submit', selectedOption: '人很多，但还能正常走', note: '字'.repeat(100), timestamp: '2026-10-01T00:00:00Z' }
  const after = requestReducer(before, action)
  assert.equal(after.invitation.status, 'success')
  assert.deepEqual(after.responses[0], { id: 'response-batch-1-0', candidateId: 'mika', routeId: 'batch-1-0', concernId: 'crowd', question: routes[0].microQuestion, selectedOption: action.selectedOption, note: '字'.repeat(80), createdAt: action.timestamp, source: 'human' })
  assert.strictEqual(requestReducer(after, action), after)
  assert.equal(before.responses.length, 0)
})

test('feedback records candidate and reason, ends invitation and cannot also submit', () => {
  const action = { type: 'feedback', reason: '我没有这段经历', timestamp: 'now' }
  const after = requestReducer(prepare(), action)
  assert.equal(after.invitation.status, 'mismatch')
  assert.deepEqual(after.experienceFeedback, [{ candidateId: 'mika', type: action.reason, timestamp: 'now' }])
  assert.strictEqual(requestReducer(after, action), after)
  assert.strictEqual(requestReducer(after, { type: 'submit', selectedOption: '不会保存', note: '', timestamp: 'now' }), after)
  assert.equal(after.responses.length, 0)
})

test('skip is terminal; recalibration invalidates invitations but keeps collected records', () => {
  const skipped = requestReducer(prepare(), { type: 'skip' })
  assert.equal(skipped.invitation.status, 'skipped')
  assert.equal(skipped.responses.length, 0)
  const submitted = requestReducer(prepare(), { type: 'submit', selectedOption: '人很多，但还能正常走', note: '', timestamp: 'now' })
  const invalidated = requestReducer(submitted, { type: 'invalidate' })
  assert.equal(invalidated.invitation, null)
  assert.equal(invalidated.responses.length, 1)
  const next = requestReducer(invalidated, { type: 'prepare', id: 'batch-2', routes: routes.slice(1) })
  assert.equal(next.invitation.routes.length, 2)
  assert.notEqual(next.invitation.routes[0].id, submitted.responses[0].routeId)
})

test('prepared mock responses cover remaining default candidates and never seed human data', () => {
  assert(routes.slice(1).every(route => mockResponses.some(r => r.candidateId === route.candidateId && r.concernId === route.concern.id)))
  assert(mockResponses.every(r => r.source === 'mock'))
  assert.equal(prepare().responses.length, 0)
})
