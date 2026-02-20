interface LockedPanelStateProps {
  message: string
}

export default function LockedPanelState({ message }: LockedPanelStateProps) {
  return (
    <div className="bg-[#F5F0E8] border border-[#E2E8F0] rounded-lg p-6 text-center">
      <span className="text-2xl">🔒</span>
      <p className="mt-2 text-[#A0AEC0] font-medium text-sm">{message}</p>
    </div>
  )
}
