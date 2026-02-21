// lib/stage-engine/priority.ts
import { calculatePriorityScore } from "./timer"
import type { Stage, CaseStatus, PrimaryAction } from "@/types"

export { calculatePriorityScore, getDaysRemaining, getDaysOverdue } from "./timer"

export function getHeatmapBorder(stageDueAt: Date, status: CaseStatus): string {
  if (status === "Closed" || status === "Completed")
    return "border-l-4 border-[#A0AEC0]"
  const score = calculatePriorityScore(stageDueAt)
  if (score < 0) return "border-l-4 border-[#E53E3E]"  // overdue — red
  if (score <= 1) return "border-l-4 border-[#DD6B20]" // due today/tomorrow — amber
  return "border-l-4 border-[#38A169]"                  // on track — green
}

export function getRowBackground(stageDueAt: Date, status: CaseStatus): string {
  if (status === "Closed" || status === "Completed") return "bg-[#FAFAF8]"
  const score = calculatePriorityScore(stageDueAt)
  if (score < 0) return "bg-red-50"
  if (score <= 1) return "bg-orange-50"
  return "bg-[#FAFAF8]"
}

export function getPrimaryAction(stage: Stage): PrimaryAction {
  switch (stage) {
    case "Lead":              return { label: "Open Case",          action: "open_case" }
    case "Research":          return { label: "Complete Research",  action: "research_complete" }
    case "ChaseClient":       return { label: "Chase Client",      action: "open_chase_modal" }
    case "ClientResponse":    return { label: "Open Case",         action: "open_case" }
    case "DIP":               return { label: "Complete DIP",      action: "dip_complete" }
    case "PostDIPChase":      return { label: "Chase Client",      action: "open_chase_modal" }
    case "AwaitingNB":        return { label: "Submit to NB",      action: "nb_submitted" }
    case "NBSubmitted":       return { label: "View Case",         action: "open_case" }
    case "LenderProcessing":  return { label: "Open Case",         action: "open_case" }
    case "Offered":           return { label: "Open Case",         action: "open_case" }
    default:                  return { label: "View Case",         action: "open_case" }
  }
}
