"use client"
import { useState } from "react"
import InlineOverrideField from "@/components/ui/InlineOverrideField"
import { getDaysRemaining, getDaysOverdue, calculatePriorityScore } from "@/lib/stage-engine/timer"

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

interface TimerPanelProps {
  caseId: string
  stage: string
  stageStartedAt: string
  stageDueAt: string
  onRefresh: () => void
}

export default function TimerPanel({
  caseId,
  stage,
  stageStartedAt,
  stageDueAt,
  onRefresh,
}: TimerPanelProps) {
  const dueDate = new Date(stageDueAt)
  const score = calculatePriorityScore(dueDate)
  const daysRemaining = getDaysRemaining(dueDate)
  const daysOverdue = getDaysOverdue(dueDate)

  async function saveDueDate(newValue: string, reason: string) {
    const parsed = new Date(newValue)
    if (isNaN(parsed.getTime())) throw new Error("Invalid date")
    const res = await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageDueAt: parsed.toISOString() }),
    })
    if (!res.ok) throw new Error("Failed to save")
    // Write audit log entry for the override
    await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastActionAt: new Date().toISOString() }),
    })
    onRefresh()
  }

  return (
    <div className="space-y-3" id="panel-timer">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-[#A0AEC0] uppercase tracking-wide mb-1">Stage Started</p>
          <p className="text-sm font-bold font-tabular text-[#2D3748]">{formatDate(stageStartedAt)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[#A0AEC0] uppercase tracking-wide mb-1">Due Date</p>
          <InlineOverrideField
            label=""
            value={new Date(stageDueAt).toISOString().slice(0, 10)}
            onSave={saveDueDate}
            formatDisplay={(v) => formatDate(new Date(v).toISOString())}
            inputType="date"
          />
        </div>
        <div>
          <p className="text-xs font-medium text-[#A0AEC0] uppercase tracking-wide mb-1">Status</p>
          <p
            className={`text-sm font-bold font-tabular ${
              daysOverdue > 0
                ? "text-[#E53E3E]"
                : score <= 1
                ? "text-[#DD6B20]"
                : "text-[#38A169]"
            }`}
          >
            {daysOverdue > 0
              ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`
              : score === 0
              ? "Due today"
              : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-[#A0AEC0] uppercase tracking-wide mb-1">Current Stage</p>
          <p className="text-sm font-bold text-[#2D3748]">{stage}</p>
        </div>
      </div>
    </div>
  )
}
