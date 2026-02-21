"use client"
import { useState } from "react"
import type { CaseType, LeadSource } from "@/types"

const CASE_TYPES: CaseType[] = ["FTB", "HomeMover", "Remortgage", "BTL", "ProductSwitch", "Other"]

interface NewCaseModalProps {
  onClose: () => void
  onCreated: () => void
}

export default function NewCaseModal({ onClose, onCreated }: NewCaseModalProps) {
  const [clientName, setClientName] = useState("")
  const [caseType, setCaseType] = useState<CaseType>("Remortgage")
  const [leadSource, setLeadSource] = useState<LeadSource>("Direct")
  const [clientSummary, setClientSummary] = useState("")
  const [feeArrangement, setFeeArrangement] = useState("£200 advice + £150 admin")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  async function handleCreate() {
    if (!clientName.trim()) { setError("Client name is required"); return }
    setError("")
    setCreating(true)
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          caseType,
          leadSource,
          clientSummary: clientSummary.trim() || null,
          feeArrangement: feeArrangement.trim() || null,
        }),
      })
      if (!res.ok) { setError("Failed to create case"); return }
      onCreated()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-lg font-bold text-[#2D3748] mb-4">New Case</h2>

        <div className="space-y-4">
          {/* Client name */}
          <div>
            <label className="block text-sm font-medium text-[#2D3748] mb-1">
              Client Name <span className="text-[#E53E3E]">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. John & Jane Smith"
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
            />
          </div>

          {/* Case type */}
          <div>
            <label className="block text-sm font-medium text-[#2D3748] mb-1">
              Case Type
            </label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as CaseType)}
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
            >
              {CASE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Lead source toggle */}
          <div>
            <label className="block text-sm font-medium text-[#2D3748] mb-1">
              Lead Source
            </label>
            <div className="flex rounded overflow-hidden border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setLeadSource("Eileen")}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  leadSource === "Eileen"
                    ? "bg-[#4A90D9] text-white"
                    : "bg-white text-[#2D3748] hover:bg-gray-50"
                }`}
              >
                Eileen referral (70/30)
              </button>
              <button
                type="button"
                onClick={() => setLeadSource("Direct")}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  leadSource === "Direct"
                    ? "bg-[#4A90D9] text-white"
                    : "bg-white text-[#2D3748] hover:bg-gray-50"
                }`}
              >
                Direct to Helen (100/0)
              </button>
            </div>
          </div>

          {/* Client summary */}
          <div>
            <label className="block text-sm font-medium text-[#2D3748] mb-1">
              Client Summary
            </label>
            <textarea
              value={clientSummary}
              onChange={(e) => setClientSummary(e.target.value)}
              rows={4}
              placeholder="Brief overview of client situation, needs, timeline…"
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A90D9] resize-none"
            />
          </div>

          {/* Fee arrangement */}
          <div>
            <label className="block text-sm font-medium text-[#2D3748] mb-1">
              Fee Arrangement
            </label>
            <input
              type="text"
              value={feeArrangement}
              onChange={(e) => setFeeArrangement(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
            />
          </div>

          {error && <p className="text-sm text-[#E53E3E]">{error}</p>}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#2D3748] border border-[#E2E8F0] rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={creating}
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium bg-[#4A90D9] text-white rounded hover:bg-[#3a7bc8] transition-colors disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create Case"}
          </button>
        </div>
      </div>
    </div>
  )
}
