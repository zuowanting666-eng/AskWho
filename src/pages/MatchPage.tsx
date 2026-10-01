import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, FileText } from 'lucide-react'
import type { Calibration } from '../data/understand'
import type { Candidate, MatchResult, ParsedIntent, QuestionRoute } from '../ai/types'
import { routingAgent } from '../ai/routingAgent'
import type { Invitation } from '../utils/requestState'
import '../styles/match.css'

function MatchReasons({ match }: { match: MatchResult }) {
  return <>
    <div className="match-reasons">
      {match.matchedRequirements.map((item) => <span key={item.id}><Check size={12} aria-hidden="true" />{item.label}</span>)}
      {!match.matchedRequirements.length && <span>暂无重合条件</span>}
    </div>
    {match.missingMust.length > 0 && <p className="match-partial">部分匹配 · 缺少：{match.missingMust.join('、')}</p>}
  </>
}

function Evidence({ match }: { match: MatchResult }) {
  return <div className="match-evidence">
    <h3><FileText size={13} aria-hidden="true" />经验依据</h3>
    <ul>{match.candidate.evidence.map((item) => <li key={`${item.type}-${item.label}`}>{item.label}{item.title ? ` · ${item.title}` : ''}</li>)}</ul>
    <p>最近相关经历：{match.candidate.lastExperienceDate}</p>
  </div>
}

export function MatchPage({ calibration, parsedIntent, candidates, invitation, onBack, onPrepared, onViewRequest }: { calibration: Calibration; parsedIntent: ParsedIntent; candidates: Candidate[]; invitation: Invitation | null; onBack: () => void; onPrepared: (routes: QuestionRoute[]) => void; onViewRequest: () => void }) {
  const matchPlan = useMemo(() => routingAgent.prepareMatch({ parsedIntent, currentRequirements: calibration.experienceRequirements, concerns: calibration.concerns, candidates }), [parsedIntent, calibration, candidates])
  const matches = matchPlan.result
  const routePlan = useMemo(() => routingAgent.prepareRoutes({ concerns: calibration.concerns, matchResults: matches }), [calibration.concerns, matches])
  const routes = routePlan.result
  const [preparing, setPreparing] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const preparingRef = useRef(false)
  const mustCount = calibration.experienceRequirements.filter((item) => item.priority === 'must').length
  const preferredCount = calibration.experienceRequirements.filter((item) => item.priority === 'preferred').length
  const selectedCount = calibration.concerns.filter((item) => item.selected).length
  const top = matches[0]

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (!preparing) return
    const timer = window.setTimeout(() => {
      onPrepared(routes)
      preparingRef.current = false
      setPreparing(false)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [preparing, routes, onPrepared])

  function prepareInvitations() {
    if (preparingRef.current || invitation || !routes.length) return
    preparingRef.current = true
    setPreparing(true)
  }

  return (
    <article className="match-page">
      <header className="match-header">
        <button type="button" onClick={onBack} aria-label="返回理解你的问题"><ArrowLeft size={21} aria-hidden="true" /></button>
        <h1 ref={titleRef} tabIndex={-1}>找到经历过的人</h1>
      </header>
      <section className="match-hero" aria-labelledby="match-title">
        <p className="match-eyebrow"><span />按你刚才确认的条件</p>
        <h2 id="match-title">找到 <em>{matches.length}</em> 位<br /><span>真正经历过</span>的人</h2>
        <p className="match-tagline">匹配的是经历，不是影响力。</p>
        <p className="match-counts">{mustCount} 个必须 · {preferredCount} 个优先 · {selectedCount} 个重点问题</p>
        {matchPlan.decision.action === 'relax_preferred' && <p className="match-strategy">优先条件已适度放宽，必须经历仍然保留。</p>}
      </section>

      {!top && <p className="match-empty" role="status">暂时没有找到足够匹配的经历者。</p>}

      {top && <section className="match-featured" aria-label="最高匹配经历者" data-candidate-id={top.candidate.id}>
        <div className="match-person-heading">
          <span className="match-avatar is-pink" aria-hidden="true">{top.candidate.avatarInitial}</span>
          <div><h2>{top.candidate.name}</h2><span className="match-person-caption">{top.missingMust.length ? '部分经历匹配' : '最高经验匹配'}</span></div>
          <div className="match-score"><strong>{top.score}<small>%</small></strong><span>经验匹配</span></div>
        </div>
        <h3 className="match-reason-heading">为什么匹配</h3>
        <p className="match-skill-reason">{top.reason}</p>
        <MatchReasons match={top} />
        <Evidence match={top} />
        <blockquote>“{top.candidate.summary}”</blockquote>
      </section>}

      <section className="match-others" aria-label="其他匹配经历者">
        {matches.slice(1).map((match, index) => (
          <details className="match-compact" key={match.candidate.id} data-candidate-id={match.candidate.id}>
            <summary>
              <span className={`match-avatar ${index === 0 ? 'is-mint' : 'is-soft'}`} aria-hidden="true">{match.candidate.avatarInitial}</span>
              <span className="match-compact-info">
                <span className="match-compact-name"><strong>{match.candidate.name}</strong><span>{match.score}%</span></span>
                <span className="match-compact-experiences">{match.matchedRequirements.slice(0, 3).map((item) => item.label).join(' · ') || '暂无重合条件'}</span>
                <span className="match-compact-focus">{match.candidate.answerFocus}</span>
              </span>
              <ChevronDown className="match-expand-icon" size={16} aria-hidden="true" />
            </summary>
            <div className="match-compact-detail"><h3 className="match-reason-heading">为什么匹配</h3><MatchReasons match={match} /><Evidence match={match} /></div>
          </details>
        ))}
      </section>

      <section className="match-routing" aria-labelledby="routing-title">
        <h2 id="routing-title">每个人，只问最适合他回答的</h2>
        <p className="match-routing-caption">AI 不会把同一个问题群发给所有人。</p>
        <ol>{routes.map((route) => <li key={route.concern.id} data-candidate-id={route.candidateId}>
          <span className="match-route-person">{route.candidateName}</span>
          <div><p className="match-original-concern">{route.concern.label}</p><p className="match-micro-question"><span aria-hidden="true">↳</span>{route.microQuestion}</p></div>
        </li>)}</ol>
      </section>

      <footer className="match-footer">
        <p className="match-trust"><span />每人最多收到 1 个问题 · 匿名邀请 · 不会直接开启私聊</p>
        {invitation ? <><div className="match-sent" role="status"><p><Check size={15} aria-hidden="true" />{invitation.routes.length} 个经验邀请已发出</p><small>下面看看其中一位回答者会收到什么。</small></div><span className="match-demo-badge">Demo</span><button type="button" className="question-submit" onClick={onViewRequest}>查看回答者视角<ArrowUpRight size={22} aria-hidden="true" /></button></> : <button type="button" className="question-submit" disabled={preparing || !routes.length} aria-busy={preparing} onClick={prepareInvitations}><span>{preparing ? '正在准备经验邀请…' : `向 ${routes.length} 位经历者发出邀请`}</span><ArrowUpRight size={22} aria-hidden="true" /></button>}
        <p className="match-demo-note">演示模式 · 不会向真人发送</p>
      </footer>
    </article>
  )
}
