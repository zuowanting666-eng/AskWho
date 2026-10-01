import { useCallback, useLayoutEffect, useMemo, useReducer, useState } from 'react'
import { AppShell } from './components/AppShell'
import { AskPage } from './pages/AskPage'
import { UnderstandPage } from './pages/UnderstandPage'
import { MatchPage } from './pages/MatchPage'
import { RequestPage } from './pages/RequestPage'
import { demoCandidates, demoExperienceAssets, demoExperienceOwnerId, mockResponses } from './data/demoData'
import type { Calibration } from './data/understand'
import type { ParsedIntent, QuestionRoute } from './ai/types'
import { routingAgent } from './ai/routingAgent'
import { initialRequestStore, requestReducer } from './utils/requestState'
import { AnswerPage } from './pages/AnswerPage'
import { collectAnswerResponses } from './utils/synthesizeResponses'
import { ExperiencePage } from './pages/ExperiencePage'
import { getInvitableCandidates, removeExperienceTag } from './utils/buildExperienceAssets'

type Page = 'ask' | 'understand' | 'match' | 'request' | 'answer' | 'experience'

const defaultQuestion = '我第一次一个人去东京看演唱会，也不会日语。东京巨蛋晚上散场以后回新宿会不会特别困难？'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('ask')
  const [analysis, setAnalysis] = useState(() => routingAgent.analyzeQuestion(defaultQuestion))
  const parsedIntent: ParsedIntent = analysis.result
  const [calibration, setCalibration] = useState<Calibration>(() => ({ experienceRequirements: parsedIntent.experienceRequirements, concerns: parsedIntent.concerns }))
  const [{ invitation, responses }, dispatchRequest] = useReducer(requestReducer, initialRequestStore)
  const [helpful, setHelpful] = useState(false)
  const [experienceAssets, setExperienceAssets] = useState(() => structuredClone(demoExperienceAssets))
  const [experienceViewMode, setExperienceViewMode] = useState<'self' | 'respondent'>('self')
  const [invitationsEnabled, setInvitationsEnabled] = useState(true)
  const [, setFollowUps] = useState<{ invitationId: string; text: string }[]>([])
  const [question, setQuestion] = useState(defaultQuestion)
  const continueToMatch = useCallback(() => setCurrentPage('match'), [])
  const continueToAnswer = useCallback(() => setCurrentPage('answer'), [])
  const updateCalibration = useCallback((next: Calibration) => {
    setCalibration(next)
    dispatchRequest({ type: 'invalidate' })
    setHelpful(false)
  }, [])
  const resolveClarification = useCallback((label: string) => {
    setCalibration(current => ({
      ...current,
      concerns: current.concerns.length
        ? current.concerns.map((concern, index) => index === 0 ? { ...concern, label, selected: true, source: 'user' as const } : { ...concern, selected: false })
        : [{ id: 'human-clarification', label, selected: true, source: 'user' as const }],
    }))
    setAnalysis(current => ({ ...current, decision: { stage: 'understand', action: 'use_human_clarification', reason: '用户已选择最想确认的方向，后续流程使用这次人工校准。' } }))
    dispatchRequest({ type: 'invalidate' })
    setHelpful(false)
  }, [])
  const prepareInvitations = useCallback((routes: QuestionRoute[]) => {
    dispatchRequest({ type: 'prepare', id: crypto.randomUUID(), routes })
  }, [])
  const firstRoute = invitation?.routes[0]
  const currentAssets = useMemo(() => routingAgent.updateExperienceAssets({ assets: experienceAssets, responses, routes: invitation?.routes }).result.assets, [experienceAssets, responses, invitation?.routes])
  const visibleExperienceAssets = useMemo(() => currentAssets.filter(asset => experienceViewMode === 'respondent' ? asset.id === 'tokyo-dome' : asset.id !== 'tokyo-dome'), [currentAssets, experienceViewMode])
  const candidates = useMemo(() => getInvitableCandidates(demoCandidates, experienceAssets, invitationsEnabled, [...new Set([demoExperienceOwnerId, ...responses.map(response => response.candidateId)])]), [experienceAssets, invitationsEnabled, responses])
  const respondent = candidates.find((candidate) => candidate.id === firstRoute?.candidateId) ?? demoCandidates.find((candidate) => candidate.id === firstRoute?.candidateId)
  const answerResponses = useMemo(() => invitation?.status === 'success' ? collectAnswerResponses(responses, invitation.routes, mockResponses) : [], [invitation, responses])

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [currentPage])

  return (
    <AppShell>
      {currentPage === 'ask' ? (
        <AskPage question={question} onQuestionChange={setQuestion} onSubmit={() => { const nextAnalysis = routingAgent.analyzeQuestion(question); setAnalysis(nextAnalysis); setCalibration({ experienceRequirements: nextAnalysis.result.experienceRequirements, concerns: nextAnalysis.result.concerns }); dispatchRequest({ type: 'invalidate' }); setHelpful(false); setCurrentPage('understand') }} onExperience={() => { setExperienceViewMode('self'); setCurrentPage('experience') }} />
      ) : currentPage === 'experience' ? (
        <ExperiencePage assets={visibleExperienceAssets} viewMode={experienceViewMode} invitationsEnabled={invitationsEnabled} onToggleInvitations={() => setInvitationsEnabled(enabled => !enabled)} onToggleAsset={id => setExperienceAssets(assets => assets.map(asset => asset.id === id ? { ...asset, enabled: !asset.enabled } : asset))} onRemoveTag={(id, tag) => setExperienceAssets(assets => removeExperienceTag(assets, id, tag))} onAsk={() => setCurrentPage('ask')} onBack={() => setCurrentPage('request')} />
      ) : currentPage === 'understand' ? (
        <UnderstandPage calibration={calibration} parsedIntent={parsedIntent} clarificationQuestion={analysis.decision.action === 'request_clarification' ? parsedIntent.clarificationQuestion : undefined} onClarification={resolveClarification} onCalibrationChange={updateCalibration} onBack={() => setCurrentPage('ask')} onContinue={continueToMatch} />
      ) : currentPage === 'match' ? (
        <MatchPage calibration={calibration} parsedIntent={parsedIntent} candidates={candidates} invitation={invitation} onBack={() => setCurrentPage('understand')} onPrepared={prepareInvitations} onViewRequest={() => setCurrentPage('request')} />
      ) : currentPage === 'request' && invitation && respondent ? (
        <RequestPage key={invitation.id} invitation={invitation} candidate={respondent} response={responses.find((response) => response.routeId === firstRoute?.id)} onBack={() => setCurrentPage('match')} onSubmit={(selectedOption, note) => dispatchRequest({ type: 'submit', selectedOption, note, timestamp: new Date().toISOString(), experienceAssetId: 'tokyo-dome' })} onFeedback={(reason) => dispatchRequest({ type: 'feedback', reason, timestamp: new Date().toISOString() })} onSkip={() => dispatchRequest({ type: 'skip' })} onContinue={continueToAnswer} onViewExperience={() => { setExperienceViewMode('respondent'); setCurrentPage('experience') }} answerCount={answerResponses.length} />
      ) : currentPage === 'answer' && invitation ? (
        <AnswerPage responses={answerResponses} selectedConcerns={calibration.concerns} routes={invitation.routes} candidates={demoCandidates} helpful={helpful} onHelpful={() => setHelpful(true)} onFollowUp={text => setFollowUps(items => [...items, { invitationId: invitation.id, text }])} onBack={() => setCurrentPage('request')} />
      ) : null}
    </AppShell>
  )
}
