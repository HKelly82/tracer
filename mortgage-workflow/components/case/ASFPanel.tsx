"use client"
import { useState } from "react"
import Button from "@/components/ui/Button"

const SOURCE_OF_BUSINESS_OPTIONS = [
  "Existing client",
  "Referral — existing client",
  "Referral — professional",
  "Cold enquiry",
  "Website enquiry",
  "Other",
]

const PURPOSE_OPTIONS = [
  "Remortgage",
  "First-time buyer",
  "Home mover",
  "Buy-to-let",
  "Product switch",
  "Further advance",
  "Other",
]

const BORROWER_TYPE_OPTIONS = [
  "Sole",
  "Joint",
  "Limited company",
]

interface ASFDraftRecord {
  id: string
  vulnerableClient: boolean
  sourceOfBusiness: string | null
  purposeOfLoan: string | null
  borrowerType: string | null
  accountNumber: string | null
  approvedByUser: boolean
}

interface CommissionRecord {
  id: string
  helenSplitPercent: string | number
  eileenSplitPercent: string | number
  splitRuleApplied: string
  feeWaived: boolean
}

interface ASFPanelProps {
  caseId: string
  clientName: string
  existingDraft: ASFDraftRecord | null
  existingCommission: CommissionRecord | null
  onRefresh: () => void
}

export default function ASFPanel({
  caseId,
  clientName,
  existingDraft,
  existingCommission,
  onRefresh,
}: ASFPanelProps) {
  const [form, setForm] = useState({
    vulnerableClient: existingDraft?.vulnerableClient ?? false,
    sourceOfBusiness: existingDraft?.sourceOfBusiness ?? SOURCE_OF_BUSINESS_OPTIONS[0],
    purposeOfLoan: existingDraft?.purposeOfLoan ?? PURPOSE_OPTIONS[0],
    borrowerType: existingDraft?.borrowerType ?? BORROWER_TYPE_OPTIONS[0],
    accountNumber: existingDraft?.accountNumber ?? "",
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [approvalChecked, setApprovalChecked] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Commission override state
  const [showOverride, setShowOverride] = useState(false)
  const [overrideForm, setOverrideForm] = useState({
    helenSplitPercent: existingCommission ? String(Number(existingCommission.helenSplitPercent)) : "100",
    eileenSplitPercent: existingCommission ? String(Number(existingCommission.eileenSplitPercent)) : "0",
    reason: "",
  })
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)

  const draft = existingDraft
  const isApproved = draft?.approvedByUser === true
  const hasDraft = !!draft

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
    }
  }

  async function handleGenerate() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/asf/${caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? "Generation failed")
      } else {
        setApprovalChecked(false)
        onRefresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove() {
    if (!approvalChecked) return
    setApproving(true)
    setError(null)
    try {
      const res = await fetch(`/api/asf/${caseId}/approve`, { method: "POST" })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? "Approval failed")
      } else {
        onRefresh()
      }
    } finally {
      setApproving(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/asf/${caseId}/download`)
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? "Download failed")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const cd = res.headers.get("Content-Disposition") ?? ""
      const match = cd.match(/filename="([^"]+)"/)
      a.href = url
      a.download = match?.[1] ?? `ASF_${clientName}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleCommissionOverride() {
    const helen = Number(overrideForm.helenSplitPercent)
    const eileen = Number(overrideForm.eileenSplitPercent)
    if (Math.abs(helen + eileen - 100) > 0.01) {
      setOverrideError("Percentages must total 100")
      return
    }
    if (!overrideForm.reason.trim()) {
      setOverrideError("Please enter a reason")
      return
    }
    setOverrideSaving(true)
    setOverrideError(null)
    try {
      const res = await fetch(`/api/asf/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helenSplitPercent: helen,
          eileenSplitPercent: eileen,
          reason: overrideForm.reason,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        setOverrideError(j.error ?? "Override failed")
      } else {
        setShowOverride(false)
        onRefresh()
      }
    } finally {
      setOverrideSaving(false)
    }
  }

  const helenPct = existingCommission ? Number(existingCommission.helenSplitPercent) : 100
  const eileenPct = existingCommission ? Number(existingCommission.eileenSplitPercent) : 0
  const splitRule = existingCommission?.splitRuleApplied ?? "DefaultHelen100"

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-[#E53E3E] bg-red-50 border border-red-200 rounded p-2">{error}</p>
      )}

      {/* Form — shown when no draft or regenerating */}
      {(!hasDraft || isApproved) && (
        <div className="space-y-4">
          {/* Vulnerable client */}
          <label className="flex items-center gap-2 text-sm text-[#2D3748] cursor-pointer">
            <input
              type="checkbox"
              checked={form.vulnerableClient}
              onChange={(e) => setForm((f) => ({ ...f, vulnerableClient: e.target.checked }))}
              className="rounded border-[#E2E8F0]"
            />
            Vulnerable client
          </label>

          {/* Source of business */}
          <div>
            <label className="block text-xs font-medium text-[#2D3748] mb-1">Source of Business</label>
            <select
              value={form.sourceOfBusiness}
              onChange={field("sourceOfBusiness")}
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm text-[#2D3748] bg-white"
            >
              {SOURCE_OF_BUSINESS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Purpose of loan */}
          <div>
            <label className="block text-xs font-medium text-[#2D3748] mb-1">Purpose of Loan</label>
            <select
              value={form.purposeOfLoan}
              onChange={field("purposeOfLoan")}
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm text-[#2D3748] bg-white"
            >
              {PURPOSE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Borrower type */}
          <div>
            <label className="block text-xs font-medium text-[#2D3748] mb-1">Type of Borrower</label>
            <select
              value={form.borrowerType}
              onChange={field("borrowerType")}
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm text-[#2D3748] bg-white"
            >
              {BORROWER_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Account number (optional) */}
          <div>
            <label className="block text-xs font-medium text-[#2D3748] mb-1">Account Number <span className="text-[#A0AEC0]">(optional — enter post-application)</span></label>
            <input
              type="text"
              value={form.accountNumber}
              onChange={field("accountNumber")}
              placeholder="e.g. 12345678"
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm text-[#2D3748]"
            />
          </div>

          <Button variant="primary" onClick={handleGenerate} disabled={saving}>
            {saving ? "Generating…" : hasDraft ? "Regenerate ASF" : "Generate ASF"}
          </Button>
        </div>
      )}

      {/* Approval gate — draft exists, not approved */}
      {hasDraft && !isApproved && (
        <div className="space-y-3 p-4 bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-sm font-medium text-[#2D3748]">ASF generated</p>
          <p className="text-xs text-[#A0AEC0]">Review the details below before approving for export.</p>

          {/* Summary */}
          <div className="space-y-1 text-sm text-[#2D3748]">
            <p><span className="text-[#A0AEC0] mr-2">Vulnerable client:</span>{draft.vulnerableClient ? "Yes" : "No"}</p>
            <p><span className="text-[#A0AEC0] mr-2">Source:</span>{draft.sourceOfBusiness}</p>
            <p><span className="text-[#A0AEC0] mr-2">Purpose:</span>{draft.purposeOfLoan}</p>
            <p><span className="text-[#A0AEC0] mr-2">Borrower type:</span>{draft.borrowerType}</p>
            {draft.accountNumber && (
              <p><span className="text-[#A0AEC0] mr-2">Account number:</span>{draft.accountNumber}</p>
            )}
          </div>

          {/* Commission display */}
          <div className="mt-2 p-3 bg-[#F7FAFC] border border-[#E2E8F0] rounded text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-[#2D3748]">Commission split</span>
              {!showOverride && (
                <button
                  onClick={() => setShowOverride(true)}
                  className="text-xs text-[#4A90D9] hover:underline"
                >
                  Override
                </button>
              )}
            </div>
            <p className="text-[#2D3748]">Helen Kelly: {helenPct}% &nbsp;·&nbsp; Eileen Kelly: {eileenPct}%</p>
            {splitRule === "ManualOverride" && (
              <p className="text-xs text-[#DD6B20] mt-1">⚠ Manual override applied</p>
            )}
          </div>

          {/* Override form */}
          {showOverride && (
            <div className="p-3 bg-[#FFFAF0] border border-[#DD6B20] rounded space-y-2">
              {overrideError && <p className="text-xs text-[#E53E3E]">{overrideError}</p>}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#2D3748] mb-1">Helen %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={overrideForm.helenSplitPercent}
                    onChange={(e) => setOverrideForm((f) => ({ ...f, helenSplitPercent: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#2D3748] mb-1">Eileen %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={overrideForm.eileenSplitPercent}
                    onChange={(e) => setOverrideForm((f) => ({ ...f, eileenSplitPercent: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <textarea
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
                placeholder="Reason for override…"
                className="w-full border border-[#E2E8F0] rounded px-2 py-1 text-sm resize-none"
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowOverride(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleCommissionOverride} disabled={overrideSaving}>
                  {overrideSaving ? "Saving…" : "Save Override"}
                </Button>
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm text-[#2D3748] cursor-pointer">
            <input
              type="checkbox"
              checked={approvalChecked}
              onChange={(e) => setApprovalChecked(e.target.checked)}
              className="mt-0.5 rounded border-[#E2E8F0]"
            />
            I confirm this ASF reflects the mortgage and client details correctly.
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleGenerate} disabled={saving}>
              {saving ? "Regenerating…" : "Regenerate"}
            </Button>
            <Button variant="primary" onClick={handleApprove} disabled={!approvalChecked || approving}>
              {approving ? "Approving…" : "Approve"}
            </Button>
          </div>
        </div>
      )}

      {/* Approved — download available */}
      {isApproved && (
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#38A169]">✓ Approved</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleGenerate} disabled={saving}>
              {saving ? "Regenerating…" : "Regenerate"}
            </Button>
            <Button variant="primary" onClick={handleDownload} disabled={downloading}>
              {downloading ? "Downloading…" : "Download .docx"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
