"use client"
import { useState, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import type { ExtractedFieldData } from "@/components/ui/FieldConfirmRow"

// Dynamic import — prevents SSR of react-pdf-viewer and pdfjs-dist
const IllustrationVerifyPane = dynamic(
  () => import("./IllustrationVerifyPane"),
  { ssr: false }
)

interface IllustrationDoc {
  id: string
  documentId: string
  variant: string
  lenderName: string
  loanAmount: string | number
  arrangementFeeAddedToLoan: boolean
  confirmed: boolean
}

interface IllustrationPanelProps {
  caseId: string
  variant?: "None" | "FeeAdded" | "FeeUpfront"
  existingIllustration?: IllustrationDoc | null
  label?: string
  onUploaded: () => void
}

type PanelState = "empty" | "uploading" | "extracted"

interface VerifyData {
  illustrationId: string
  documentId: string
  signedUrl: string
  fields: ExtractedFieldData[]
}

export default function IllustrationPanel({
  caseId,
  variant = "None",
  existingIllustration,
  label = "Mortgage Illustration",
  onUploaded,
}: IllustrationPanelProps) {
  const [state, setState] = useState<PanelState>(
    existingIllustration ? "extracted" : "empty"
  )
  const [illustration, setIllustration] = useState<IllustrationDoc | null>(
    existingIllustration ?? null
  )
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [verifyData, setVerifyData] = useState<VerifyData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".pdf")) {
        setUploadError("Please upload a PDF file.")
        return
      }
      setUploadError(null)
      setState("uploading")

      const formData = new FormData()
      formData.append("file", file)
      formData.append("caseId", caseId)
      formData.append("documentType", "Illustration")
      formData.append("variant", variant)

      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const err = await res.json()
          setUploadError(err.error ?? "Upload failed")
          setState("empty")
          return
        }

        const data = await res.json()
        setState("extracted")

        if (data.illustrationSnapshot) {
          setIllustration({
            id: data.illustrationSnapshot.id,
            documentId: data.document.id,
            variant: data.illustrationSnapshot.variant,
            lenderName: data.illustrationSnapshot.lenderName,
            loanAmount: data.illustrationSnapshot.loanAmount,
            arrangementFeeAddedToLoan:
              data.illustrationSnapshot.arrangementFeeAddedToLoan,
            confirmed: data.illustrationSnapshot.confirmed,
          })
        }
      } catch (err) {
        setUploadError("Upload failed. Please try again.")
        setState("empty")
      }
    },
    [caseId, variant]
  )

  async function openVerifyPane() {
    if (!illustration) return

    const res = await fetch(`/api/documents/${illustration.documentId}`)
    if (!res.ok) return
    const data = await res.json()

    setVerifyData({
      illustrationId: illustration.id,
      documentId: illustration.documentId,
      signedUrl: data.signedUrl ?? "",
      fields: (data.extractedFields ?? []) as ExtractedFieldData[],
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  // ---- Render ----
  if (state === "uploading") {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-8 h-8 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#A0AEC0]">Extracting fields from PDF…</p>
      </div>
    )
  }

  if (state === "extracted" && illustration) {
    const isConfirmed = illustration.confirmed
    const hasFee = illustration.arrangementFeeAddedToLoan
    return (
      <div className="space-y-3">
        {/* Summary card */}
        <div className="flex items-center justify-between p-3 border border-[#E2E8F0] rounded-lg bg-[#FAFAF8]">
          <div>
            <p className="text-sm font-bold text-[#2D3748]">{illustration.lenderName}</p>
            <p className="text-xs text-[#A0AEC0]">
              Loan: £{Number(illustration.loanAmount).toLocaleString("en-GB")}
              {" · "}
              Variant: {illustration.variant}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isConfirmed ? (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-[#38A169]">
                ✓ Confirmed
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-[#DD6B20]">
                Needs verification
              </span>
            )}
            <button
              onClick={openVerifyPane}
              className="px-3 py-1.5 text-xs font-medium bg-[#4A90D9] text-white rounded hover:bg-[#3a7bc8] transition-colors"
            >
              Verify Fields
            </button>
          </div>
        </div>

        {/* Fee-added banner — prompt second upload */}
        {hasFee && !isConfirmed && (
          <div className="p-3 bg-[#F5F0E8] border border-[#DD6B20] rounded-lg text-sm text-[#2D3748]">
            <span className="font-medium">⚠️ Second Illustration Required (Fee Upfront Version)</span>
            <p className="text-xs text-[#A0AEC0] mt-1">
              An arrangement fee is being added to this loan. Please also upload the fee-upfront illustration.
            </p>
          </div>
        )}

        {/* Verify pane overlay */}
        {verifyData && (
          <IllustrationVerifyPane
            illustrationId={verifyData.illustrationId}
            documentId={verifyData.documentId}
            signedUrl={verifyData.signedUrl}
            fields={verifyData.fields}
            onConfirmed={() => {
              setVerifyData(null)
              setIllustration((prev) => prev ? { ...prev, confirmed: true } : prev)
              onUploaded()
            }}
            onClose={() => setVerifyData(null)}
          />
        )}
      </div>
    )
  }

  // State: empty — show upload zone
  return (
    <div className="space-y-2">
      {uploadError && (
        <p className="text-sm text-[#E53E3E]">{uploadError}</p>
      )}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? "border-[#4A90D9] bg-blue-50"
            : "border-[#E2E8F0] bg-[#FAFAF8] hover:border-[#4A90D9]"
        }`}
      >
        <p className="text-sm text-[#A0AEC0] mb-3">
          Drag & drop {label} PDF here, or
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 text-sm font-medium bg-[#4A90D9] text-white rounded hover:bg-[#3a7bc8] transition-colors"
        >
          Upload Illustration
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
            e.target.value = ""
          }}
        />
      </div>
    </div>
  )
}
