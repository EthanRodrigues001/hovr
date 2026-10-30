import type { ReactNode } from 'react'
import type { HistoryReport } from '../../../shared/history'

/** Shared loading / failed / empty handling for the tabs that read the session logs. */
export function ReportGate({
  report,
  children
}: {
  report: HistoryReport | null | 'failed'
  children: (report: HistoryReport) => ReactNode
}) {
  if (report === 'failed') return <div className="an-empty"><p>Could not read the session logs.</p></div>
  if (report === null) {
    return (
      <div className="an-empty">
        <p>Reading session logs…</p>
        <p className="muted">The first scan can take a few seconds.</p>
      </div>
    )
  }
  if (report.providersScanned.length === 0) {
    return (
      <div className="an-empty">
        <p>No Claude Code, Codex or Antigravity session logs were found in this period.</p>
        <p className="muted">Spend and activity are read from ~/.claude/projects, ~/.codex/sessions and ~/.gemini/antigravity.</p>
      </div>
    )
  }
  return <>{children(report)}</>
}
