"use client"
import { useState } from "react"
import SuccessPulse from "./SuccessPulse"

// Human-readable labels for field keys
const FIELD_LABELS: Record<string, string> = {
  lenderName: "Lender Name",
  loanAmount: "Loan Amount",
  termYears: "Term (years)",
  initialRatePercent: "Initial Rate %",
  initialRateEndDate: "Rate End Date",
  reversionRatePercent: "Reversion Rate %",
  monthlyPaymentInitial: "Monthly Payment (initial)",
  monthlyPaymentReversion: "Monthly Payment (reversion)",
  aprcPercent: "APRC %",
  totalAmountRepayable: "Total Amount Repayable",
  arrangementFeeAmount: "Arrangement Fee",
  arrangementFeeAddedToLoan: "Fee Added to Loan",
  brokerFeeAmount: "Broker Fee",
  procFeeAmount: "Proc Fee",
  cashbackAmount: "Cashback",
  propertyValue: "Property Value",
  productDescription: "Product Description",
  productCode: "Product Code",
  portability: "Portability",
  overpaymentPercent: "Overpayment %",
}

export interface ExtractedFieldData {
  id: string
  fieldKey: string
  valueRaw: string
  valueNormalized: string
  valueType: string
  confidence: number | null
  sourcePage: number | null
  confirmed: boolean
  overridden: boolean
}

interface FieldConfirmRowProps {
  field: ExtractedFieldData
  illustrationId: string
  onUpdate: (fieldId: string, newValue: string) => void
  onFocus: (sourcePage: number | null) => void
}

export default function FieldConfirmRow({
  field,
  illustrationId,
  onUpdate,
  onFocus,
}: FieldConfirmRowProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(field.valueNormalized)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pulseTrigger, setPulseTrigger] = useState(false)
  const [confirmed, setConfirmed] = useState(field.confirmed)

  const label = FIELD_LABELS[field.fieldKey] ?? field.fieldKey

  async function handleSave() {
    if (!reason.trim()) {
      setReasonError(true)
      return
    }
    setReasonError(false)
    setSaving(true)
    try {
      const res = await fetch(`/api/illustrations/${illustrationId}/field`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldKey: field.fieldKey,
          newValue: editValue,
          reason: reason.trim(),
        }),
      })
      if (res.ok) {
        setEditing(false)
        setReason("")
        setConfirmed(true)
        setPulseTrigger((v) => !v)
        onUpdate(field.id, editValue)
      }
    } finally {
      setSaving(false)
    }
  }

  const displayValue = field.valueNormalized || field.valueRaw

  return (
    <SuccessPulse trigger={pulseTrigger}>
      <div
        className="flex items-start gap-2 py-2 px-2 border-b border-[#E2E8F0] cursor-pointer hover:bg-gray-50"
        onClick={() => onFocus(field.sourcePage)}
      >
        {/* Field label */}
        <div className="w-40 flex-shrink-0">
          <span className="text-xs font-medium text-[#A0AEC0] uppercase tracking-wide">
            {label}
          </span>
          {field.sourcePage && (
            <span className="block text-xs text-[#A0AEC0]">p.{field.sourcePage}</span>
          )}
        </div>

        {/* Value column */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full border border-[#DD6B20] rounded px-2 py-1 text-sm font-tabular focus:outline-none focus:ring-1 focus:ring-[#DD6B20]"
              />
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  if (e.target.value.trim()) setReasonError(false)
                }}
                placeholder="Reason for change…"
                rows={2}
                className={`w-full border rounded px-2 py-1 text-xs resize-none focus:outline-none ${
                  reasonError
                    ? "border-[#E53E3E] focus:ring-1 focus:ring-[#E53E3E]"
                    : "border-[#E2E8F0] focus:ring-1 focus:ring-[#DD6B20]"
                }`}
              />
              {reasonError && (
                <p className="text-xs text-[#E53E3E]">Please enter a reason.</p>
              )}
              <div className="flex gap-2">
                <button
                  disabled={saving}
                  onClick={handleSave}
                  className="px-2 py-1 text-xs bg-[#4A90D9] text-white rounded hover:bg-[#3a7bc8] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => { setEditing(false); setReason("") }}
                  className="px-2 py-1 text-xs border border-[#E2E8F0] rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <span className="text-sm font-tabular text-[#2D3748] break-words">
              {displayValue}
            </span>
          )}
        </div>

        {/* Confirm / Edit column */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {confirmed ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-[#38A169] text-xs font-medium">
              ✓ Confirmed
            </span>
          ) : (
            <span className="text-xs text-[#A0AEC0]">Unconfirmed</span>
          )}
          {!editing && (
            <button
              onClick={() => { setEditing(true); setEditValue(field.valueNormalized) }}
              className="ml-1 text-[#4A90D9] hover:underline text-xs"
              title="Edit value"
            >
              ✎
            </button>
          )}
        </div>
      </div>
    </SuccessPulse>
  )
}
