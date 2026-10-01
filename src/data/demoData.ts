import type { Candidate, ExperienceAsset, QuestionRoute } from '../ai/types'
export type { Candidate, ExperienceAsset } from '../ai/types'

// Fictional demo records. No real users, remote profiles or fetched evidence.
export const demoCandidates: Candidate[] = [
  {
    id: 'lin', name: '林小曼', avatarInitial: '林',
    experiences: ['东京巨蛋演唱会', '夜间散场', '一个人行动', '不会日语', '回新宿'],
    evidence: [
      { type: 'note', label: '公开笔记 1 篇', title: '《第一次一个人去东京巨蛋看 Live》', count: 1 },
      { type: 'answer', label: '历史经验回答 2 条', title: '演唱会散场相关经验', count: 2 },
    ],
    lastExperienceDate: '2 个月前', experienceDaysAgo: 60,
    expertise: ['散场拥挤', '不会日语', '一个人行动'],
    answerFocus: '更适合回答语言障碍和首次独自散场',
    summary: '第一次自己去的时候也很紧张，但散场后跟着人流走，整体没有想象中困难。',
  },
  {
    id: 'cheng', name: '阿程', avatarInitial: '程',
    experiences: ['东京巨蛋演唱会', '夜间散场', '回新宿', '东京公共交通'],
    evidence: [
      { type: 'note', label: '公开笔记 1 篇', title: '《东京巨蛋散场路线实测》', count: 1 },
      { type: 'comment', label: '高信息量评论 3 条', title: '散场路线高信息量评论', count: 3 },
    ],
    lastExperienceDate: '3 周前', experienceDaysAgo: 21,
    expertise: ['回新宿路线', '车站选择', '散场耗时'],
    answerFocus: '更适合回答路线和散场耗时',
    summary: '路线本身不复杂，真正需要预留的是散场后进站的人流时间。',
  },
  {
    id: 'mika', name: 'Mika', avatarInitial: 'M',
    experiences: ['东京巨蛋演唱会', '夜间散场', '一个人行动', '海外演唱会'],
    evidence: [
      { type: 'note', label: '公开笔记 1 篇', title: '独自看东京巨蛋演唱会的现场记录', count: 1 },
      { type: 'answer', label: '历史经验回答 1 条', title: '独自散场的经验回答', count: 1 },
    ],
    lastExperienceDate: '4 个月前', experienceDaysAgo: 120,
    expertise: ['一个人行动', '安全感', '散场现场体验'],
    answerFocus: '更适合回答独自行动体验',
    summary: '一个人去并不会很危险，现场最明显的压力其实来自人多和第一次不熟悉。',
  },
  {
    id: 'sen', name: '森森', avatarInitial: '森',
    experiences: ['东京大型演唱会', '一个人行动', '不会日语', '回新宿'],
    evidence: [{ type: 'note', label: '公开笔记 2 篇', title: '独自赴东京看演出与返程记录', count: 2 }],
    lastExperienceDate: '1 个月前', experienceDaysAgo: 30,
    expertise: ['不会日语', '独自旅行'],
    answerFocus: '更适合回答语言障碍和独自旅行',
    summary: '我会提前保存返程站名和路线截图，不会日语时也能拿出来核对。',
  },
]

export const evidenceLabels = { note: '公开笔记', comment: '高信息量评论', answer: '历史经验回答', confirmed: '主动确认回答' } as const

export const quickAnswerSets = {
  crowd: { category: '人流体验', options: ['人很多，但还能正常走', '非常拥挤，需要跟着人流慢慢走', '比我预想得轻松', '我的情况不太一样'] },
  route: { category: '返程路线', options: ['很好找，跟着指引就可以', '路线不难，但进站比较慢', '第一次去有点绕', '我的情况不太一样'] },
  language: { category: '语言体验', options: ['基本不影响', '有一点影响，但手机导航够用', '比较困难，需要提前做攻略', '我的情况不太一样'] },
  solo: { category: '独自行动', options: ['人太多，有点慌', '找路线最麻烦', '一个人其实没有明显问题', '我的情况不太一样'] },
  custom: { category: '亲历补充', options: ['基本符合我的经历', '有一点，但影响不大', '这个问题对我影响比较明显', '我的情况不太一样'] },
}

export function answersFor(route: QuestionRoute) {
  const key = route.concern.source === 'user' ? 'custom' : route.concern.id
  return quickAnswerSets[key as keyof typeof quickAnswerSets] ?? quickAnswerSets.custom
}

export const feedbackOptions = ['我没有这段经历', '经历时间太久，不适合参考', '情况和我的经历差别太大', '其他'] as const

export const demoExperienceAssets: ExperienceAsset[] = [
  { id: 'tokyo-dome', title: '东京巨蛋演唱会', category: '日本旅行', experiences: ['东京巨蛋', '夜间散场', '一个人行动', '回新宿', '不会日语'], evidence: [{ type: 'note', label: '公开笔记 1 篇' }, { type: 'answer', label: '历史经验回答 3 次' }, { type: 'confirmed', label: '你主动确认过 1 次' }], answerCount: 4, helpedCount: 18, reuseCount: 3, lastUsedAt: '今天', enabled: true, source: 'existing', explanation: '因为你公开分享过东京巨蛋观演经历，并回答过 3 个与夜间散场相关的问题。', removedExperiences: [] },
  { id: 'career', title: '游戏运营转 AI 产品', category: '职业经历', experiences: ['游戏运营', 'AI 产品', '转岗准备', '产品面试'], evidence: [{ type: 'note', label: '公开转岗笔记 1 篇' }, { type: 'answer', label: '历史经验回答 6 次' }, { type: 'confirmed', label: '你主动确认过这段经历' }], answerCount: 6, helpedCount: 11, reuseCount: 4, lastUsedAt: '3 天前', enabled: true, source: 'existing', explanation: '因为你公开分享过从游戏运营转岗的过程，并回答过转岗准备与产品面试的问题。', removedExperiences: [] },
  { id: 'style', title: '小个子冬季穿搭', category: '穿搭', experiences: ['小个子', '肩宽', '长款大衣', '冬季穿搭'], evidence: [{ type: 'comment', label: '公开穿着体验评论 2 条' }, { type: 'answer', label: '历史经验回答 4 次' }, { type: 'confirmed', label: '你主动确认过这段经历' }], answerCount: 4, helpedCount: 7, reuseCount: 2, lastUsedAt: '1 周前', enabled: false, source: 'existing', explanation: '因为你公开描述过长款大衣的实际穿着感受，并主动确认过小个子、肩宽等经历条件。', removedExperiences: [] },
]

// Historical demo summary: six experience fragments grouped into three assets.
// Helped/reuse counts never grow merely because a new answer is submitted.
export const demoExperienceSummary = { experienceCount: 6, answerCount: 14, helpedCount: 36, reuseCount: 9 }
export const demoExperienceOwnerId = 'mika'

// Fictional response fixtures, selected only by exact candidate + concern.
// Never inserted into the user's human submission store.
export const mockResponses = [
  { candidateId: 'cheng', concernId: 'route', question: '你当时从东京巨蛋回新宿，路线实际好找吗？', selectedOption: '路线本身不难，但散场后进站会比较慢。', note: '我当时从离场到真正坐上车大概用了 30 分钟。进站时人很多。', source: 'mock' },
  { candidateId: 'lin', concernId: 'language', question: '你当时不会日语，在哪些环节遇到了困难？', selectedOption: '有一点影响，但手机导航够用', note: '我提前存了站名和路线截图。人很多，但回新宿的路线不难。', source: 'mock' },
  { candidateId: 'mika', concernId: 'solo', question: '你第一次一个人散场时，最不适应的是什么？', selectedOption: '人太多，有点慌', note: '第一次有点慌，跟着现场指引走就好。真正让我紧张的是人多，不是一个人本身。', source: 'mock' },
  { candidateId: 'lin', concernId: 'crowd', question: '你当时散场后，人流大概是什么程度？', selectedOption: '人很多，但还能正常走', note: '进站时需要慢慢走。', source: 'mock' },
  { candidateId: 'mika', concernId: 'crowd', question: '你当时散场后，人流大概是什么程度？', selectedOption: '非常拥挤，需要跟着人流慢慢走', note: '第一次去，有点紧张。', source: 'mock' },
  { candidateId: 'cheng', concernId: 'crowd', question: '你当时散场后，人流大概是什么程度？', selectedOption: '非常拥挤，需要跟着人流慢慢走', note: '我当时从散场到坐上车用了 30 分钟。', source: 'mock' },
  { candidateId: 'sen', concernId: 'language', question: '你当时不会日语，在哪些环节遇到了困难？', selectedOption: '有一点影响，但手机导航够用', note: '我会提前保存返程站名和路线截图。', source: 'mock' },
] as const
