"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import StatusBadge from "@/components/ui/StatusBadge"
import ConfirmModal from "@/components/ui/ConfirmModal"
import { getPrimaryAction } from "@/lib/stage-engine/priority"
import { getDaysRemaining, getDaysOverdue, calculatePriorityScore } from "@/lib/stage-engine/timer"
import type { Stage } from "@/types"

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

interface StageHeaderProps {
  caseId: string
  clientName: string
  stage: Stage
  stageVariant?: string | null
  stageDueAt: string
  onRefresh: () => void
}

const CHASE_OPTIONS = [
  { label: "Case Started → DIP", action: "chase_to_dip" },
  { label: "No Response (+2 days)", action: "chase_no_response" },
  { label: "Lead Cold → Close", action: "chase_cold_close" },
]

export default function StageHeader({
  caseId,
  clientName,
  stage,
  stageVariant,
  stageDueAt,
  onRefresh,
}: StageHeaderProps) {
  const router = useRouter()
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [showChaseModal, setShowChaseModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const dueDate = new Date(stageDueAt)
  const score = calculatePriorityScore(dueDate)
  const daysRemaining = getDaysRemaining(dueDate)
  const daysOverdue = getDaysOverdue(dueDate)
  const primaryAction = getPrimaryAction(stage)

  async function runAction(action: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        onRefresh()
        if (action === "chase_cold_close") {
          router.push("/dashboard")
        }
      }
    } finally {
      setLoading(false)
    }
  }

  function handlePrimaryClick() {
    if (primaryAction.action === "open_chase_modal") {
      setShowChaseModal(true)
    } else if (primaryAction.action === "open_case") {
      // already on case view
    } else {
      setConfirmAction(primaryAction.action)
    }
  }

  return (
    <>
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#2D3748]">{clientName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge stage={stage} />
              {stageVariant && (
                <span className="text-xs text-[#A0AEC0]">({stageVariant})</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#A0AEC0] font-medium">Due Date</p>
            <p className="text-sm font-bold font-tabular text-[#2D3748]">
              {formatDate(dueDate)}
            </p>
            <p className={`text-xs font-tabular mt-0.5 ${
              daysOverdue > 0 ? "text-[#E53E3E]" : score <= 1 ? "text-[#DD6B20]" : "text-[#38A169]"
            }`}>
              {daysOverdue > 0
                ? `${daysOverdue}d overdue`
                : score === 0
                ? "Due today"
                : `${daysRemaining}d remaining`}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <button
            disabled={loading || primaryAction.action === "open_case"}
            onClick={handlePrimaryClick}
            className="px-4 py-2 text-sm font-medium bg-[#4A90D9] text-white rounded hover:bg-[#3a7bc8] transition-colors disabled:opacity-50"
          >
            {loading ? "Processing…" : primaryAction.label}
          </button>
        </div>
      </div>

      {confirmAction && (
        <ConfirmModal
          message={`Are you sure you want to: ${primaryAction.label}?`}
          onConfirm={async () => {
            setConfirmAction(null)
            await runAction(confirmAction)
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {showChaseModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold text-[#2D3748] mb-4">Chase Client</h2>
            <p className="text-sm text-[#A0AEC0] mb-4">Choose the outcome of the chase:</p>
            <div className="space-y-2">
              {CHASE_OPTIONS.map((opt) => (
                <button
                  key={opt.action}
                  disabled={loading}
                  onClick={async () => {
                    setShowChaseModal(false)
                    await runAction(opt.action)
                  }}
                  className="w-full text-left px-4 py-3 border border-[#E2E8F0] rounded text-sm font-medium text-[#2D3748] hover:bg-[#E8EDF5] transition-colors disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowChaseModal(false)}
              className="mt-4 w-full text-sm text-[#A0AEC0] hover:text-[#2D3748] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
