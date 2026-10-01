import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, X } from 'lucide-react'
import type { Candidate, ExperienceResponse } from '../ai/types'
import type { Calibration } from '../data/understand'
import type { InvitationRoute } from '../utils/requestState'
import type { RawResponse } from '../utils/synthesizeResponses'
import { routingAgent } from '../ai/routingAgent'
import { Toast } from '../components/Toast'
import '../styles/answer.css'

function Evidence({ ids, responses }: { ids: string[]; responses: RawResponse[] }) {
  return <div className="answer-evidence"><p>哪些回答支持这个判断？</p>{responses.filter(r => ids.includes(r.id)).map(r => <blockquote key={r.id}><cite>{r.candidate.name}</cite><span>“{r.selectedOption}{r.note ? ` ${r.note}` : ''}”</span></blockquote>)}</div>
}

function AnswerSheet({ kind, onClose, onFollowUp }: { kind: 'trust' | 'followup'; onClose: () => void; onFollowUp: (text: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [text, setText] = useState('')
  useEffect(() => {
    const dialog = dialogRef.current!
    const opener = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    dialog.showModal(); document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = overflow; if (opener?.isConnected) opener.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={dialogRef} className="answer-sheet" aria-labelledby="answer-sheet-title" onCancel={e => { e.preventDefault(); onClose() }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="answer-sheet-panel"><div className="answer-sheet-handle" /><button type="button" className="answer-close" aria-label="关闭" onClick={onClose}><X size={20} /></button>
      <h2 id="answer-sheet-title">{kind === 'trust' ? '了解怎么整理' : '你还想确认什么？'}</h2>
      {kind === 'trust' ? <div className="answer-method"><h3>AI 做了</h3><ul><li>找共识</li><li>找差异</li><li>整理结构</li></ul><h3>AI 没有做</h3><ul><li>替真人补充经历</li><li>修改原始回答立场</li></ul></div> : <><p>我们会先看现有经验能不能回答，只有确实缺信息时才再次邀请真人。</p><textarea autoFocus aria-label="你还想确认什么？" aria-describedby="followup-count" rows={3} maxLength={40} value={text} onChange={e => setText(e.target.value.slice(0, 40))} /><span id="followup-count">{text.length} / 40</span><button type="button" className="question-submit" disabled={!text.trim()} onClick={() => onFollowUp(text.trim())}>继续<ArrowUpRight size={20} aria-hidden="true" /></button></>}
    </div>
  </dialog>
}

type AnswerPageProps = {
  responses: ExperienceResponse[]; selectedConcerns: Calibration['concerns']; routes: InvitationRoute[]; candidates: Candidate[]
  helpful: boolean; onHelpful: () => void; onFollowUp: (text: string) => void; onBack: () => void
}

export function AnswerPage({ responses, selectedConcerns, routes, candidates, helpful, onHelpful, onFollowUp, onBack }: AnswerPageProps) {
  const synthesis = useMemo(() => routingAgent.synthesize({ responses, concerns: selectedConcerns, routes, candidates }), [responses, selectedConcerns, routes, candidates])
  const result = synthesis.result
  const [sheet, setSheet] = useState<'trust' | 'followup' | null>(null)
  const [toast, setToast] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { title.current?.focus({ preventScroll: true }); return () => clearTimeout(timer.current) }, [])
  const n = result.rawResponses.length
  const differenceSection = n > 1 && <section className={`answer-differences ${result.hasConflict ? 'is-primary' : ''}`} aria-labelledby="difference-title"><h2 id="difference-title">但每个人的体验不完全一样</h2>{result.differences.map(difference => <details key={difference.id}><summary><span>{difference.statement}</span><ChevronDown size={14} aria-hidden="true" /></summary><Evidence ids={difference.relatedResponseIds} responses={result.rawResponses} /></details>)}</section>

  return <article className="answer-page">
    <header className="answer-header"><button type="button" aria-label="返回已提交的经验" onClick={onBack}><ArrowLeft size={21} aria-hidden="true" /></button><h1 ref={title} tabIndex={-1}>真人经验</h1></header>
    <section className="answer-hero"><p className="answer-eyebrow"><i />{n === 0 ? '还在等真人经验回来' : n === 1 ? '目前收到 1 份相似经历' : `${n} 份真实经历已经回来了`}</p><h2>{(n === 0 ? '还在等真人经验回来。' : result.conclusion).split(/(没有想象中难|散场人流)/).map((part, i) => part === '没有想象中难' ? <span className="answer-mint-marker" key={i}>{part}</span> : part === '散场人流' ? <span className="answer-pink-marker" key={i}>{part}</span> : part)}</h2><p className="answer-caption">下面只整理真人回答中出现的信息。</p></section>
    <section className="answer-summary" aria-labelledby="answer-summary-title"><h2 id="answer-summary-title">先给你结论</h2><p>{result.summary}</p><span>{result.confidenceLabel}</span>{result.timeEvidence && <details className="answer-time"><summary>{result.timeEvidence.statement}<ChevronDown size={14} aria-hidden="true" /></summary><Evidence ids={result.timeEvidence.relatedResponseIds} responses={result.rawResponses} /></details>}</section>
    {result.hasConflict && differenceSection}
    {n > 1 && <section className="answer-consensus" aria-labelledby="consensus-title"><h2 id="consensus-title">大家比较一致的是</h2>{result.consensus.length ? result.consensus.map(item => <details key={item.id} className="answer-consensus-row"><summary><span className="answer-ratio">{item.supportCount}<small>/{item.totalCount}</small></span><span>{item.statement}</span><ChevronDown size={14} aria-hidden="true" /></summary><Evidence ids={item.relatedResponseIds} responses={result.rawResponses} /></details>) : <p className="answer-empty">目前还没有足够的共同信息，先保留各自的说法。</p>}</section>}
    {!result.hasConflict && differenceSection}
    <section className="answer-originals" aria-labelledby="raw-title"><h2 id="raw-title">看看他们原本怎么说</h2>{result.rawResponses.map(response => <details key={response.id} className="answer-raw" data-response-id={response.id} data-source={response.source}><summary><span className="answer-avatar" aria-hidden="true">{response.candidate.avatarInitial}</span><span className="answer-raw-info"><span className="answer-person">{response.candidate.name}<small>{response.source === 'human' ? '本次回答' : '历史经验'}</small></span><span className="answer-experiences">{response.candidate.experiences.slice(0, 2).join(' · ')}</span><span className="answer-excerpt">{response.selectedOption}{response.note ? ` ${response.note}` : ''}</span></span><ChevronDown size={14} aria-hidden="true" /></summary><dl><dt>问题</dt><dd>{response.question}</dd><dt>快速回答</dt><dd>{response.selectedOption}</dd>{response.note && <><dt>补充回答</dt><dd>{response.note}</dd></>}</dl></details>)}
      <div className="answer-trust"><p><i />真人提供经验 · AI 负责匹配与整理</p><button type="button" onClick={() => setSheet('trust')}>了解怎么整理</button><small>这是 {n} 份相似经历，不代表所有人的情况。</small></div>
      <footer className="answer-footer"><button type="button" className="question-submit" disabled={helpful} onClick={onHelpful}>{helpful ? '已收到，谢谢反馈' : '这个答案有帮助'}{helpful ? <Check size={21} aria-hidden="true" /> : <ArrowUpRight size={21} aria-hidden="true" />}</button><button type="button" className="answer-followup" onClick={() => setSheet('followup')}>我还想追问</button></footer>
    </section>
    {sheet && <AnswerSheet kind={sheet} onClose={() => setSheet(null)} onFollowUp={text => { onFollowUp(text); setSheet(null); setToast('已记录，下一步会先复用已有经验。'); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 1900) }} />}
    {toast && <Toast message={toast} />}
  </article>
}
