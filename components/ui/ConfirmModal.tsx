"use client"

interface ConfirmModalProps {
  title?: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export default function ConfirmModal({
  title = "Are you sure?",
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-bold text-[#2D3748] mb-2">{title}</h2>
        <p className="text-sm text-[#2D3748] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#2D3748] border border-[#E2E8F0] rounded hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors ${
              danger
                ? "bg-[#E53E3E] hover:bg-red-700"
                : "bg-[#4A90D9] hover:bg-[#3a7bc8]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
