import { MousePointerClick, AlertTriangle, RotateCw, Plus } from "lucide-react"
import type { CaseSummary } from "@/types"

interface DashboardHeaderProps {
  cases: CaseSummary[]
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  refreshing: boolean
  onNewCase: () => void
}

export default function DashboardHeader({
  cases, search, onSearchChange, onRefresh, refreshing, onNewCase,
}: DashboardHeaderProps) {
  const actionNeeded = cases.filter((c) => c.waitingOn === "Me").length
  const overdue = cases.filter((c) => c.daysOverdue > 0).length

  return (
    <div className="flex items-center justify-between mb-4 px-2">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-[#2D3748]">Cases</h1>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-[#3182CE]">
            <MousePointerClick size={14} />
            {actionNeeded} action needed
          </span>
          {overdue > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-[#E53E3E]">
              <AlertTriangle size={14} />
              {overdue} overdue
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search clients…"
          className="border border-[#E2E8F0] rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
        />
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="p-2 text-[#4A90D9] border border-[#4A90D9] rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RotateCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button
          onClick={onNewCase}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#4A90D9] text-white rounded hover:bg-[#3a7bc8] transition-colors"
        >
          <Plus size={16} />
          New Case
        </button>
      </div>
    </div>
  )
}
