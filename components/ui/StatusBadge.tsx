import type { Stage } from "@/types"

const stageLabels: Record<string, string> = {
  Lead: "Lead",
  Research: "Research",
  ChaseClient: "Chase Client",
  ClientResponse: "Client Response",
  DIP: "DIP",
  PostDIPChase: "Post-DIP Chase",
  AwaitingNB: "Awaiting NB",
  NBSubmitted: "NB Submitted",
  LenderProcessing: "Lender Processing",
  Offered: "Offered",
  Closed: "Closed",
  Completed: "Completed",
}

const stageColors: Record<string, string> = {
  Lead: "bg-slate-100 text-slate-700",
  Research: "bg-blue-100 text-blue-800",
  ChaseClient: "bg-amber-100 text-amber-800",
  ClientResponse: "bg-yellow-100 text-yellow-800",
  DIP: "bg-purple-100 text-purple-800",
  PostDIPChase: "bg-orange-100 text-orange-800",
  AwaitingNB: "bg-cyan-100 text-cyan-800",
  NBSubmitted: "bg-green-100 text-green-800",
  LenderProcessing: "bg-indigo-100 text-indigo-800",
  Offered: "bg-emerald-100 text-emerald-800",
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
