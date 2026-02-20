"use client"
import { useState } from "react"
import Button from "@/components/ui/Button"
import { JUSTIFICATION_PRESETS } from "@/lib/documents/suitability-generator"

// Human-readable labels for ObjectiveCategory enum
const OBJECTIVE_LABELS: Record<string, string> = {
  RateSecurity: "Rate Security",
  ReducePayment: "Reduce Monthly Payment",
  RaiseCapital: "Raise Capital",
  ShortenTerm: "Shorten Term",
  DebtConsolidation: "Debt Consolidation",
  ProductSwitch: "Product Switch",
  Other: "Other",
}

const PRESET_LABELS: Record<string, string> = {
  rate_security_5yr: "Rate security — 5-year fixed",
  rate_security_2yr: "Rate security — 2-year fixed",
  reduce_payment: "Reduce monthly payment",
  product_switch: "Product switch / rate expiry",
  remortgage_better_rate: "Remortgage — better rate",
  flexibility_review: "Flexibility / term review",
}

interface SuitabilityDraftRecord {
  id: string
  objectiveCategory: string
  objectiveNotes: string | null
  justificationMode: string
  presetJustificationKey: string | null
  manualJustificationText: string | null
  affordabilitySummary: string
  riskSummary: string
  includePortabilitySection: boolean
  includeOverpaymentSection: boolean
  includeAlternativeProducts: boolean
  staleDueToInputChange: boolean
  approvedByUser: boolean
}

interface IllustrationSnapshotMin {
  portability: boolean
  overpaymentPercent: unknown
}

interface SuitabilityPanelProps {
  caseId: string
  clientName: string
  existingDraft: SuitabilityDraftRecord | null
  illustrationSnapshot: IllustrationSnapshotMin | null
  onRefresh: () => void
}

export default function SuitabilityPanel({
  caseId,
  clientName,
  existingDraft,
  illustrationSnapshot,
  onRefresh,
}: SuitabilityPanelProps) {
  const [form, setForm] = useState({
    objectiveCategory: existingDraft?.objectiveCategory ?? "RateSecurity",
    objectiveNotes: existingDraft?.objectiveNotes ?? "",
    justificationMode: existingDraft?.justificationMode ?? "Preset",
    presetJustificationKey: existingDraft?.presetJustificationKey ?? "rate_security_5yr",
    manualJustificationText: existingDraft?.manualJustificationText ?? "",
    customReasonText: "",
    affordabilitySummary: existingDraft?.affordabilitySummary ?? "",
    riskSummary: existingDraft?.riskSummary ?? "",
    includePortabilitySection: existingDraft?.includePortabilitySection ?? !!illustrationSnapshot?.portability,
    includeOverpaymentSection: existingDraft?.includeOverpaymentSection ?? illustrationSnapshot?.overpaymentPercent != null,
    includeAlternativeProducts: existingDraft?.includeAlternativeProducts ?? false,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [approvalChecked, setApprovalChecked] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const draft = existingDraft
  const isStale = draft?.staleDueToInputChange === true
  const isApproved = draft?.approvedByUser === true
  const hasDraft = !!draft && !isStale

  // ── Form state helpers ──
  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
    }
  }
  function checkbox(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.checked }))
    }
  }

  // ── Generate / Regenerate ──
  async function handleGenerate() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/suitability/${caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectiveCategory: form.objectiveCategory,
          objectiveNotes: form.objectiveNotes,
          justificationMode: form.justificationMode,
          presetJustificationKey: form.justificationMode === "Preset" ? form.presetJustificationKey : null,
          manualJustificationText: form.justificationMode === "Manual" ? form.manualJustificationText : form.customReasonText || null,
          affordabilitySummary: form.affordabilitySummary,
          riskSummary: form.riskSummary,
          includePortabilitySection: form.includePortabilitySection,
          includeOverpaymentSection: form.includeOverpaymentSection,
          includeAlternativeProducts: form.includeAlternativeProducts,
        }),
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

  // ── Approve ──
  async function handleApprove() {
    if (!approvalChecked) return
    setApproving(true)
    setError(null)
    try {
      const res = await fetch(`/api/suitability/${caseId}/approve`, { method: "POST" })
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

  // ── Download ──
  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/suitability/${caseId}/download`)
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
      a.download = match?.[1] ?? `Suitability_Letter_${clientName}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  // ── Stale banner ──
  const StaleBanner = () => (
    <div className="flex items-center justify-between gap-4 p-3 bg-[#F5F0E8] border border-[#DD6B20] rounded-lg mb-4">
      <p className="text-sm text-[#2D3748]">
        ⚠️ Illustration data has changed since this letter was generated. Regenerate before exporting.
      </p>
      <Button variant="primary" onClick={handleGenerate} disabled={saving}>
        {saving ? "Regenerating…" : "Regenerate Now"}
      </Button>
    </div>
  )

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-[#E53E3E] bg-red-50 border border-red-200 rounded p-2">{error}</p>
      )}

      {/* Stale banner — always shown when stale */}
      {isStale && <StaleBanner />}

      {/* Form — shown when no draft, or stale (need to regenerate) */}
      {(!hasDraft || isStale) && (
        <div className="space-y-4">
          {/* Objective category */}
          <div>
            <label className="block text-xs font-medium text-[#2D3748] mb-1">Objective Category</label>
            <select
              value={form.objectiveCategory}
              onChange={field("objectiveCategory")}
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm text-[#2D3748] bg-white"
            >
              {Object.entries(OBJECTIVE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Objective notes */}
          <div>
            <label className="block text-xs font-medium text-[#2D3748] mb-1">Objective Notes</label>
            <textarea
              value={form.objectiveNotes}
              onChange={field("objectiveNotes")}
              rows={3}
              placeholder="Summarise client's mortgage objectives in their own words"
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm text-[#2D3748] resize-none"
            />
          </div>

          {/* Justification mode toggle */}
          <div>
            <label className="block text-xs font-medium text-[#2D3748] mb-1">Justification Mode</label>
            <div className="flex gap-2">
              {["Preset", "Manual"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setForm((f) => ({ ...f, justificationMode: mode }))}
                  className={`px-4 py-1.5 text-sm rounded border transition-colors ${
                    form.justificationMode === mode
                      ? "bg-[#4A90D9] text-white border-[#4A90D9]"
                      : "bg-white text-[#2D3748] border-[#E2E8F0] hover:border-[#4A90D9]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {form.justificationMode === "Preset" && (
              <div className="mt-2 space-y-2">
                <select
                  value={form.presetJustificationKey}
                  onChange={field("presetJustificationKey")}
                  className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm text-[#2D3748] bg-white"
                >
                  {Object.entries(PRESET_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                {form.presetJustificationKey && JUSTIFICATION_PRESETS[form.presetJustificationKey]?.includes("{{custom_reason}}") && (
                  <textarea
                    value={form.customReasonText}
                    onChange={field("customReasonText")}
                    rows={2}
                    placeholder="Custom reason to complete the justification…"
                    className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm text-[#2D3748] resize-none"
                  />
                )}
              </div>
            )}

            {form.justificationMode === "Manual" && (
              <textarea
                value={form.manualJustificationText}
                onChange={field("manualJustificationText")}
                rows={4}
                placeholder="Full justification text…"
                className="w-full mt-2 border border-[#E2E8F0] rounded px-3 py-2 text-sm text-[#2D3748] resize-none"
              />
            )}
          </div>

          {/* Affordability */}
          <div>
            <label className="block text-xs font-medium text-[#2D3748] mb-1">Affordability Summary</label>
            <textarea
              value={form.affordabilitySummary}
              onChange={field("affordabilitySummary")}
              rows={3}
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm text-[#2D3748] resize-none"
            />
          </div>

          {/* Risk */}
          <div>
            <label className="block text-xs font-medium text-[#2D3748] mb-1">Risk Summary</label>
            <textarea
              value={form.riskSummary}
              onChange={field("riskSummary")}
              rows={2}
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm text-[#2D3748] resize-none"
            />
          </div>

          {/* Optional sections */}
          <div>
            <p className="text-xs font-medium text-[#2D3748] mb-2">Include Sections</p>
            <div className="space-y-1">
              {[
                { key: "includePortabilitySection" as const, label: "Portability" },
                { key: "includeOverpaymentSection" as const, label: "Overpayments" },
                { key: "includeAlternativeProducts" as const, label: "Alternative Products" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-[#2D3748]">
                  <input
                    type="checkbox"
                    checked={!!form[key]}
                    onChange={checkbox(key)}
                    className="rounded border-[#E2E8F0]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <Button variant="primary" onClick={handleGenerate} disabled={saving}>
            {saving ? "Generating…" : isStale ? "Regenerate Suitability Letter" : "Generate Suitability Letter"}
          </Button>
        </div>
      )}

      {/* Approval gate — shown when draft exists, not stale, not approved */}
      {hasDraft && !isApproved && !isStale && (
        <div className="space-y-3 p-4 bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-sm font-medium text-[#2D3748]">Suitability letter generated</p>
          <p className="text-xs text-[#A0AEC0]">
            Generated {new Date(draft.id).toString() !== "Invalid Date" ? "" : ""}
            Review the letter content before approving for export.
          </p>
          <label className="flex items-start gap-2 text-sm text-[#2D3748] cursor-pointer">
            <input
              type="checkbox"
              checked={approvalChecked}
              onChange={(e) => setApprovalChecked(e.target.checked)}
              className="mt-0.5 rounded border-[#E2E8F0]"
            />
            I confirm this letter reflects the product and client circumstances correctly.
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
      {isApproved && !isStale && (
        <div className="space-y-3 p-4 bg-white border border-[#E2E8F0] rounded-lg">
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
