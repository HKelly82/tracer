"use client"
import CaseCard from "./CaseCard"
import type { CaseSummary, Stage } from "@/types"

export interface ColumnDef {
  label: string
  stages: Stage[]
}

interface KanbanColumnProps {
  column: ColumnDef
  cases: CaseSummary[]
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, column: ColumnDef) => void
}

export default function KanbanColumn({ column, cases, onDragStart, onDragOver, onDrop }: KanbanColumnProps) {
  const columnCases = cases.filter((c) => column.stages.includes(c.stage))
  const activeCases = columnCases.filter((c) => c.waitingOn === "Me" || c.daysOverdue > 0)
  const monitoringCases = columnCases.filter((c) => c.waitingOn !== "Me" && c.daysOverdue <= 0)
  const hasBothZones = activeCases.length > 0 && monitoringCases.length > 0

  return (
    <div
      className="flex-shrink-0 w-64 flex flex-col rounded-lg bg-[var(--color-dashboard-neutral-v2,#EEF1F6)]"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column)}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#2D3748]">{column.label}</span>
        <span className="text-xs font-medium text-[#A0AEC0] bg-white rounded-full px-2 py-0.5">
          {columnCases.length}
        </span>
      </div>

      {/* Cards area */}
      <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto min-h-[120px]">
        {/* Active zone */}
        {activeCases.map((c) => (
          <CaseCard key={c.id} caseData={c} onDragStart={onDragStart} />
        ))}

        {/* Divider */}
        {hasBothZones && (
          <div className="border-t border-dashed border-[#CBD5E0] my-1" />
        )}

        {/* Monitoring zone — dimmed */}
        {monitoringCases.map((c) => (
          <div key={c.id} style={{ opacity: 0.68 }}>
            <CaseCard caseData={c} onDragStart={onDragStart} />
          </div>
        ))}

        {columnCases.length === 0 && (
          <div className="text-xs text-[#CBD5E0] text-center py-6">No cases</div>
        )}
      </div>
    </div>
  )
}
