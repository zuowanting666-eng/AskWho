import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell mx-auto flex w-full max-w-[430px] flex-col">
      <main className="app-content">
        {children}
      </main>
    </div>
  )
}
