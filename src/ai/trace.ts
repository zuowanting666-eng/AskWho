import type { AgentStage } from './types'

export type AITrace = {
  id: string
  stage: AgentStage
  skill: string
  startedAt: string
  durationMs: number
  status: 'success' | 'error'
  inputSummary: string
  outputSummary: string
}

const traces: AITrace[] = []

export function traceExecution<T>(details: {
  stage: AgentStage
  skill: string
  inputSummary: string
  outputSummary: (result: T) => string
  execute: () => T
}): T {
  const startedAt = new Date().toISOString()
  const start = typeof performance === 'undefined' ? Date.now() : performance.now()
  try {
    const result = details.execute()
    const end = typeof performance === 'undefined' ? Date.now() : performance.now()
    traces.push({ id: `trace-${Date.now()}-${traces.length + 1}`, stage: details.stage, skill: details.skill, startedAt, durationMs: Math.max(0, Math.round((end - start) * 100) / 100), status: 'success', inputSummary: details.inputSummary, outputSummary: details.outputSummary(result) })
    return result
  } catch (error) {
    const end = typeof performance === 'undefined' ? Date.now() : performance.now()
    traces.push({ id: `trace-${Date.now()}-${traces.length + 1}`, stage: details.stage, skill: details.skill, startedAt, durationMs: Math.max(0, Math.round((end - start) * 100) / 100), status: 'error', inputSummary: details.inputSummary, outputSummary: error instanceof Error ? error.name : 'unknown error' })
    throw error
  }
}

export function getAITraces(): readonly AITrace[] { return [...traces] }
export function clearAITraces() { traces.length = 0 }
