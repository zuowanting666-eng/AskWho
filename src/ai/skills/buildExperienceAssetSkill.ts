import type { ExperienceAsset, HumanResponse, QuestionRoute } from '../types'
import { buildExperienceAssets } from '../../utils/buildExperienceAssets.ts'

export type BuildExperienceAssetResult = {
  assets: ReturnType<typeof buildExperienceAssets>
  mergedIntoAssetId?: string
  createdNewAsset: boolean
  updatedAsset?: ReturnType<typeof buildExperienceAssets>[number]
}

export function buildExperienceAssetSkill(input: { assets: ExperienceAsset[]; responses: HumanResponse[]; routes?: QuestionRoute[] }): BuildExperienceAssetResult {
  const assets = buildExperienceAssets(input.assets, input.responses)
  const newest = [...input.responses].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const mergedIntoAssetId = newest?.experienceAssetId ?? (newest && /东京巨蛋|散场/.test(newest.question) ? 'tokyo-dome' : undefined)
  const updatedAsset = assets.find(asset => asset.id === mergedIntoAssetId)
  if (updatedAsset || !newest) return { assets, mergedIntoAssetId, createdNewAsset: false, updatedAsset }

  const route = input.routes?.find(item => item.id === newest.routeId)
  const created: ExperienceAsset = {
    id: `response-${newest.id}`,
    title: route?.originalConcern ?? '新确认的真实经历',
    category: '其他经历',
    experiences: [route?.originalConcern ?? '主动确认的经历'],
    evidence: [{ type: 'confirmed', label: '你主动回答过 1 次' }],
    answerCount: 1, helpedCount: 0, reuseCount: 0, enabled: true, source: 'response', lastUsedAt: '今天',
    explanation: '因为你主动提交了这段真实回答。', removedExperiences: [],
  }
  return { assets: [...assets, { ...created, recentResponses: [newest], newResponseCount: 1 }], mergedIntoAssetId: created.id, createdNewAsset: true, updatedAsset: { ...created, recentResponses: [newest], newResponseCount: 1 } }
}
