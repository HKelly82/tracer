import { MousePointerClick, Clock, Landmark, Eye } from "lucide-react"
import type { WaitingOn } from "@/types"

const config: Record<WaitingOn, { icon: typeof MousePointerClick; label: string; color: string; bg: string }> = {
  Me:      { icon: MousePointerClick, label: "Me",      color: "#3182CE", bg: "#EBF4FF" },
  Client:  { icon: Clock,             label: "Client",  color: "#D69E2E", bg: "#FEFCBF" },
  Lender:  { icon: Landmark,          label: "Lender",  color: "#667EEA", bg: "#EBF4FF" },
  Passive: { icon: Eye,               label: "Passive", color: "#A0AEC0", bg: "#F7FAFC" },
}

export default function WaitingOnBadge({ waitingOn }: { waitingOn: WaitingOn }) {
  const { icon: Icon, label, color, bg } = config[waitingOn]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{ color, backgroundColor: bg }}
    >
      <Icon size={12} />
      {label}
    </span>
  )
}
