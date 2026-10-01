import { Layers2, PenLine } from 'lucide-react'

export function BottomNavigation({ current, onNavigate }: { current: 'ask' | 'experience'; onNavigate: (page: 'ask' | 'experience') => void }) {
  return (
    <nav className="bottom-navigation" aria-label="主导航">
      <button type="button" className={`nav-item ${current === 'ask' ? 'is-current' : ''}`} aria-current={current === 'ask' ? 'page' : undefined} onClick={() => onNavigate('ask')}>
        <span className="nav-icon"><PenLine size={21} strokeWidth={1.8} aria-hidden="true" /></span>
        <span>提问</span>
      </button>
      <button type="button" className={`nav-item ${current === 'experience' ? 'is-current' : ''}`} aria-current={current === 'experience' ? 'page' : undefined} onClick={() => onNavigate('experience')}>
        <span className="nav-icon"><Layers2 size={21} strokeWidth={1.8} aria-hidden="true" /></span>
        <span>我的经验</span>
      </button>
    </nav>
  )
}
