import test from 'node:test'
import assert from 'node:assert/strict'
import { demoCandidates } from '../src/data/demoData.ts'
import { createInitialCalibration } from '../src/data/understand.ts'
import { matchCandidates } from '../src/utils/matchCandidates.ts'
import { routeQuestions } from '../src/utils/routeQuestions.ts'

test('default recall ranks the three exact core matches above the partial candidate', () => {
  const state = createInitialCalibration()
  const results = matchCandidates(state.experienceRequirements, demoCandidates)
  assert.deepEqual(results.map((item) => item.candidate.id), ['lin', 'cheng', 'mika', 'sen'])
  assert(results[3].score < 60)
  assert.equal(results[3].missingMust.length, 2)
  assert(results.every((item) => item.score >= 0 && item.score <= 100))
})

test('ignored criteria are absent from reasons and no longer penalize candidates', () => {
  const state = createInitialCalibration()
  const before = matchCandidates(state.experienceRequirements, demoCandidates)
  const requirements = state.experienceRequirements.map((item) => item.id === 'language' ? { ...item, priority: 'ignored' } : item)
  const after = matchCandidates(requirements, demoCandidates)
  assert(after.every((item) => item.matchedRequirements.every((reason) => reason.id !== 'language')))
  assert(after.find((item) => item.candidate.id === 'cheng').score > before.find((item) => item.candidate.id === 'cheng').score)
})

test('relaxing core criteria can change the ranking; unknown custom requirements lower scores', () => {
  const state = createInitialCalibration()
  const relaxed = state.experienceRequirements.map((item) => item.priority === 'must' ? { ...item, priority: 'ignored' } : item)
  assert.equal(matchCandidates(relaxed, demoCandidates)[0].candidate.id, 'sen')
  const baseline = state.experienceRequirements.filter((item) => item.id !== 'language')
  const withCustom = [...baseline, { id: 'last-train', label: '赶末班车', priority: 'preferred', source: 'user' }]
  for (const result of matchCandidates(withCustom, demoCandidates)) {
    assert(result.score < matchCandidates(baseline, demoCandidates).find((item) => item.candidate.id === result.candidate.id).score)
    assert(!result.matchedRequirements.some((item) => item.id === 'last-train'))
  }
})

test('scores and ranking are deterministic, including when candidate input order changes', () => {
  const state = createInitialCalibration()
  assert.deepEqual(matchCandidates(state.experienceRequirements, [...demoCandidates].reverse()), matchCandidates(state.experienceRequirements, demoCandidates))
})

test('routing finds a unique specialist assignment and respects 1/2/3 selected questions', () => {
  const state = createInitialCalibration()
  const matches = matchCandidates(state.experienceRequirements, demoCandidates).slice(0, 3)
  const routes = routeQuestions(state.concerns, matches)
  assert.equal(routes.find((item) => item.concern.id === 'route').candidateId, 'cheng')
  assert.equal(routes.find((item) => item.concern.id === 'language').candidateId, 'lin')
  for (const count of [1, 2, 3]) {
    const concerns = state.concerns.map((item, index) => ({ ...item, selected: index < count }))
    const result = routeQuestions(concerns, matches)
    assert.equal(result.length, count)
    assert.equal(new Set(result.map((item) => item.candidateId)).size, count)
    assert(result.every((item) => item.concern.selected))
  }
})

test('custom concerns preserve their question and route by expertise, with ranked fallback', () => {
  const state = createInitialCalibration()
  const matches = matchCandidates(state.experienceRequirements, demoCandidates).slice(0, 3)
  const concern = { id: 'user-concern', label: '散场后女生一个人安全吗？', source: 'user', selected: true }
  const custom = routeQuestions([concern], matches)[0]
  assert.equal(custom.candidateId, 'mika')
  assert(custom.microQuestion.includes(concern.label))
  const unknown = { ...concern, label: '有没有什么特别的建议？' }
  assert.equal(routeQuestions([unknown], matches)[0].candidateId, matches[0].candidate.id)
  const mixed = routeQuestions([state.concerns[2], unknown], matches)
  assert.equal(new Set(mixed.map((item) => item.candidateId)).size, 2)
})
