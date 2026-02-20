"use client"
import { useState } from "react"
import CaseRow from "./CaseRow"
import ConfirmModal from "@/components/ui/ConfirmModal"
import type { CaseSummary } from "@/types"

const CHASE_OPTIONS = [
  { label: "Case Started → DIP", action: "chase_to_dip" },
  { label: "No Response (+2 days)", action: "chase_no_response" },
  { label: "Lead Cold → Close", action: "chase_cold_close" },
]

interface CaseTableProps {
  cases: CaseSummary[]
  onRefresh: () => void
}

export default function CaseTable({ cases, onRefresh }: CaseTableProps) {
  const [chaseModalCaseId, setChaseModalCaseId] = useState<string | null>(null)
  const [chaseLoading, setChaseLoading] = useState(false)

  async function runChaseAction(caseId: string, action: string) {
    setChaseLoading(true)
    try {
      await fetch(`/api/cases/${caseId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      onRefresh()
    } finally {
      setChaseLoading(false)
      setChaseModalCaseId(null)
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
        <table className="w-full border-collapse bg-[#FAFAF8]">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="w-1" />
              <th className="px-4 py-3 text-left text-xs font-medium text-[#A0AEC0] uppercase tracking-wide">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#A0AEC0] uppercase tracking-wide">Stage</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#A0AEC0] uppercase tracking-wide">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#A0AEC0] uppercase tracking-wide">Days</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#A0AEC0] uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {cases.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#A0AEC0]">
                  No active cases. Create one to get started.
                </td>
              </tr>
            )}
            {cases.map((c) => (
              <CaseRow
                key={c.id}
                row={c}
                onChaseModal={(id) => setChaseModalCaseId(id)}
                onRefresh={onRefresh}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Chase Client modal */}
      {chaseModalCaseId && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold text-[#2D3748] mb-4">Chase Client</h2>
            <p className="text-sm text-[#A0AEC0] mb-4">Choose the outcome of the chase:</p>
            <div className="space-y-2">
              {CHASE_OPTIONS.map((opt) => (
                <button
                  key={opt.action}
                  disabled={chaseLoading}
                  onClick={() => runChaseAction(chaseModalCaseId, opt.action)}
                  className="w-full text-left px-4 py-3 border border-[#E2E8F0] rounded text-sm font-medium text-[#2D3748] hover:bg-[#E8EDF5] transition-colors disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setChaseModalCaseId(null)}
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
