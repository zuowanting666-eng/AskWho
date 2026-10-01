import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, Moon, Plus, Ticket, X } from 'lucide-react'
import { Toast } from '../components/Toast'
import { calibrationLimits, estimateMatches, priorityLimitMessage } from '../data/understand'
import type { Calibration, ExperiencePriority, ExperienceRequirement } from '../data/understand'
import type { ParsedIntent } from '../ai/types'
import '../styles/understand.css'

const priorityOptions: { value: ExperiencePriority; label: string; description: string }[] = [
  { value: 'must', label: '必须匹配', description: '尽量只找真正有这段经历的人' },
  { value: 'preferred', label: '优先匹配', description: '有更好，没有也可以' },
  { value: 'ignored', label: '不重要', description: '不影响这次匹配' },
]

type UnderstandPageProps = {
  calibration: Calibration
  parsedIntent: ParsedIntent
  clarificationQuestion?: string
  onClarification: (label: string) => void
  onCalibrationChange: (calibration: Calibration) => void
  onBack: () => void
  onContinue: () => void
}

function ExperienceSheet({ requirement, onChoose, onClose, toast }: {
  requirement: ExperienceRequirement
  onChoose: (priority: ExperiencePriority) => void
  onClose: () => void
  toast: { id: number; message: string } | null
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current!
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = previousOverflow }
  }, [])

  return (
    <dialog ref={dialogRef} className="understand-sheet" aria-labelledby="priority-title" aria-describedby="priority-condition" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} onKeyDown={(event) => {
      if (event.key !== 'Tab') return
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }}>
      <div className="understand-sheet-panel">
        <div className="understand-sheet-handle" aria-hidden="true" />
        <button type="button" className="understand-sheet-close" onClick={onClose} aria-label="关闭条件设置"><X size={20} aria-hidden="true" /></button>
        <h2 id="priority-title">这个条件有多重要？</h2>
        <p id="priority-condition">{requirement.label}</p>
        <div className="understand-priority-options">
          {priorityOptions.map((option) => (
            <button type="button" key={option.value} aria-pressed={requirement.priority === option.value} autoFocus={requirement.priority === option.value} onClick={() => onChoose(option.value)}>
              <span><strong>{option.label}</strong><small>{option.description}</small></span>
              <span className="understand-option-indicator">{requirement.priority === option.value && <Check size={17} aria-hidden="true" />}</span>
            </button>
          ))}
        </div>
        {toast && <Toast key={toast.id} message={toast.message} />}
      </div>
    </dialog>
  )
}

const clarificationChoices = [
  { label: '实际体验', concern: '实际体验怎么样？' },
  { label: '操作难度', concern: '实际操作起来有多困难？' },
  { label: '可能遇到的问题', concern: '最可能遇到什么问题？' },
]

export function UnderstandPage({ calibration, parsedIntent, clarificationQuestion, onClarification, onCalibrationChange, onBack, onContinue }: UnderstandPageProps) {
  const { experienceRequirements, concerns } = calibration
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)
  const [addition, setAddition] = useState<'closed' | 'input' | 'parsing' | 'recognized'>('closed')
  const [additionText, setAdditionText] = useState('')
  const [additionError, setAdditionError] = useState('')
  const [isAddingConcern, setIsAddingConcern] = useState(false)
  const [concernText, setConcernText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const continuePending = useRef(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const whoRef = useRef<HTMLHeadingElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const parseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const toastId = useRef(0)
  const must = experienceRequirements.filter((item) => item.priority === 'must')
  const preferred = experienceRequirements.filter((item) => item.priority === 'preferred')
  const ignored = experienceRequirements.filter((item) => item.priority === 'ignored')
  const selectedCount = concerns.filter((item) => item.selected).length
  const matchCount = estimateMatches(experienceRequirements)
  const editing = experienceRequirements.find((item) => item.id === editingId)
  const hasUserRequirement = experienceRequirements.some((item) => item.source === 'user')
  const hasUserConcern = concerns.some((item) => item.source === 'user')

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
    return () => { clearTimeout(toastTimer.current); clearTimeout(parseTimer.current) }
  }, [])

  // Couple the pending transition to its timer. Fast Refresh may rerun effects:
  // cleanup cancels the old timer, then this effect reschedules pending work.
  // Ordinary renders do not restart it because onContinue is stable in App.
  useEffect(() => {
    if (!isLoading) return
    const timer = window.setTimeout(() => {
      continuePending.current = false
      setIsLoading(false)
      onContinue()
    }, 800)
    return () => window.clearTimeout(timer)
  }, [isLoading, onContinue])

  function handleContinue() {
    if (continuePending.current || isLoading) return
    if (must.length > calibrationLimits.must) { notify('必须匹配最多保留 2 个，先放宽一个条件。'); return }
    if (preferred.length > calibrationLimits.preferred) { notify('优先匹配最多保留 3 个，先调整一个已有条件。'); return }
    if (must.length + preferred.length > calibrationLimits.active) { notify('有效条件最多保留 5 个，先调整一个已有条件。'); return }
    if (selectedCount < 1) { notify('至少保留 1 个想确认的问题。'); return }
    if (selectedCount > 3) { notify('最多确认 3 个问题，先取消一个再添加。'); return }
    if (typeof onContinue !== 'function') { notify('页面连接尚未就绪，请刷新后重试。'); return }
    continuePending.current = true
    setIsLoading(true)
  }

  function notify(message: string) {
    clearTimeout(toastTimer.current)
    setToast({ id: ++toastId.current, message })
    toastTimer.current = setTimeout(() => setToast(null), 1900)
  }

  function closeSheet() {
    setEditingId(null)
    requestAnimationFrame(() => {
      const target = opener.current?.isConnected ? opener.current : whoRef.current
      target?.focus({ preventScroll: true })
    })
  }

  function choosePriority(priority: ExperiencePriority) {
    if (!editing) return
    const limitMessage = priorityLimitMessage(experienceRequirements, editing.id, priority)
    if (limitMessage) { notify(limitMessage); return }
    const next = experienceRequirements.map((item) => item.id === editing.id ? { ...item, priority } : item)
    const nextCount = estimateMatches(next)
    onCalibrationChange({ ...calibration, experienceRequirements: next })
    closeSheet()
    if (nextCount > matchCount) notify('范围更宽了，会找到更多经历者。')
    if (nextCount < matchCount) notify('匹配更精准，但可邀请的人会更少。')
  }

  function toggleConcern(id: string) {
    const concern = concerns.find((item) => item.id === id)!
    if (!concern.selected && selectedCount >= 3) { notify('最多确认 3 个问题，先取消一个再添加。'); return }
    if (concern.selected && selectedCount === 1) { notify('至少保留 1 个想确认的问题。'); return }
    onCalibrationChange({ ...calibration, concerns: concerns.map((item) => item.id === id ? { ...item, selected: !item.selected } : item) })
  }

  function addConcern() {
    const label = concernText.trim().slice(0, calibrationLimits.concernCharacters)
    if (!label || hasUserConcern) return
    if (selectedCount >= 3) { notify('最多确认 3 个问题，先取消一个再添加。'); return }
    onCalibrationChange({ ...calibration, concerns: [...concerns, { id: 'user-concern', label, selected: true, source: 'user' }] })
    setIsAddingConcern(false)
    setConcernText('')
    notify('已添加你的问题')
  }

  function deleteConcern(id: string) {
    const concern = concerns.find((item) => item.id === id)
    if (!concern || concern.source !== 'user') return
    if (concern.selected && selectedCount === 1) { notify('至少保留 1 个想确认的问题。'); return }
    onCalibrationChange({ ...calibration, concerns: concerns.filter((item) => item.id !== id) })
    notify('已删除自定义问题')
  }

  function cancelAddition() {
    clearTimeout(parseTimer.current)
    setAddition('closed')
    setAdditionText('')
    setAdditionError('')
  }

  function parseAddition() {
    if (!additionText.trim() || addition === 'parsing') return
    setAdditionError('')
    setAddition('parsing')
    parseTimer.current = setTimeout(() => {
      if (/末班车/.test(additionText)) setAddition('recognized')
      else { setAddition('input'); setAdditionError('暂未识别，请试试「需要赶末班车」。') }
    }, 650)
  }

  function addRequirement() {
    if (experienceRequirements.filter((item) => item.source === 'user').length >= calibrationLimits.user) { notify('本次最多补充 1 个条件。'); return }
    if (preferred.length >= calibrationLimits.preferred) { notify('已经有 3 个优先条件，先调整一个再添加。'); return }
    if (must.length + preferred.length >= calibrationLimits.active) { notify('有效条件最多保留 5 个，先调整一个已有条件。'); return }
    onCalibrationChange({ ...calibration, experienceRequirements: [...experienceRequirements, { id: 'last-train', label: '赶末班车', priority: 'preferred', source: 'user' }] })
    cancelAddition()
    notify('已加入「赶末班车」')
  }

  function renderTokens(items: ExperienceRequirement[], priority: ExperiencePriority) {
    return <div className={`understand-tokens ${priority}`}>
      {items.map((item, index) => (
        <button type="button" key={item.id} className={`understand-token ${priority === 'must' ? (index % 2 ? 'is-mint' : 'is-pink') : ''}`} aria-label={`调整「${item.label}」`} aria-haspopup="dialog" onClick={(event) => { opener.current = event.currentTarget; setToast(null); clearTimeout(toastTimer.current); setEditingId(item.id) }}>
          {priority === 'must' && (item.id === 'night' ? <Moon size={15} aria-hidden="true" /> : <Ticket size={15} aria-hidden="true" />)}
          <span>{item.label}</span><ChevronDown size={12} aria-hidden="true" />
        </button>
      ))}
      {!items.length && <span className="understand-empty">暂无{priority === 'must' ? '必须' : '优先'}匹配条件</span>}
    </div>
  }

  return (
    <article className="understand-page" data-problem-type={parsedIntent.problemType} data-ai-confidence={parsedIntent.confidence}>
      <header className="understand-header">
        <button type="button" className="understand-back" onClick={onBack} aria-label="返回提问"><ArrowLeft size={21} aria-hidden="true" /></button>
        <h1 ref={titleRef} tabIndex={-1}>理解你的问题</h1>
      </header>
      {clarificationQuestion && <section className="understand-clarification" aria-labelledby="clarification-title">
        <p id="clarification-title">{clarificationQuestion}</p>
        <div>{clarificationChoices.map(choice => <button type="button" key={choice.label} onClick={() => onClarification(choice.concern)}>{choice.label}</button>)}</div>
      </section>}
      <section className="understand-hero" aria-labelledby="understand-insight">
        <p className="understand-eyebrow"><span />我理解了一下</p>
        <h2 id="understand-insight">你真正需要的，<br />是经历过<span className="understand-marker">东京巨蛋夜间散场</span>的人。</h2>
        <p className="understand-caption">先确认找谁，再决定重点问什么。</p>
      </section>

      <section className="understand-who" aria-labelledby="who-title">
        <div className="understand-section-title"><span className="understand-section-number">01</span><h2 ref={whoRef} tabIndex={-1} id="who-title">我会按这些经历找人</h2><small>点一下可调整</small></div>
        <p className="understand-caption understand-requirement-count" aria-live="polite">当前 {must.length}/2 必须 · {preferred.length}/3 优先</p>
        <div className="understand-requirements"><h3>必须匹配</h3>{renderTokens(must, 'must')}<h3>优先匹配</h3>{renderTokens(preferred, 'preferred')}</div>
        {ignored.length > 0 && <details className="understand-ignored"><summary>已忽略 {ignored.length} 个</summary>{renderTokens(ignored, 'ignored')}</details>}
        {!hasUserRequirement && addition === 'closed' && <button type="button" className="understand-add-action" onClick={() => setAddition('input')}><Plus size={14} aria-hidden="true" />少了一个重要条件？</button>}
        {addition !== 'closed' && <div className="understand-addition">
          {addition === 'recognized' ? <><p role="status">识别为：<strong>「赶末班车」</strong></p><div className="understand-addition-actions"><button type="button" onClick={addRequirement}>加入优先匹配</button><button type="button" onClick={cancelAddition}>取消</button></div></> : <form onSubmit={(event) => { event.preventDefault(); parseAddition() }}>
            <div className="understand-addition-input"><input autoFocus aria-label="补充遗漏条件" placeholder="例如：需要赶末班车" maxLength={50} value={additionText} disabled={addition === 'parsing'} onChange={(event) => setAdditionText(event.target.value)} /><button type="button" onClick={parseAddition} disabled={!additionText.trim() || addition === 'parsing'}>确认</button><button type="button" onClick={cancelAddition} aria-label="取消补充"><X size={17} aria-hidden="true" /></button></div>
            {addition === 'parsing' && <p role="status">正在理解这个条件…</p>}
            {additionError && <p role="status" className="understand-input-error">{additionError}</p>}
          </form>}
        </div>}
        <p className="understand-match-feedback" aria-live="polite">当前条件预计可找到 <strong key={matchCount}>{matchCount}</strong> 位高匹配经历者</p>
      </section>

      <section className="understand-what" aria-labelledby="what-title">
        <div className="understand-section-title"><span className="understand-section-number is-mint">02</span><h2 id="what-title">你最想确认什么？</h2><small aria-live="polite">已选 {selectedCount}/3</small></div>
        <p className="understand-caption">最多选 3 个，我们会优先帮你问最重要的。</p>
        <div className="understand-concern-options">
          {concerns.map((concern) => {
            const selection = <button type="button" key={concern.id} aria-label={concern.label} aria-pressed={concern.selected} onClick={() => toggleConcern(concern.id)}><span className="understand-concern-indicator">{concern.selected ? <Check size={15} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}</span><span>{concern.label}{concern.source === 'user' && <small className="understand-user-label">自己补充</small>}</span></button>
            return concern.source === 'ai' ? selection : <div className="understand-user-concern" key={concern.id}>{selection}<button type="button" className="understand-delete-concern" aria-label="删除自定义问题" onClick={() => deleteConcern(concern.id)}><X size={16} aria-hidden="true" /></button></div>
          })}
        </div>
        {!hasUserConcern && !isAddingConcern && <button type="button" className="understand-add-action" onClick={() => setIsAddingConcern(true)}><Plus size={14} aria-hidden="true" />我还有一个想问的</button>}
        {isAddingConcern && !hasUserConcern && <form className="understand-addition understand-concern-addition" onSubmit={(event) => { event.preventDefault(); addConcern() }}>
          <textarea autoFocus aria-label="自己补充一个问题" aria-describedby="concern-character-count" placeholder="输入你最想问经历者的问题" maxLength={30} rows={2} value={concernText} onChange={(event) => setConcernText(event.target.value.slice(0, 30))} />
          <div className="understand-concern-input-footer"><span id="concern-character-count">{concernText.length} / 30</span><button type="button" onClick={() => { setIsAddingConcern(false); setConcernText('') }}>取消</button><button type="button" disabled={!concernText.trim()} onClick={addConcern}>添加问题</button></div>
        </form>}
      </section>

      <footer className="understand-footer">
        <div className="understand-summary" aria-live="polite"><p><strong>{must.length}</strong> 个必须 · <strong>{preferred.length}</strong> 个优先</p><p>重点询问 <strong>{selectedCount}</strong> 个问题</p></div>
        <button type="button" className="question-submit" disabled={isLoading} aria-busy={isLoading} onClick={handleContinue}><span aria-live="polite">{isLoading ? '正在确认谁更适合回答…' : '开始寻找经历过的人'}</span><ArrowUpRight size={22} aria-hidden="true" /></button>
        <p className="understand-trust"><span />只会向高度匹配且愿意接受经验邀请的人发问</p>
      </footer>
      {toast && !editing && <Toast key={toast.id} message={toast.message} />}
      {editing && <ExperienceSheet requirement={editing} onChoose={choosePriority} onClose={closeSheet} toast={toast} />}
    </article>
  )
}
