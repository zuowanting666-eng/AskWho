import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, Clock3, Plus, X } from 'lucide-react'
import { Toast } from '../components/Toast'
import { answersFor, evidenceLabels, feedbackOptions } from '../data/demoData'
import type { Candidate } from '../data/demoData'
import type { ExperienceFeedback, HumanResponse, Invitation } from '../utils/requestState'
import '../styles/request.css'

function FeedbackSheet({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: ExperienceFeedback['type']) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState<ExperienceFeedback['type'] | null>(null)
  useEffect(() => {
    const dialog = dialogRef.current!
    const opener = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = overflow; if (opener?.isConnected) opener.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={dialogRef} className="request-sheet" aria-labelledby="feedback-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="request-sheet-panel">
      <div className="request-sheet-handle" aria-hidden="true" />
      <button type="button" className="request-close" aria-label="关闭反馈" onClick={onClose}><X size={20} /></button>
      <h2 id="feedback-title">哪里不匹配？</h2>
      <div className="request-options" role="group" aria-label="错配原因">{feedbackOptions.map((option) => <button type="button" key={option} aria-pressed={reason === option} onClick={() => setReason(option)}><span>{option}</span><span className="request-check">{reason === option && <Check size={15} aria-hidden="true" />}</span></button>)}</div>
      <button type="button" className="question-submit" disabled={!reason} onClick={() => { if (reason) onSubmit(reason) }}>提交反馈<ArrowUpRight size={20} aria-hidden="true" /></button>
    </div>
  </dialog>
}

type RequestPageProps = {
  invitation: Invitation
  candidate: Candidate
  response?: HumanResponse
  onBack: () => void
  onSubmit: (selectedOption: string, note: string) => void
  onFeedback: (reason: ExperienceFeedback['type']) => void
  onSkip: () => void
  onContinue: () => void
  onViewExperience: () => void
  answerCount: number
}

export function RequestPage({ invitation, candidate, response, onBack, onSubmit, onFeedback, onSkip, onContinue, onViewExperience, answerCount }: RequestPageProps) {
  const route = invitation.routes[0]
  const { status } = invitation
  const answerSet = answersFor(route)
  const [selectedOption, setSelectedOption] = useState('')
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [preparingStage, setPreparingStage] = useState(0)
  const preparingRef = useRef(false)
  const preparing = preparingStage > 0
  useEffect(() => {
    if (!preparing) return
    const progress = window.setTimeout(() => setPreparingStage(2), 400)
    const finish = window.setTimeout(() => { preparingRef.current = false; setPreparingStage(0); onContinue() }, 800)
    return () => { window.clearTimeout(progress); window.clearTimeout(finish) }
  }, [preparing, onContinue])
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const stateHeadingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
    return () => clearTimeout(toastTimer.current)
  }, [])
  useEffect(() => {
    if (status !== 'answering') { window.scrollTo(0, 0); stateHeadingRef.current?.focus({ preventScroll: true }) }
  }, [status])
  function notify(message: string) {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), 1900)
  }
  function submit() {
    if (!answerSet.options.includes(selectedOption)) { notify('先选一个最接近你真实经历的回答。'); return }
    setToast('')
    onSubmit(selectedOption, note)
  }

  return <article className="request-page" data-candidate-id={candidate.id} data-route-id={route.id}>
    <header className="request-header">
      <button type="button" aria-label="返回匹配结果" onClick={onBack}><ArrowLeft size={21} aria-hidden="true" /></button>
      <h1 ref={titleRef} tabIndex={-1}>经验邀请</h1><span>回答者视角</span>
    </header>

    {status === 'answering' ? <>
      <section className="request-hero">
        <p className="request-eyebrow"><i />有人正在经历你经历过的事</p>
        <h2>你的<span>经验，</span><br />可能刚好能<em>帮到 TA。</em></h2>
        <p className="request-caption">只回答你真正经历过的部分，不会开启私聊。</p>
      </section>
      <section className="request-context" aria-label="邀请依据">
        <details><summary>为什么问我？<ChevronDown size={14} aria-hidden="true" /></summary>
          <div className="request-evidence"><p>经验依据：</p>{candidate.evidence.map((item) => <p key={item.type}>{evidenceLabels[item.type]} {item.count} {item.type === 'note' ? '篇' : '条'}</p>)}
            <button type="button" onClick={() => setFeedbackOpen(true)}>这段经历不匹配</button>
          </div>
        </details>
        <p>因为你曾分享过：</p><div className="request-experiences">{candidate.experiences.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div>
      </section>
      <section className="request-question" aria-labelledby="request-question-title">
        <p>想问你一个具体经验</p><h2 id="request-question-title">{route.microQuestion}</h2><small>只需要按你的真实经历回答。</small>
      </section>
      <section className="request-answers" aria-label="快速回答">
        <p className="request-effort"><Clock3 size={13} aria-hidden="true" />约 10 秒完成</p>
        <div className="request-options" role="group" aria-label="选择最接近你的经历">{answerSet.options.map((option) => <button type="button" key={option} aria-pressed={selectedOption === option} onClick={() => setSelectedOption(option)}><span>{option}</span><span className="request-check">{selectedOption === option && <Check size={15} aria-hidden="true" />}</span></button>)}</div>
        <button type="button" className="request-note-toggle" aria-expanded={expanded} aria-controls="request-note" onClick={() => setExpanded(!expanded)}><Plus size={15} aria-hidden="true" />想多说一句？</button>
        {expanded && <div className="request-note" id="request-note"><textarea autoFocus aria-label="补充一句真实经验" aria-describedby="request-note-count" placeholder="例如：我当时跟着人流走，大概 25 分钟坐上车。" rows={3} maxLength={80} value={note} onChange={(event) => setNote(event.target.value.slice(0, 80))} /><span id="request-note-count">{note.length} / 80</span></div>}
      </section>
      <footer className="request-footer"><p className="request-trust"><i />匿名回答 · 不开启私聊 · 今日不再重复邀请</p><button type="button" className="question-submit" disabled={!selectedOption} onClick={submit}>提交这段经验<ArrowUpRight size={22} aria-hidden="true" /></button><button type="button" className="request-skip" onClick={onSkip}>暂时不想回答</button></footer>
    </> : status === 'success' && response ? <section className="request-result">
      <span className="request-success-mark"><Check size={26} aria-hidden="true" /></span>
      <h2 ref={stateHeadingRef} tabIndex={-1}>谢谢，这段经验留下来了。</h2>
      <p>以后遇到类似问题，系统会优先复用这条经验，不必重复打扰你。</p>
      <section className="request-asset" aria-label="留下的经验"><p className="request-asset-tags">{[...candidate.experiences.slice(0, 2), answerSet.category].join(' · ')}</p><blockquote>“{response.selectedOption}”</blockquote>{response.note && <p className="request-asset-note">{response.note}</p>}<p className="request-asset-saved"><Check size={14} aria-hidden="true" />这段经验已加入你的「东京巨蛋演唱会」经验。</p><button type="button" className="request-asset-link" onClick={onViewExperience}>查看回答者经验<ArrowUpRight size={16} aria-hidden="true" /></button></section>
      <p className="request-value">这条经验将帮助正在问这个问题的人。</p>
      <span className="request-demo">Demo</span><button type="button" className="question-submit" disabled={preparing} aria-busy={preparing} onClick={() => { if (preparingRef.current) return; preparingRef.current = true; setPreparingStage(1) }}><span aria-live="polite">{preparingStage === 1 ? `正在对齐 ${answerCount} 份真人经验…` : preparingStage === 2 ? '正在找共识和差异…' : '看看提问者最终收到什么'}</span><ArrowUpRight size={20} aria-hidden="true" /></button>
    </section> : <section className="request-result request-ending">
      <span className="request-success-mark"><Check size={26} aria-hidden="true" /></span><h2 ref={stateHeadingRef} tabIndex={-1}>{status === 'mismatch' ? '这次就不打扰你了。' : '没关系，这次就先跳过。'}</h2><button type="button" className="question-submit" onClick={onBack}>返回<ArrowUpRight size={20} aria-hidden="true" /></button>
    </section>}
    {feedbackOpen && <FeedbackSheet onClose={() => setFeedbackOpen(false)} onSubmit={(reason) => { setFeedbackOpen(false); onFeedback(reason); notify('收到，这类问题会减少向你邀请。') }} />}
    {toast && <Toast message={toast} />}
  </article>
}
