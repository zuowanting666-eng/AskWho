import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, ChevronRight, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { BottomNavigation } from '../components/BottomNavigation'
import { Toast } from '../components/Toast'
import { demoExperienceSummary } from '../data/demoData'
import type { CurrentExperienceAsset } from '../utils/buildExperienceAssets'
import '../styles/experience.css'

function InvitationSwitch({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: () => void }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} className="experience-switch" onClick={onChange}><span aria-hidden="true" /><small aria-hidden="true">{checked ? 'ON' : 'OFF'}</small></button>
}

type ExperiencePageProps = {
  assets: CurrentExperienceAsset[]; invitationsEnabled: boolean; onToggleInvitations: () => void
  onToggleAsset: (id: string) => void; onRemoveTag: (id: string, tag: string) => void; onAsk: () => void
  viewMode: 'self' | 'respondent'; onBack: () => void
}

export function ExperiencePage({ assets, invitationsEnabled, onToggleInvitations, onToggleAsset, onRemoveTag, onAsk, viewMode, onBack }: ExperiencePageProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dailyLimitOpen, setDailyLimitOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const editRef = useRef<HTMLButtonElement>(null)
  const active = assets.find(asset => asset.id === activeId)
  const modalOpen = !!active || dailyLimitOpen
  const newCount = assets.reduce((sum, asset) => sum + asset.newResponseCount, 0)
  const hero = assets[0]

  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); return () => clearTimeout(timer.current) }, [])
  useEffect(() => {
    if (!modalOpen) return
    const dialog = dialogRef.current!
    const opener = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    dialog.showModal(); document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = overflow; if (opener?.isConnected) opener.focus({ preventScroll: true }) }
  }, [modalOpen])
  function notify(message: string) { clearTimeout(timer.current); setToast(message); timer.current = setTimeout(() => setToast(''), 1900) }
  function close() { setActiveId(null); setDailyLimitOpen(false); setEditing(false); setToast('') }
  function openAsset(id: string) { setToast(''); setEditing(false); setActiveId(id) }
  function toggleAsset(asset: CurrentExperienceAsset) {
    onToggleAsset(asset.id)
    notify(asset.enabled ? '以后不会因为这段经验主动邀请你回答。' : '已恢复这段经验的相关邀请。')
  }
  const invitationLabel = (asset: CurrentExperienceAsset) => !invitationsEnabled ? '邀请已暂停' : asset.enabled ? '接受相关邀请' : '相关邀请已关闭'

  return <>
    <article className="experience-page">
      <header className="experience-hero">{viewMode === 'respondent' ? <div className="experience-role-header"><button type="button" onClick={onBack} aria-label="返回已提交的经验"><ArrowLeft size={21} aria-hidden="true" /></button><span>回答者视角</span></div> : <p className="experience-kicker">问对 AskWho</p>}<h1 ref={titleRef} tabIndex={-1}>我的<span>经验</span></h1><p className="experience-intro">那些你真正经历过的事，<br />正在变成可以帮助别人的经验。</p><p className="experience-trust"><ShieldCheck size={14} aria-hidden="true" />只记录你主动确认过，或公开表达过的真实经历。</p></header>
      <section className="experience-summary" aria-label="经验历史汇总"><div><strong>{viewMode === 'respondent' ? (hero?.helpedCount ?? 0) : demoExperienceSummary.helpedCount}</strong><p>人被你的经验<br />帮助过</p></div><div><strong>{viewMode === 'respondent' ? (hero?.reuseCount ?? 0) : demoExperienceSummary.reuseCount}</strong><p>次无需再次打扰你，<br />就复用了已有经验</p></div><p className="experience-summary-caption"><span>{viewMode === 'respondent' ? assets.length : demoExperienceSummary.experienceCount + newCount} 已沉淀经验</span><span>{viewMode === 'respondent' ? (hero?.answerCount ?? 0) : demoExperienceSummary.answerCount + newCount} 回答过的问题</span><small>历史累计</small></p></section>
      <section className="experience-assets" aria-labelledby="assets-title"><div className="experience-section-title"><h2 id="assets-title">我的经验资产</h2><span>让每段经历继续有用</span></div>
        {!assets.length && <p className="experience-empty" role="status">你的经验会在回答真实问题后慢慢沉淀。</p>}
        {hero && <div className="experience-featured"><div className="experience-featured-top"><span>{hero.category}</span><small>{invitationLabel(hero)}</small></div><button type="button" className="experience-title-button" onClick={() => openAsset(hero.id)}><h3>{hero.title}</h3><ArrowUpRight size={20} aria-hidden="true" /></button><div className="experience-tags">{hero.experiences.slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}</div><p className="experience-impact">帮助 {hero.helpedCount} 人 <span>·</span> 被复用 {hero.reuseCount} 次</p>{hero.newResponseCount > 0 && <p className="experience-new"><Check size={13} aria-hidden="true" />今天补充了 {hero.newResponseCount} 条新经验</p>}<button type="button" className="experience-view" onClick={() => openAsset(hero.id)}>查看经验<ChevronRight size={15} aria-hidden="true" /></button></div>}
        {assets.slice(1).map(asset => <button type="button" key={asset.id} className="experience-compact" onClick={() => openAsset(asset.id)}><span className={`experience-initial ${asset.enabled && invitationsEnabled ? '' : 'is-paused'}`} aria-hidden="true">{asset.category.slice(0, 1)}</span><span className="experience-compact-info"><strong>{asset.title}</strong><small>{asset.category} · {invitationLabel(asset)}</small><span>帮助 {asset.helpedCount} 人 · 被复用 {asset.reuseCount} 次</span></span><ChevronRight size={16} aria-hidden="true" /></button>)}
      </section>
      <section className="experience-preferences" aria-labelledby="preferences-title"><h2 id="preferences-title">经验邀请</h2><div className="experience-setting"><span>接受经验邀请</span><InvitationSwitch label="接受经验邀请" checked={invitationsEnabled} onChange={() => { onToggleInvitations(); notify(invitationsEnabled ? '已暂停所有经验邀请，经验资产仍然保留。' : '已恢复经验邀请，单项设置保持不变。') }} /></div>{!invitationsEnabled && <p className="experience-paused-note">所有经验资产已暂停主动邀请。</p>}<button type="button" className="experience-limit" onClick={() => setDailyLimitOpen(true)}><span>每天最多</span><span>1 次<ChevronRight size={15} aria-hidden="true" /></span></button></section>
      <section className="experience-reuse" aria-labelledby="reuse-title"><h2 id="reuse-title"><RotateCcw size={16} aria-hidden="true" />你的经验正在被复用</h2><p>当新的问题已经能从你过去的回答中找到答案时，我们会优先复用，而不是再次打扰你。</p><div><span>{hero?.title ?? '已有经验'}</span><strong>已复用 {hero?.reuseCount ?? 0} 次</strong></div></section>
    </article>
    {viewMode === 'self' && <BottomNavigation current="experience" onNavigate={page => { if (page === 'ask') onAsk() }} />}
    {modalOpen && <dialog ref={dialogRef} className="experience-sheet" aria-labelledby="experience-sheet-title" onCancel={e => { e.preventDefault(); close() }} onClick={e => { if (e.target === e.currentTarget) close() }}><div className="experience-sheet-panel"><div className="experience-sheet-handle" aria-hidden="true" /><button type="button" className="experience-close" aria-label="关闭经验详情" onClick={close}><X size={20} /></button>
      <h2 id="experience-sheet-title">{active ? active.title : '每天最多 1 次'}</h2>
      {active ? <>
        <section><h3>AI 目前认为你经历过</h3><div className={`experience-tags ${editing ? 'is-editing' : ''}`}>{active.experiences.map(tag => editing ? <div className="experience-edit-tag" key={tag}><span>{tag}</span><span className="experience-retained"><Check size={12} aria-hidden="true" />保留</span><button type="button" aria-label={`移除「${tag}」`} onClick={() => { onRemoveTag(active.id, tag); notify(`已从这段经验中移除「${tag}」`); requestAnimationFrame(() => editRef.current?.focus({ preventScroll: true })) }}><X size={13} aria-hidden="true" />移除</button></div> : <span key={tag}>{tag}</span>)}</div>{!active.experiences.length && <p className="experience-muted">当前没有保留的经历标签。</p>}<button ref={editRef} type="button" className="experience-text-action" onClick={() => setEditing(!editing)}>{editing ? '完成修改' : '有一项不准确？'}</button></section>
        <section><h3>依据是什么？</h3><ul className="experience-evidence">{active.evidence.map((evidence, i) => <li key={`${evidence.type}-${i}`}><Check size={12} aria-hidden="true" />{evidence.label}</li>)}{active.newResponseCount > 0 && <li><Check size={12} aria-hidden="true" />本次主动回答 {active.newResponseCount} 条</li>}</ul><p className="experience-muted">已回答 {active.answerCount} 个问题 · 最近使用：{active.lastUsedAt}</p></section>
        <section className="experience-latest"><h3>最近补充的经验</h3>{active.recentResponses.length ? active.recentResponses.map(response => <div key={response.id} data-response-id={response.id}><p className="experience-response-question">{response.question}</p><blockquote>{response.selectedOption}</blockquote>{response.note && <p className="experience-response-note">{response.note}</p>}</div>) : <p className="experience-muted">本次还没有补充回答。</p>}</section>
        <details className="experience-explanation"><summary>为什么 AI 认为我有这段经验？<ChevronDown size={14} aria-hidden="true" /></summary><p>{active.explanation}</p>{active.newResponseCount > 0 && <p>你在本次体验中补充的回答，也已保留为这段经验的依据。</p>}{active.removedExperiences.length > 0 && <p>已按你的修正移除相关标签，历史依据仍然保留。</p>}</details>
        <div className="experience-setting"><span>接受相关经验邀请</span><InvitationSwitch label="接受相关经验邀请" checked={invitationsEnabled && active.enabled} disabled={!invitationsEnabled} onChange={() => toggleAsset(active)} /></div>{!invitationsEnabled && <p className="experience-paused-note">全局邀请已暂停，单项偏好仍保留。</p>}<p className="experience-boundary">兴趣、点赞和收藏不会直接成为你的经验。</p>
      </> : <p className="experience-limit-copy">为了减少打扰，目前每天最多收到 1 次经验邀请。</p>}
      {toast && <Toast message={toast} />}
    </div></dialog>}
    {toast && !modalOpen && <Toast message={toast} />}
  </>
}
