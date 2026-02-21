"use client"
import { useState, useCallback } from "react"
import KanbanColumn from "./KanbanColumn"
import type { ColumnDef } from "./KanbanColumn"
import type { CaseSummary, Stage } from "@/types"

const COLUMNS: ColumnDef[] = [
  { label: "Lead",              stages: ["Lead"] },
  { label: "Research",          stages: ["Research"] },
  { label: "Client Response",   stages: ["ClientResponse", "ChaseClient"] },
  { label: "DIP / Application", stages: ["DIP"] },
  { label: "NB Submission",     stages: ["AwaitingNB", "NBSubmitted", "PostDIPChase"] },
  { label: "Lender Processing", stages: ["LenderProcessing"] },
  { label: "Offered",           stages: ["Offered"] },
  { label: "Completed",         stages: ["Completed", "Closed"] },
]

// Map column to the primary stage used when dropping a card into it
const COLUMN_DROP_STAGE: Record<string, Stage> = {
  "Lead":              "Lead",
  "Research":          "Research",
  "Client Response":   "ClientResponse",
  "DIP / Application": "DIP",
  "NB Submission":     "AwaitingNB",
  "Lender Processing": "LenderProcessing",
  "Offered":           "Offered",
  "Completed":         "Completed",
}

// Map of stage transitions that have dedicated actions (preferred over stage_override)
const STAGE_ACTION_MAP: Record<string, string> = {
  "Research→ChaseClient": "research_complete",
  "ChaseClient→DIP":      "chase_to_dip",
  "DIP→PostDIPChase":     "dip_to_post_dip_chase",
  "DIP→AwaitingNB":       "dip_complete",
  "AwaitingNB→NBSubmitted": "nb_submitted",
}

interface KanbanBoardProps {
  cases: CaseSummary[]
  onRefresh: () => void
}

export default function KanbanBoard({ cases, onRefresh }: KanbanBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, column: ColumnDef) => {
    e.preventDefault()
    const caseId = e.dataTransfer.getData("text/plain") || dragId
    if (!caseId) return

    const caseData = cases.find((c) => c.id === caseId)
    if (!caseData) return

    // Already in this column?
    if (column.stages.includes(caseData.stage)) {
      setDragId(null)
      return
    }

    const targetStage = COLUMN_DROP_STAGE[column.label]
    if (!targetStage) { setDragId(null); return }

    // Check if there's a dedicated transition action
    const transitionKey = `${caseData.stage}→${targetStage}`
    const dedicatedAction = STAGE_ACTION_MAP[transitionKey]

    try {
      const res = await fetch(`/api/cases/${caseId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          dedicatedAction
            ? { action: dedicatedAction }
            : { action: "stage_override", stage: targetStage }
        ),
      })
      if (res.ok) {
        onRefresh()
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setDragId(null)
    }
  }, [cases, dragId, onRefresh])

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 180px)" }}>
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.label}
          column={col}
          cases={cases}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}
    </div>
  )
}
