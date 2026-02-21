import { MousePointerClick, Clock, Landmark, Eye } from "lucide-react"

const items = [
  { icon: MousePointerClick, label: "Me", color: "#3182CE" },
  { icon: Clock,             label: "Client", color: "#D69E2E" },
  { icon: Landmark,          label: "Lender", color: "#667EEA" },
  { icon: Eye,               label: "Passive", color: "#A0AEC0" },
]

export default function WaitingOnLegend() {
  return (
    <div className="flex items-center gap-4 px-2 mb-3">
      <span className="text-xs text-[#A0AEC0] font-medium">Waiting on:</span>
      {items.map(({ icon: Icon, label, color }) => (
        <span key={label} className="inline-flex items-center gap-1 text-xs" style={{ color }}>
          <Icon size={12} />
          {label}
        </span>
      ))}
    </div>
  )
}
