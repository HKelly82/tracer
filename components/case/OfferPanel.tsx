"use client"
import { useRef, useState } from "react"
import Button from "@/components/ui/Button"

interface OfferRecord {
  id: string
  confirmedRatePercent: string | number
  confirmedLoanAmount: string | number
  confirmedTermYears: number
  matchesIllustration: boolean
  mismatchFields: string[]
  acknowledgedByUser: boolean
}

interface IllustrationSnapshot {
  initialRatePercent: string | number
  loanAmount: string | number
  termYears: number
}

interface OfferPanelProps {
  caseId: string
  existingOffer: OfferRecord | null
  primaryIllustration: IllustrationSnapshot | null
  onRefresh: () => void
}

const FIELD_LABELS: Record<string, string> = {
  initialRatePercent: "Interest rate",
  loanAmount: "Loan amount",
  termYears: "Term",
}

function fmt(value: string | number, field: string): string {
  const n = Number(value)
  if (field === "initialRatePercent") return `${n.toFixed(2)}%`
  if (field === "loanAmount") {
    return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (field === "termYears") return `${n} years`
  return String(value)
}

function illValue(snapshot: IllustrationSnapshot, field: string): string | number {
  if (field === "initialRatePercent") return snapshot.initialRatePercent
  if (field === "loanAmount") return snapshot.loanAmount
  if (field === "termYears") return snapshot.termYears
  return ""
}

function offerValue(offer: OfferRecord, field: string): string | number {
  if (field === "initialRatePercent") return offer.confirmedRatePercent
  if (field === "loanAmount") return offer.confirmedLoanAmount
  if (field === "termYears") return offer.confirmedTermYears
  return ""
}

export default function OfferPanel({
  caseId,
  existingOffer,
  primaryIllustration,
  onRefresh,
}: OfferPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acknowledging, setAcknowledging] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`/api/offer/${caseId}`, { method: "POST", body: fd })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? "Upload failed")
      } else {
        onRefresh()
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleAcknowledge() {
    setAcknowledging(true)
    setError(null)
    try {
      const res = await fetch(`/api/offer/${caseId}/acknowledge`, { method: "POST" })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? "Acknowledge failed")
      } else {
        onRefresh()
      }
    } finally {
      setAcknowledging(false)
    }
  }

  // ── State 1: No offer uploaded ──
  if (!existingOffer) {
    return (
      <div className="space-y-2">
        {error && (
          <p className="text-sm text-[#E53E3E] bg-red-50 border border-red-200 rounded p-2">{error}</p>
        )}
        <p className="text-xs text-[#A0AEC0]">Optional — offer upload does not affect stage progression.</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          className="hidden"
          id={`offer-upload-${caseId}`}
        />
        <Button
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Upload Offer PDF"}
        </Button>
      </div>
    )
  }

  // ── State 2: Match ──
  if (existingOffer.matchesIllustration) {
    return (
      <div className="space-y-3">
        {error && (
          <p className="text-sm text-[#E53E3E] bg-red-50 border border-red-200 rounded p-2">{error}</p>
        )}
        <div className="flex items-center gap-2 p-3 bg-[#F0FFF4] border border-[#68D391] rounded-lg">
          <span className="text-sm font-medium text-[#276749]">✓ Offer matches Illustration</span>
        </div>
        <div className="flex gap-4 text-xs text-[#2D3748]">
          <span>Rate: {fmt(existingOffer.confirmedRatePercent, "initialRatePercent")}</span>
          <span>Loan: {fmt(existingOffer.confirmedLoanAmount, "loanAmount")}</span>
          <span>Term: {existingOffer.confirmedTermYears} years</span>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            className="hidden"
            id={`offer-upload-${caseId}`}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs text-[#4A90D9] hover:underline"
          >
            {uploading ? "Uploading…" : "Replace offer PDF"}
          </button>
        </div>
      </div>
    )
  }

  // ── State 3: Mismatch ──
  const isAcknowledged = existingOffer.acknowledgedByUser

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-[#E53E3E] bg-red-50 border border-red-200 rounded p-2">{error}</p>
      )}

      {!isAcknowledged && (
        <div className="p-3 bg-[#FFFAF0] border border-[#DD6B20] rounded-lg">
          <p className="text-sm font-medium text-[#C05621]">⚠ Offer differs from Illustration</p>
        </div>
      )}

      {isAcknowledged && (
        <div className="flex items-center gap-2 p-3 bg-[#F7FAFC] border border-[#E2E8F0] rounded-lg">
          <span className="text-sm text-[#2D3748]">✓ Mismatch reviewed and acknowledged</span>
        </div>
      )}

      {/* Comparison table */}
      {primaryIllustration && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[#A0AEC0]">
                <th className="text-left py-1 pr-4">Field</th>
                <th className="text-left py-1 pr-4">Illustration</th>
                <th className="text-left py-1">Offer</th>
              </tr>
            </thead>
            <tbody>
              {["initialRatePercent", "loanAmount", "termYears"].map((field) => {
                const isMismatch = existingOffer.mismatchFields.includes(field)
                return (
                  <tr key={field} className={isMismatch ? "text-[#C05621]" : "text-[#2D3748]"}>
                    <td className="py-1 pr-4 font-medium">{FIELD_LABELS[field]}</td>
                    <td className="py-1 pr-4 font-tabular">{fmt(illValue(primaryIllustration, field), field)}</td>
                    <td className="py-1 font-tabular">{fmt(offerValue(existingOffer, field), field)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isAcknowledged && (
        <Button variant="primary" onClick={handleAcknowledge} disabled={acknowledging}>
          {acknowledging ? "Confirming…" : "Confirm Reviewed"}
        </Button>
      )}

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          className="hidden"
          id={`offer-upload-${caseId}`}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs text-[#4A90D9] hover:underline"
        >
          {uploading ? "Uploading…" : "Replace offer PDF"}
        </button>
      </div>
    </div>
  )
}
