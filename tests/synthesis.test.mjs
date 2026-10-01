import test from 'node:test'
import assert from 'node:assert/strict'
import { demoCandidates, mockResponses } from '../src/data/demoData.ts'
import { createInitialCalibration } from '../src/data/understand.ts'
import { matchCandidates } from '../src/utils/matchCandidates.ts'
import { routeQuestions } from '../src/utils/routeQuestions.ts'
import { collectAnswerResponses } from '../src/utils/synthesizeResponses.ts'
import { synthesizeAnswerSkill } from '../src/ai/skills/synthesizeAnswerSkill.ts'

const calibration = createInitialCalibration()
const routes = routeQuestions(calibration.concerns, matchCandidates(calibration.experienceRequirements, demoCandidates).slice(0, 3)).map((r, i) => ({ ...r, id: `batch-${i}` }))
const human = { id: 'human', candidateId: routes[0].candidateId, routeId: routes[0].id, concernId: routes[0].concern.id, question: routes[0].microQuestion, selectedOption: '人很多，但还能正常走', note: '我当时跟着人流走，大概25分钟坐上车。', createdAt: '2026-10-01T00:00:00Z', source: 'human' }
const collect = (r = human) => collectAnswerResponses([r], routes, mockResponses)
const synth = (r = collect(), selected = calibration.concerns, rs = routes) => synthesizeAnswerSkill({ responses: r, concerns: selected, routes: rs, candidates: demoCandidates })

test('current human response wins verbatim; mocks follow exact route pairs and current batch', () => {
  const data = collect()
  assert.equal(data.length, 3)
  assert.strictEqual(data[0], human)
  assert.equal(data[0].note, human.note)
  assert(data.slice(1).every(r => r.source === 'mock'))
  assert.equal(collectAnswerResponses([{ ...human, routeId: 'old-batch' }], routes, mockResponses).length, 2)
  assert.equal(collectAnswerResponses([human], routes.slice(0, 1), mockResponses).length, 1)
  const customRoutes = routes.map((r, i) => i === 1 ? { ...r, concern: { ...r.concern, source: 'user' } } : r)
  assert.equal(collectAnswerResponses([human], customRoutes, mockResponses).length, 2)
})

test('default evidence counts are 3/3 crowd and 2/3 route; language is not inflated to a consensus', () => {
  const result = synth()
  assert.equal(result.rawResponses.length, 3)
  assert.equal(result.consensus.find(c => c.id === 'crowd').supportCount, 3)
  assert.equal(result.consensus.find(c => c.id === 'routeEasy').supportCount, 2)
  assert(!result.consensus.some(c => c.id === 'languageEasy'))
  for (const row of result.consensus) {
    assert.equal(row.supportCount, row.relatedResponseIds.length)
    assert.equal(row.totalCount, 3)
    assert(row.relatedResponseIds.every(id => result.rawResponses.some(r => r.id === id)))
  }
  assert.match(result.conclusion, /没有想象中难/)
  assert(result.differences.length > 0)
})

test('single language evidence stays out of aggregate conclusion and summary', () => {
  const result = synth()
  assert.equal(result.consensus.some(item => item.id === 'languageEasy'), false)
  assert.doesNotMatch(result.conclusion, /不会日语.*(?:不太影响|影响有限|基本不影响)/)
  assert.doesNotMatch(result.summary, /不会日语.*(?:不太影响|影响有限|基本不影响)/)
})

test('single response never becomes group consensus; two responses keep their actual denominator', () => {
  const one = synth([human])
  assert.equal(one.consensus.length, 0)
  assert.equal(one.differences.length, 0)
  assert.match(one.summary, /只是一份参考/)
  const two = synth(collect().slice(0, 2))
  assert(two.consensus.every(c => c.totalCount === 2))
  assert(!two.summary.includes('多数人'))
})

test('absent language data produces no language conclusion; unselected responses are excluded', () => {
  const result = synth(collect(), calibration.concerns.map(c => c.id === 'language' ? { ...c, selected: false } : c))
  assert.equal(result.rawResponses.length, 2)
  assert(!/日语/.test(result.summary + result.conclusion + JSON.stringify(result.consensus)))
})

test('conflicting notes raise differences and suppress a reassuring conclusion and disputed consensus', () => {
  const result = synth(collect({ ...human, note: '路线很难找。不会日语影响很大。' }))
  assert.equal(result.hasConflict, true)
  assert.equal(result.conclusion, '这件事的体验差异比较大。')
  assert(!result.consensus.some(c => c.id === 'routeEasy' || c.id === 'languageEasy'))
  assert(result.differences.every(d => d.relatedResponseIds.length >= 2))
})

test('negated, quoted, conditional and unknown notes do not produce positive facts', () => {
  const unsupported = { ...human, selectedOption: '我的情况不太一样', note: '如果路线不难就好了。朋友说“不会日语基本不影响”。并不是人很多。' }
  const result = synth([unsupported, { ...collect()[1], selectedOption: '我的情况不太一样', note: '' }])
  assert.equal(result.consensus.length, 0)
  assert(!result.summary.includes('不会日语的影响有限'))
  assert.equal(result.rawResponses[0].note, unsupported.note)
})

test('time evidence needs two reported comparable durations and uses exact observed bounds', () => {
  const result = synth()
  assert.match(result.timeEvidence.statement, /25–30 分钟/)
  assert.equal(result.timeEvidence.relatedResponseIds.length, 2)
  for (const note of ['', '预计25分钟坐上车。', '我当时从散场到坐上车不是25分钟。', '我当时从散场到坐上车用了20–35分钟。', '地铁坐了25分钟。', '我当时跟着人流走，大概25分钟到车站，坐上车还要等。']) {
    assert.equal(synth(collect({ ...human, note })).timeEvidence, undefined, note)
  }
})

test('duplicate, unknown candidate and stale route records do not increase support', () => {
  const result = synth([...collect(), human, { ...human, id: 'fake', candidateId: 'unknown' }, { ...human, id: 'old', routeId: 'old' }])
  assert.equal(result.rawResponses.length, 3)
  assert.equal(result.consensus[0].supportCount, 3)
})
