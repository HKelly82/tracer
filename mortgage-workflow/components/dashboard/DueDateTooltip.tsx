"use client"
import { useState, ReactNode } from "react"
import { calculatePriorityScore } from "@/lib/stage-engine/timer"
import type { Stage } from "@/types"

const stageLabels: Partial<Record<Stage, string>> = {
  Research: "Research SLA missed",
  ChaseClient: "Chase client follow-up",
  DIP: "DIP must be completed",
  PostDIPChase: "Post-DIP chase deadline",
  AwaitingNB: "Application submission",
  NBSubmitted: "NB submission complete",
}

function getTooltipText(stageDueAt: Date, stage: Stage): string {
  const score = calculatePriorityScore(stageDueAt)
  const stageLabel = stageLabels[stage] ?? "stage deadline"

  if (score < 0) {
    const days = Math.abs(score)
    return `Overdue by ${days} day${days === 1 ? "" : "s"} — ${stageLabel}`
  }
  if (score === 0) {
    return `Due today — ${stageLabel}`
  }
  if (score === 1) {
    return `Due tomorrow — ${stageLabel}`
  }
  return `${score} days remaining — ${stageLabel}`
}

interface DueDateTooltipProps {
  stageDueAt: Date
  stage: Stage
  children: ReactNode
}

export default function DueDateTooltip({ stageDueAt, stage, children }: DueDateTooltipProps) {
  const [visible, setVisible] = useState(false)
  const text = getTooltipText(stageDueAt, stage)

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-20 whitespace-nowrap bg-[#2D3748] text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2D3748]" />
        </span>
      )}
    </span>
  )
}
