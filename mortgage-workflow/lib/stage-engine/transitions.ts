// lib/stage-engine/transitions.ts
// All 8 stage transition functions — each updates stage+due date+completion fields and writes an audit event.

import { prisma } from "@/lib/db/prisma"
import { writeAuditLog } from "@/lib/audit/logger"
import { addCalendarDays, STAGE_RULES } from "./timer"

// 1. Research → ChaseClient
export async function transitionResearchComplete(caseId: string): Promise<void> {
  const now = new Date()
  const stageDueAt = addCalendarDays(now, STAGE_RULES.chase_due_days_from_research_complete)

  const existing = await prisma.case.findUniqueOrThrow({ where: { id: caseId }, select: { stage: true } })

  await prisma.case.update({
    where: { id: caseId },
    data: {
      stage: "ChaseClient",
      stageVariant: null,
      stageStartedAt: now,
      stageDueAt,
      lastActionAt: now,
      researchCompletedAt: now,
    },
  })

  await writeAuditLog({
    caseId,
    eventType: "StageChanged",
    oldValue: existing.stage,
    newValue: "ChaseClient",
  })
}

// 2. ChaseClient → DIP ("Case Started → DIP")
export async function transitionChaseClientToDIP(caseId: string): Promise<void> {
  const now = new Date()
  const stageDueAt = addCalendarDays(now, STAGE_RULES.dip_due_days_from_case_started)

  const existing = await prisma.case.findUniqueOrThrow({ where: { id: caseId }, select: { stage: true } })

  await prisma.case.update({
    where: { id: caseId },
    data: {
      stage: "DIP",
      stageVariant: null,
      stageStartedAt: now,
      stageDueAt,
      lastActionAt: now,
    },
  })

  await writeAuditLog({
    caseId,
    eventType: "StageChanged",
    oldValue: existing.stage,
    newValue: "DIP",
  })
}

// 3. ChaseClient — No Response (+2 days) — resets due date, stays in ChaseClient
export async function transitionChaseNoResponse(caseId: string): Promise<void> {
  const now = new Date()
  const existing = await prisma.case.findUniqueOrThrow({
    where: { id: caseId },
    select: { stage: true, stageDueAt: true },
  })

  const stageDueAt = addCalendarDays(
    existing.stageDueAt > now ? existing.stageDueAt : now,
    STAGE_RULES.chase_no_response_reset_days
  )

  await prisma.case.update({
    where: { id: caseId },
    data: {
      stageDueAt,
      lastActionAt: now,
    },
  })

  await writeAuditLog({
    caseId,
    eventType: "StageChanged",
    oldValue: existing.stage,
    newValue: existing.stage,
    reason: "No response — due date extended by 2 days",
  })
}

// 4. ChaseClient — Lead Cold → Close
export async function transitionChaseColdClose(caseId: string): Promise<void> {
  const now = new Date()
  const existing = await prisma.case.findUniqueOrThrow({ where: { id: caseId }, select: { stage: true } })

  await prisma.case.update({
    where: { id: caseId },
    data: {
      stage: "Closed",
      status: "Closed",
      lastActionAt: now,
    },
  })

  await writeAuditLog({
    caseId,
    eventType: "CaseClosed",
    oldValue: existing.stage,
    newValue: "Closed",
    reason: "Lead cold",
  })
}

// 5. DIP → PostDIPChase (if lender chasing needed) — same due logic as chase
export async function transitionDIPToPostDIPChase(caseId: string): Promise<void> {
  const now = new Date()
  const stageDueAt = addCalendarDays(now, STAGE_RULES.post_dip_chase_due_days)

  const existing = await prisma.case.findUniqueOrThrow({ where: { id: caseId }, select: { stage: true } })

  await prisma.case.update({
    where: { id: caseId },
    data: {
      stage: "PostDIPChase",
      stageVariant: "PostDIPChase",
      stageStartedAt: now,
      stageDueAt,
      lastActionAt: now,
      dipCompletedAt: now,
    },
  })

  await writeAuditLog({
    caseId,
    eventType: "StageChanged",
    oldValue: existing.stage,
    newValue: "PostDIPChase",
  })
}

// 6. DIP → AwaitingNB (DIP complete, application submitted)
export async function transitionDIPComplete(caseId: string): Promise<void> {
  const now = new Date()
  const stageDueAt = addCalendarDays(now, STAGE_RULES.nb_due_days_from_application_submitted)

  const existing = await prisma.case.findUniqueOrThrow({ where: { id: caseId }, select: { stage: true } })

  await prisma.case.update({
    where: { id: caseId },
    data: {
      stage: "AwaitingNB",
      stageVariant: null,
      stageStartedAt: now,
      stageDueAt,
      lastActionAt: now,
      dipCompletedAt: now,
      applicationSubmittedAt: now,
      nbDueAt: stageDueAt,
    },
  })

  await writeAuditLog({
    caseId,
    eventType: "StageChanged",
    oldValue: existing.stage,
    newValue: "AwaitingNB",
  })
}

// 7. AwaitingNB → NBSubmitted
export async function transitionNBSubmitted(caseId: string): Promise<void> {
  const now = new Date()
  const existing = await prisma.case.findUniqueOrThrow({ where: { id: caseId }, select: { stage: true } })

  await prisma.case.update({
    where: { id: caseId },
    data: {
      stage: "NBSubmitted",
      stageVariant: null,
      stageStartedAt: now,
      stageDueAt: now,
      lastActionAt: now,
      nbSubmittedAt: now,
    },
  })

  await writeAuditLog({
    caseId,
    eventType: "StageChanged",
    oldValue: existing.stage,
    newValue: "NBSubmitted",
  })
}

// 8. Any stage → Completed
export async function transitionCompleted(caseId: string): Promise<void> {
  const now = new Date()
  const existing = await prisma.case.findUniqueOrThrow({ where: { id: caseId }, select: { stage: true } })

  await prisma.case.update({
    where: { id: caseId },
    data: {
      stage: "Completed",
      status: "Completed",
      lastActionAt: now,
    },
  })

  await writeAuditLog({
    caseId,
    eventType: "StageChanged",
    oldValue: existing.stage,
    newValue: "Completed",
  })
}

// Router — maps action string to transition function
export async function executeStageAction(caseId: string, action: string): Promise<void> {
  switch (action) {
    case "research_complete":
      return transitionResearchComplete(caseId)
    case "chase_to_dip":
      return transitionChaseClientToDIP(caseId)
    case "chase_no_response":
      return transitionChaseNoResponse(caseId)
    case "chase_cold_close":
      return transitionChaseColdClose(caseId)
    case "dip_to_post_dip_chase":
      return transitionDIPToPostDIPChase(caseId)
    case "dip_complete":
      return transitionDIPComplete(caseId)
    case "nb_submitted":
      return transitionNBSubmitted(caseId)
    case "completed":
      return transitionCompleted(caseId)
    default:
      throw new Error(`Unknown stage action: ${action}`)
  }
}
