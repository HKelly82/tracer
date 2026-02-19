"use client"
import { useState, useEffect } from "react"
import { Worker, Viewer, SpecialZoomLevel } from "@react-pdf-viewer/core"
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation"
import "@react-pdf-viewer/core/lib/styles/index.css"
import FieldConfirmRow, { type ExtractedFieldData } from "@/components/ui/FieldConfirmRow"
import SuccessPulse from "@/components/ui/SuccessPulse"

// pdfjs-dist version must match installed package
const PDFJS_WORKER_URL =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js"

// Required fields from §7.1 — all must be confirmed before "Confirm All" enables
const REQUIRED_FIELD_KEYS = new Set([
  "lenderName", "loanAmount", "termYears", "initialRatePercent",
  "initialRateEndDate", "reversionRatePercent", "monthlyPaymentInitial",
  "monthlyPaymentReversion", "aprcPercent", "totalAmountRepayable",
])

interface IllustrationVerifyPaneProps {
  illustrationId: string
  documentId: string
  signedUrl: string
  fields: ExtractedFieldData[]
  onConfirmed: () => void
  onClose: () => void
}

export default function IllustrationVerifyPane({
  illustrationId,
  documentId,
  signedUrl,
  fields: initialFields,
  onConfirmed,
  onClose,
}: IllustrationVerifyPaneProps) {
  const [fields, setFields] = useState<ExtractedFieldData[]>(initialFields)
  const [currentPage, setCurrentPage] = useState(0) // 0-indexed for react-pdf-viewer
  const [confirming, setConfirming] = useState(false)
  const [allConfirmedPulse, setAllConfirmedPulse] = useState(false)

  const pageNavPlugin = pageNavigationPlugin()
  const { jumpToPage } = pageNavPlugin

  function handleFieldFocus(sourcePage: number | null) {
    if (sourcePage != null && sourcePage > 0) {
      jumpToPage(sourcePage - 1) // react-pdf-viewer is 0-indexed
      setCurrentPage(sourcePage - 1)
    }
  }

  function handleFieldUpdate(fieldId: string, newValue: string) {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? { ...f, valueNormalized: newValue, confirmed: true, overridden: true }
          : f
      )
    )
  }

  const requiredFields = fields.filter((f) => REQUIRED_FIELD_KEYS.has(f.fieldKey))
  const allRequiredConfirmed = requiredFields.every((f) => f.confirmed)

  async function handleConfirmAll() {
    setConfirming(true)
    try {
      const res = await fetch(`/api/illustrations/${illustrationId}/confirm`, {
        method: "POST",
      })
      if (res.ok) {
        setAllConfirmedPulse(true)
        setTimeout(() => {
          setAllConfirmedPulse(false)
          onConfirmed()
        }, 700)
      }
    } finally {
      setConfirming(false)
    }
  }

  // Sort fields: required first, then optional
  const sortedFields = [...fields].sort((a, b) => {
    const aReq = REQUIRED_FIELD_KEYS.has(a.fieldKey) ? 0 : 1
    const bReq = REQUIRED_FIELD_KEYS.has(b.fieldKey) ? 0 : 1
    return aReq - bReq || a.fieldKey.localeCompare(b.fieldKey)
  })

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFAF8]">
        <h2 className="text-sm font-bold text-[#2D3748]">Verify Illustration Fields</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#A0AEC0]">
            {requiredFields.filter((f) => f.confirmed).length}/{requiredFields.length} required confirmed
          </span>
          <SuccessPulse trigger={allConfirmedPulse}>
            <button
              disabled={!allRequiredConfirmed || confirming}
              onClick={handleConfirmAll}
              className="px-4 py-1.5 text-sm font-medium bg-[#38A169] text-white rounded hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {confirming ? "Confirming…" : "✓ Confirm All"}
            </button>
          </SuccessPulse>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-[#E2E8F0] rounded hover:bg-gray-50 text-[#2D3748]"
          >
            Close
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left 50% — PDF viewer */}
        <div className="w-1/2 border-r border-[#E2E8F0] flex flex-col overflow-hidden">
          <Worker workerUrl={PDFJS_WORKER_URL}>
            <div className="flex-1 overflow-auto">
              <Viewer
                fileUrl={signedUrl}
                defaultScale={SpecialZoomLevel.PageFit}
                plugins={[pageNavPlugin]}
              />
            </div>
          </Worker>
        </div>

        {/* Right 50% — Field list */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-2 py-2 bg-[#E8EDF5] border-b border-[#E2E8F0] text-xs font-medium text-[#A0AEC0] uppercase tracking-wide">
            <div className="w-40 flex-shrink-0">Field</div>
            <div className="flex-1">Value</div>
            <div className="w-28 flex-shrink-0 text-right">Status</div>
          </div>

          {/* Scrollable field rows */}
          <div className="flex-1 overflow-y-auto">
            {sortedFields.map((field) => (
              <FieldConfirmRow
                key={field.id}
                field={field}
                illustrationId={illustrationId}
                onUpdate={handleFieldUpdate}
                onFocus={handleFieldFocus}
              />
            ))}
          </div>

          {/* Footer: confirm all hint */}
          {!allRequiredConfirmed && (
            <div className="px-4 py-3 bg-[#F5F0E8] border-t border-[#E2E8F0] text-xs text-[#A0AEC0]">
              Confirm all required fields (shown first) to enable "Confirm All".
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
