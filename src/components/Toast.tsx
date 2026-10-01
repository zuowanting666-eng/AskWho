export function Toast({ message }: { message: string }) {
  return <div className="understand-toast" role="status" aria-live="polite">{message}</div>
}
