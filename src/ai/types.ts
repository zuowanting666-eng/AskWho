export type ExperiencePriority = 'must' | 'preferred' | 'ignored'

export type ExperienceRequirement = {
  id: string
  label: string
  priority: ExperiencePriority
  source: 'ai' | 'user'
}

export type Concern = {
  id: string
  label: string
  selected: boolean
  source: 'ai' | 'user'
}

export type ParsedIntent = {
  question: string
  problemType: 'experience' | 'travel' | 'career' | 'fashion'
  experienceRequirements: ExperienceRequirement[]
  concerns: Concern[]
  confidence: number
  needsClarification: boolean
  clarificationQuestion?: string
}

export type ExperienceEvidence = {
  type: 'note' | 'comment' | 'answer' | 'confirmed'
  label: string
  title?: string
  count?: number
}

export type Candidate = {
  id: string
  name: string
  avatarInitial: string
  experiences: string[]
  evidence: ExperienceEvidence[]
  expertise: string[]
  summary: string
  lastExperienceDate?: string
  experienceDaysAgo?: number
  answerFocus?: string
}

export type MatchResult = {
  candidate: Candidate
  score: number
  matchedMust: string[]
  matchedPreferred: string[]
  missingMust: string[]
  evidenceStrength: number
  reason: string
  // UI compatibility: the page needs the calibrated requirement objects.
  matchedRequirements: ExperienceRequirement[]
  missingMustRequirements: ExperienceRequirement[]
}

export type QuestionRoute = {
  id: string
  concernId: string
  candidateId: string
  originalConcern: string
  routedQuestion: string
  reason: string
  // UI compatibility while the product keeps the existing presentation.
  concern: Concern
  candidateName: string
  microQuestion: string
}

export type HumanResponse = {
  id: string
  candidateId: string
  routeId: string
  concernId: string
  question: string
  selectedOption: string
  note: string
  createdAt: string
  source: 'human'
  experienceAssetId?: string
}

export type ExperienceResponse = Omit<HumanResponse, 'source'> & { source: 'human' | 'mock' }

export type ConsensusItem = {
  id: string
  statement: string
  supportCount: number
  totalCount: number
  relatedResponseIds: string[]
}

export type DifferenceItem = {
  id: string
  statement: string
  relatedResponseIds: string[]
}

export type SynthesizedAnswer = {
  conclusion: string
  consensus: ConsensusItem[]
  differences: DifferenceItem[]
  rawResponses: ExperienceResponse[]
  sampleSize: number
  limitedEvidence: boolean
}

export type ExperienceAsset = {
  id: string
  title: string
  category: string
  experiences: string[]
  evidence: ExperienceEvidence[]
  answerCount: number
  helpedCount: number
  reuseCount: number
  enabled: boolean
  source: 'existing' | 'response'
  lastUsedAt: string
  explanation: string
  removedExperiences: string[]
}

export type AgentStage = 'understand' | 'match' | 'route' | 'synthesize' | 'asset'

export type AgentDecision = {
  stage: AgentStage
  action: string
  reason: string
  metadata?: Record<string, unknown>
}

export type AgentContext = {
  question?: string
  parsedIntent?: ParsedIntent
  experienceRequirements?: ExperienceRequirement[]
  concerns?: Concern[]
  matches?: MatchResult[]
  routes?: QuestionRoute[]
  responses?: HumanResponse[]
  experienceAssets?: ExperienceAsset[]
}
