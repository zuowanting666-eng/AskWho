import { ArrowUpRight, PencilLine } from 'lucide-react'

type QuestionInputProps = {
  question: string
  onQuestionChange: (question: string) => void
  onSubmit: () => void
}

export function QuestionInput({ question, onQuestionChange, onSubmit }: QuestionInputProps) {
  return (
    <form className="question-editor" onSubmit={(event) => {
      event.preventDefault()
      if (question.trim()) onSubmit()
    }}>
      <div className="editor-heading">
        <label htmlFor="question"><PencilLine size={16} aria-hidden="true" />说说你的情况</label>
        <span className="editor-note">从生活里出发</span>
      </div>
      <textarea
        id="question"
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        aria-describedby="question-hint"
        placeholder="最近，有什么想问经历过的人的事？"
      />
      <p id="question-hint" className="editor-hint">把你的情况告诉我就好，不需要整理关键词。</p>
      <button className="question-submit" type="submit" disabled={!question.trim()}>
        <span>帮我问对的人</span>
        <ArrowUpRight size={23} aria-hidden="true" />
      </button>
    </form>
  )
}
