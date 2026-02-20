"use client"
import { useState } from "react"

interface AuditEvent {
  id: string
  eventType: string
  createdAt: string
  fieldKey?: string | null
  oldValue?: string | null
  newValue?: string | null
  reason?: string | null
}

const EVENT_LABELS: Record<string, string> = {
  StageChanged: "Stage Changed",
  FieldConfirmed: "Field Confirmed",
  FieldOverridden: "Field Overridden",
  DateOverridden: "Date Overridden",
  DraftGenerated: "Draft Generated",
  DraftRegenerated: "Draft Regenerated",
  OfferMismatchAcknowledged: "Offer Mismatch Acknowledged",
  CaseClosed: "Case Closed",
  CaseReopened: "Case Reopened",
  CommissionOverridden: "Commission Overridden",
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface AuditEventRowProps {
  event: AuditEvent
}

function AuditEventRow({ event }: AuditEventRowProps) {
  const [expanded, setExpanded] = useState(false)
  const label = EVENT_LABELS[event.eventType] ?? event.eventType
  const hasDetail = !!(event.fieldKey || (event.oldValue && event.newValue) || event.reason)

  return (
    <li className="border-l-2 border-[#E2E8F0] pl-3 py-1">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => hasDetail && setExpanded((e) => !e)}
      >
        <div>
          <span className="text-xs font-medium text-[#2D3748]">{label}</span>
          {event.fieldKey && (
            <span className="ml-1 text-xs text-[#A0AEC0]">· {event.fieldKey}</span>
          )}
          <span className="block text-xs text-[#A0AEC0]">{formatTimestamp(event.createdAt)}</span>
        </div>
        {hasDetail && (
          <span className="text-xs text-[#A0AEC0] select-none">{expanded ? "▲" : "▼"}</span>
        )}
      </div>

      {expanded && hasDetail && (
        <div className="mt-1 space-y-0.5 text-xs text-[#2D3748]">
          {event.oldValue && event.newValue && (
            <p>
              <span className="text-[#A0AEC0]">Changed: </span>
              <span className="font-tabular">{event.oldValue}</span>
              <span className="text-[#A0AEC0]"> → </span>
              <span className="font-tabular">{event.newValue}</span>
            </p>
          )}
          {!event.oldValue && event.newValue && (
            <p>
              <span className="text-[#A0AEC0]">Value: </span>
              <span className="font-tabular">{event.newValue}</span>
            </p>
          )}
          {event.reason && (
            <p>
              <span className="text-[#A0AEC0]">Reason: </span>
              {event.reason}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

interface AuditSummaryProps {
  events: AuditEvent[]
}

export default function AuditSummary({ events }: AuditSummaryProps) {
  if (events.length === 0) {
    return <p className="text-sm text-[#A0AEC0]">No audit events yet.</p>
  }

  // Reverse chronological order
  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <ul className="space-y-2">
      {sorted.map((e) => (
        <AuditEventRow key={e.id} event={e} />
      ))}
    </ul>
  )
}
