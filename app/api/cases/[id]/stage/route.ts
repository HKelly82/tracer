// POST /api/cases/[id]/stage — stage transition { action: string }
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { executeStageAction } from "@/lib/stage-engine/transitions"
import { addCalendarDays } from "@/lib/stage-engine/timer"
import type { Stage } from "@/types"

const VALID_STAGES: Stage[] = [
  "Lead", "Research", "ChaseClient", "ClientResponse", "DIP",
  "PostDIPChase", "AwaitingNB", "NBSubmitted", "LenderProcessing",
  "Offered", "Closed", "Completed",
]

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { action, stage } = body

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 })
  }

  try {
    // stage_override: direct stage set for drag-and-drop moves
    if (action === "stage_override") {
      if (!stage || !VALID_STAGES.includes(stage)) {
        return NextResponse.json({ error: "Valid stage is required for stage_override" }, { status: 400 })
      }

      const existing = await prisma.case.findUnique({ where: { id }, select: { stage: true } })
      if (!existing) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 })
      }

      const now = new Date()
      await prisma.case.update({
        where: { id },
        data: {
          stage,
          stageStartedAt: now,
          stageDueAt: addCalendarDays(now, 7),
          lastActionAt: now,
        },
      })

      await prisma.auditLogEvent.create({
        data: {
          caseId: id,
          eventType: "StageChanged",
          oldValue: existing.stage,
          newValue: stage,
          reason: "Manual stage override (drag-and-drop)",
        },
      })

      return NextResponse.json({ ok: true })
    }

    await executeStageAction(id, action)

    // After nb_submitted action: check if submission was late
    if (action === "nb_submitted") {
      const updated = await prisma.case.findUnique({
        where: { id },
        select: { nbSubmittedAt: true, nbDueAt: true },
      })
      if (updated?.nbSubmittedAt && updated?.nbDueAt) {
        if (updated.nbSubmittedAt > updated.nbDueAt) {
          await prisma.case.update({
            where: { id },
            data: { lateNbSubmission: true },
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
