// lib/stage-engine/timer.ts

export const STAGE_RULES = {
  research_due_days_from_created: 2,
  chase_due_days_from_research_complete: 2,
  chase_no_response_reset_days: 2,
  dip_due_days_from_case_started: 1,
  post_dip_chase_due_days: 5,
  nb_due_days_from_application_submitted: 20,
}

export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function calculatePriorityScore(stageDueAt: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(stageDueAt)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  // negative = overdue (sorts first), positive = days remaining
}

export function getDaysRemaining(stageDueAt: Date): number {
  const s = calculatePriorityScore(stageDueAt)
  return s > 0 ? s : 0
}

export function getDaysOverdue(stageDueAt: Date): number {
  const s = calculatePriorityScore(stageDueAt)
  return s < 0 ? Math.abs(s) : 0
}
