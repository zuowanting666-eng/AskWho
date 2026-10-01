import type { Candidate, ExperienceAsset } from '../data/demoData'
import type { HumanResponse } from './requestState'

export type CurrentExperienceAsset = ExperienceAsset & { recentResponses: HumanResponse[]; newResponseCount: number }

// Compatibility for responses already submitted before assets were introduced.
// These exact questions belong to the existing, fixed Tokyo Dome demo flow.
const legacyTokyoQuestions = new Set(['你当时散场后，人流大概是什么程度？', '你当时从东京巨蛋回新宿，路线实际好找吗？', '你当时不会日语，在哪些环节遇到了困难？', '你第一次一个人散场时，最不适应的是什么？'])

export function buildExperienceAssets(existing: ExperienceAsset[], responses: HumanResponse[]): CurrentExperienceAsset[] {
  const unique = [...new Map(responses.filter(r => r.source === 'human').map(r => [r.id, r])).values()]
  return existing.map(asset => {
    // Association comes from the invitation's known context, not inferred likes,
    // answer wording or removable tags. Unknown future assets are left untouched.
    const recentResponses = unique.filter(r => (r.experienceAssetId ?? (legacyTokyoQuestions.has(r.question) ? 'tokyo-dome' : undefined)) === asset.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return { ...asset, answerCount: asset.answerCount + recentResponses.length, lastUsedAt: recentResponses.length ? '今天' : asset.lastUsedAt, recentResponses, newResponseCount: recentResponses.length }
  })
}

export function removeExperienceTag(assets: ExperienceAsset[], assetId: string, tag: string): ExperienceAsset[] {
  return assets.map(asset => asset.id === assetId && asset.experiences.includes(tag) ? { ...asset, experiences: asset.experiences.filter(value => value !== tag), removedExperiences: [...new Set([...asset.removedExperiences, tag])] } : asset)
}

// Only the demo respondent's eligibility is controlled here, not other people's
// invitations. The current routing task is the Tokyo Dome scenario.
export function getInvitableCandidates(candidates: Candidate[], assets: ExperienceAsset[], invitationsEnabled: boolean, ownerIds: string[], assetId = 'tokyo-dome'): Candidate[] {
  const asset = assets.find(item => item.id === assetId)
  return candidates.flatMap(candidate => {
    if (!ownerIds.includes(candidate.id)) return [candidate]
    if (!invitationsEnabled || !asset?.enabled || !asset.experiences.length) return []
    const removed = new Set(asset.removedExperiences.map(tag => tag === '东京巨蛋' ? '东京巨蛋演唱会' : tag))
    return [{ ...candidate, experiences: candidate.experiences.filter(tag => !removed.has(tag)) }]
  })
}
