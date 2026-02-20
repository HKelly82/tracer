import type { Stage } from "@/types"

const stageLabels: Record<string, string> = {
  Research: "Research",
  ChaseClient: "Chase Client",
  DIP: "DIP",
  PostDIPChase: "Post-DIP Chase",
  AwaitingNB: "Awaiting NB",
  NBSubmitted: "NB Submitted",
  Closed: "Closed",
  Completed: "Completed",
}

const stageColors: Record<string, string> = {
  Research: "bg-blue-100 text-blue-800",
  ChaseClient: "bg-amber-100 text-amber-800",
  DIP: "bg-purple-100 text-purple-800",
  PostDIPChase: "bg-orange-100 text-orange-800",
  AwaitingNB: "bg-cyan-100 text-cyan-800",
  NBSubmitted: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-500",
  Completed: "bg-green-100 text-green-800",
}

export default function StatusBadge({ stage }: { stage: Stage | string }) {
  const label = stageLabels[stage] ?? stage
  const color = stageColors[stage] ?? "bg-gray-100 text-gray-600"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}
