"use client"
import { useRouter } from "next/navigation"
import WaitingOnBadge from "@/components/ui/WaitingOnBadge"
import CaseTypeBadge from "@/components/ui/CaseTypeBadge"
import type { CaseSummary } from "@/types"

function timeInStage(stageStartedAt: string): string {
  const start = new Date(stageStartedAt)
  const now = new Date()
  const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "1 day"
  return `${days} days`
}

interface CaseCardProps {
  caseData: CaseSummary
  onDragStart: (e: React.DragEvent, id: string) => void
}

export default function CaseCard({ caseData, onDragStart }: CaseCardProps) {
  const router = useRouter()
  const isOverdue = caseData.daysOverdue > 0

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, caseData.id)}
      onClick={() => router.push(`/cases/${caseData.id}`)}
      className="bg-white rounded-lg p-3 cursor-pointer transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      style={{
        border: isOverdue ? "1px solid #FEB2B2" : "1px solid #E2E8F0",
      }}
    >
      {/* Row 1: WaitingOn + overdue badge */}
      <div className="flex items-center gap-2 mb-1.5">
        <WaitingOnBadge waitingOn={caseData.waitingOn} />
        {isOverdue && (
          <span className="text-xs font-medium text-[#E53E3E]">
            {caseData.daysOverdue}d overdue
          </span>
        )}
      </div>

      {/* Row 2: Client name */}
      <div className="text-sm font-semibold text-[#2D3748] mb-1 truncate">
        {caseData.clientName}
      </div>

      {/* Row 3: Case type */}
      <div className="mb-1.5">
        <CaseTypeBadge caseType={caseData.caseType} />
      </div>

      {/* Row 4: Time in stage */}
      <div className="text-xs text-[#A0AEC0]">
        {timeInStage(caseData.stageStartedAt)} in stage
      </div>
    </div>
  )
}
