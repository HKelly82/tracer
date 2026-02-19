"use client"
import { useState, useRef } from "react"

type State = "idle" | "editing" | "saving" | "saved"

interface InlineOverrideFieldProps {
  label: string
  value: string
  onSave: (newValue: string, reason: string) => Promise<void>
  formatDisplay?: (v: string) => string
  inputType?: string
  inputMode?: "text" | "decimal" | "numeric"
}

export default function InlineOverrideField({
  label,
  value,
  onSave,
  formatDisplay,
  inputType = "text",
  inputMode = "text",
}: InlineOverrideFieldProps) {
  const [state, setState] = useState<State>("idle")
  const [editValue, setEditValue] = useState(value)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState(false)
  const [rowClass, setRowClass] = useState("")
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  function startEdit() {
    setEditValue(value)
    setReason("")
    setReasonError(false)
    setState("editing")
  }

  async function handleReasonBlur() {
    if (!reason.trim()) {
      setReasonError(true)
      // Re-focus so the field stays active
      reasonRef.current?.focus()
      return
    }
    setReasonError(false)
    setState("saving")
    try {
      await onSave(editValue, reason.trim())
      setState("saved")
      setRowClass("success-pulse")
      setTimeout(() => {
        setRowClass("")
        setState("idle")
      }, 700)
    } catch {
      setState("editing")
    }
  }

  if (state === "idle") {
    return (
      <div className={`flex items-center justify-between py-1 px-1 rounded ${rowClass}`}>
        <span className="text-sm text-[#2D3748]">
          <span className="font-medium text-[#A0AEC0] mr-2">{label}</span>
          <span className="font-bold font-tabular">{formatDisplay ? formatDisplay(value) : value}</span>
        </span>
        <button
          onClick={startEdit}
          className="text-xs text-[#4A90D9] hover:underline ml-4"
        >
          Edit
        </button>
      </div>
    )
  }

  if (state === "saving") {
    return (
      <div className="flex items-center gap-2 py-1 px-1">
        <span className="text-sm text-[#A0AEC0]">Saving…</span>
      </div>
    )
  }

  return (
    <div className="py-1 px-1 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#A0AEC0] mr-1">{label}</span>
        <input
          type={inputType}
          inputMode={inputMode}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="flex-1 border border-[#DD6B20] rounded px-2 py-1 text-sm font-tabular focus:outline-none focus:ring-1 focus:ring-[#DD6B20]"
        />
      </div>
      <textarea
        ref={reasonRef}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value)
          if (e.target.value.trim()) setReasonError(false)
        }}
        onBlur={handleReasonBlur}
        placeholder="Reason for change…"
        rows={2}
        className={`w-full border rounded px-2 py-1 text-sm resize-none focus:outline-none ${
          reasonError
            ? "border-[#E53E3E] focus:ring-1 focus:ring-[#E53E3E]"
            : "border-[#E2E8F0] focus:ring-1 focus:ring-[#DD6B20]"
        }`}
      />
      {reasonError && (
        <p className="text-xs text-[#E53E3E]">Please enter a reason before saving.</p>
      )}
    </div>
  )
}
