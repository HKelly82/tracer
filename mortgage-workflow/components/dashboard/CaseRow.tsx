"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import StatusBadge from "@/components/ui/StatusBadge"
import DueDateTooltip from "./DueDateTooltip"
import ConfirmModal from "@/components/ui/ConfirmModal"
import { getHeatmapBorder, getRowBackground, getPrimaryAction } from "@/lib/stage-engine/priority"
import type { CaseSummary } from "@/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

interface CaseRowProps {
  row: CaseSummary
  onChaseModal: (caseId: string) => void
  onRefresh: () => void
}

export default function CaseRow({ row, onChaseModal, onRefresh }: CaseRowProps) {
  const router = useRouter()
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const stageDueAt = new Date(row.stageDueAt)
  const heatmap = getHeatmapBorder(stageDueAt, row.status)
  const rowBg = getRowBackground(stageDueAt, row.status)
  const primaryAction = getPrimaryAction(row.stage)

  async function runAction(action: string) {
    setLoading(true)
    try {
      await fetch(`/api/cases/${row.id}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  function handleActionClick() {
    if (primaryAction.action === "open_chase_modal") {
      onChaseModal(row.id)
      return
    }
    if (primaryAction.action === "open_case") {
      router.push(`/cases/${row.id}`)
      return
    }
    setConfirmAction(primaryAction.action)
  }

  return (
    <>
      <tr
        className={`${rowBg} cursor-pointer hover:brightness-95 transition-all`}
        onClick={() => router.push(`/cases/${row.id}`)}
      >
        {/* Heatmap strip — leftmost cell, no padding, 4px wide */}
        <td className={`w-1 p-0 ${heatmap}`} />

        {/* Client name */}
        <td className="px-4 py-3 text-sm font-bold text-[#2D3748]">{row.clientName}</td>

        {/* Stage */}
        <td className="px-4 py-3">
          <StatusBadge stage={row.stage} />
        </td>

        {/* Due Date with tooltip */}
        <td className="px-4 py-3 text-sm font-tabular text-[#2D3748]">
          <DueDateTooltip stageDueAt={stageDueAt} stage={row.stage}>
            <span className="underline decoration-dotted cursor-help">
              {formatDate(row.stageDueAt)}
            </span>
          </DueDateTooltip>
        </td>

        {/* Days remaining / overdue */}
        <td className="px-4 py-3 text-sm font-tabular font-bold">
          {row.daysOverdue > 0 ? (
            <span className="text-[#E53E3E]">-{row.daysOverdue}d</span>
          ) : row.daysRemaining === 0 ? (
            <span className="text-[#DD6B20]">Today</span>
          ) : (
            <span className="text-[#38A169]">{row.daysRemaining}d</span>
          )}
        </td>

        {/* Action button */}
        <td
          className="px-4 py-3 text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            disabled={loading}
            onClick={handleActionClick}
            className="px-3 py-1.5 text-xs font-medium bg-[#4A90D9] text-white rounded hover:bg-[#3a7bc8] transition-colors disabled:opacity-50"
          >
            {loading ? "…" : primaryAction.label}
          </button>
        </td>
      </tr>

      {confirmAction && (
        <tr>
          <td colSpan={6} className="p-0">
            <ConfirmModal
              message={`Are you sure you want to: ${primaryAction.label}?`}
              onConfirm={async () => {
                setConfirmAction(null)
                await runAction(confirmAction)
              }}
              onCancel={() => setConfirmAction(null)}
            />
          </td>
        </tr>
      )}
    </>
  )
}
