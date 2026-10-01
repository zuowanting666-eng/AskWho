import { ArrowRight, Footprints, Quote, UsersRound } from 'lucide-react'
import { BottomNavigation } from '../components/BottomNavigation'
import { QuestionInput } from '../components/QuestionInput'

const examples = [
  { category: '出发之前', tone: 'blue', text: '第一次自己去海外看演唱会，散场安全吗？' },
  { category: '换条路走', tone: 'yellow', text: '有没有从游戏运营转 AI 产品的人？' },
  { category: '日常小事', tone: 'coral', text: '小个子肩宽，这件大衣实际穿起来会压身高吗？' },
]

type AskPageProps = {
  question: string
  onQuestionChange: (question: string) => void
  onSubmit: () => void
  onExperience: () => void
}

export function AskPage({ question, onQuestionChange, onSubmit, onExperience }: AskPageProps) {
  return (
    <>
      <div className="brand" aria-label="问对 AskWho">
        <span className="brand-mark" aria-hidden="true">问<span /></span>
        <span className="brand-name">问对 <span>AskWho</span></span>
      </div>
      <section className="ask-hero" aria-labelledby="ask-title">
        <div className="hero-kicker"><span />生活的答案，在人的经历里</div>
        <h1 id="ask-title"><span className="hero-opening">有些问题，</span><br />不该只问 <span className="hero-ai">AI<svg viewBox="0 0 75 12" aria-hidden="true"><path d="M3 8 Q34 0 71 6" /></svg></span></h1>
        <p className="hero-subtitle">去问<span>真正经历过</span>的人。</p>
        <div className="experience-path" aria-hidden="true">
          <span className="path-question"><Quote size={17} /><span>你的问题</span></span>
          <span className="path-link"><ArrowRight size={16} /></span>
          <span className="path-experience"><Footprints size={17} /><span>相似经历</span></span>
          <span className="path-link"><ArrowRight size={16} /></span>
          <span className="path-person"><UsersRound size={17} /><span>经历过的人</span></span>
        </div>
        <p className="hero-explanation">说出搜索框装不下的困惑，<br />AI 帮你找到<span>真正经历过的人</span>。</p>
      </section>
      <QuestionInput question={question} onQuestionChange={onQuestionChange} onSubmit={onSubmit} />
      <section className="question-examples" aria-labelledby="examples-title">
        <div className="examples-heading">
          <h2 id="examples-title">也可以这样问</h2>
          <span>每一种生活，都有过来人</span>
        </div>
        <ul>
          {examples.map((example) => (
            <li key={example.category}>
              <span className={`example-label ${example.tone}`}>{example.category}</span>
              <p>{example.text}</p>
            </li>
          ))}
        </ul>
      </section>
      <BottomNavigation current="ask" onNavigate={page => { if (page === 'experience') onExperience() }} />
    </>
  )
}
