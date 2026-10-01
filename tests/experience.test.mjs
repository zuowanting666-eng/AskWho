import test from 'node:test'
import assert from 'node:assert/strict'
import { demoExperienceAssets, demoCandidates } from '../src/data/demoData.ts'
import { buildExperienceAssets, removeExperienceTag, getInvitableCandidates } from '../src/utils/buildExperienceAssets.ts'
import { initialRequestStore, requestReducer } from '../src/utils/requestState.ts'

const response = { id: 'r1', candidateId: 'mika', routeId: 'route1', concernId: 'crowd', question: '你当时散场后，人流大概是什么程度？', selectedOption: '人很多，但还能正常走', note: '我当时跟着人流走，大概25分钟坐上车。', createdAt: '2026-10-01T00:00:00Z', source: 'human', experienceAssetId: 'tokyo-dome' }

test('default assets work without responses, preserving all three invitation defaults', () => {
  const assets = buildExperienceAssets(demoExperienceAssets, [])
  assert.equal(assets.length, 3)
  assert.deepEqual(assets.map(a => a.enabled), [true, true, false])
  assert.equal(assets.reduce((s, a) => s + a.answerCount, 0), 14)
  assert(assets.every(a => a.newResponseCount === 0))
})

test('human response merges once without duplicate asset or fabricated impact counts', () => {
  const assets = buildExperienceAssets(demoExperienceAssets, [response, response])
  assert.equal(assets.length, 3)
  assert.equal(assets[0].answerCount, 5)
  assert.equal(assets[0].newResponseCount, 1)
  assert.equal(assets[0].helpedCount, 18)
  assert.equal(assets[0].reuseCount, 3)
  assert.strictEqual(assets[0].recentResponses[0], response)
  assert.equal(demoExperienceAssets[0].answerCount, 4)
  assert.deepEqual(buildExperienceAssets(demoExperienceAssets, [response]), assets)
})

test('legacy Round 4/5 answer is retained; mock and unrelated responses do not become owned assets', () => {
  const { experienceAssetId, ...legacy } = response
  assert.equal(buildExperienceAssets(demoExperienceAssets, [legacy])[0].answerCount, 5)
  const unrelated = { ...legacy, id: 'other', question: '如何准备面试？' }
  assert.equal(buildExperienceAssets(demoExperienceAssets, [unrelated, { ...response, source: 'mock' }])[0].newResponseCount, 0)
})

test('removing a tag survives merging, preserves evidence, and never restores itself', () => {
  const revised = removeExperienceTag(demoExperienceAssets, 'tokyo-dome', '不会日语')
  const current = buildExperienceAssets(revised, [response])
  assert(!current[0].experiences.includes('不会日语'))
  assert.deepEqual(current[0].evidence, demoExperienceAssets[0].evidence)
  assert.equal(current[0].answerCount, 5)
  assert.deepEqual(removeExperienceTag(revised, 'tokyo-dome', '不会日语'), revised)
})

test('asset and global opt-out filter only owned respondents; settings remain intact on resume', () => {
  const paused = demoExperienceAssets.map(a => a.id === 'tokyo-dome' ? { ...a, enabled: false } : a)
  for (const candidates of [getInvitableCandidates(demoCandidates, paused, true, ['mika']), getInvitableCandidates(demoCandidates, demoExperienceAssets, false, ['mika'])]) {
    assert(!candidates.some(c => c.id === 'mika'))
    assert(candidates.some(c => c.id === 'lin'))
  }
  assert(getInvitableCandidates(demoCandidates, demoExperienceAssets, true, ['mika']).some(c => c.id === 'mika'))
  assert.equal(demoExperienceAssets[2].enabled, false)
  assert.equal(buildExperienceAssets(paused, [response])[0].answerCount, 5)
  assert.equal(buildExperienceAssets(paused, [response])[0].enabled, false)
})

test('removed attributes are no longer used for owned candidate matching', () => {
  const revised = removeExperienceTag(demoExperienceAssets, 'tokyo-dome', '不会日语')
  const candidates = getInvitableCandidates(demoCandidates, revised, true, ['lin'])
  assert(!candidates.find(c => c.id === 'lin').experiences.includes('不会日语'))
  assert(demoCandidates.find(c => c.id === 'lin').experiences.includes('不会日语'))
})

test('request submission writes asset association and repeated dispatch cannot inflate the asset', () => {
  const route = { id: 'old', concern: { id: 'crowd', source: 'ai', selected: true, label: '人流' }, candidateId: 'mika', candidateName: 'Mika', microQuestion: response.question }
  const prepared = requestReducer(initialRequestStore, { type: 'prepare', id: 'batch', routes: [route] })
  const action = { type: 'submit', selectedOption: response.selectedOption, note: response.note, timestamp: response.createdAt, experienceAssetId: 'tokyo-dome' }
  const submitted = requestReducer(requestReducer(prepared, action), action)
  assert.equal(submitted.responses.length, 1)
  assert.equal(submitted.responses[0].experienceAssetId, 'tokyo-dome')
  assert.equal(buildExperienceAssets(demoExperienceAssets, submitted.responses)[0].answerCount, 5)
})
