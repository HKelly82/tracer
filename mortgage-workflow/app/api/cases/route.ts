// GET /api/cases  — list active cases with priority scores
// POST /api/cases — create case
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { calculatePriorityScore, getDaysRemaining, getDaysOverdue, addCalendarDays, STAGE_RULES } from "@/lib/stage-engine/timer"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cases = await prisma.case.findMany({
    where: { status: "Active" },
    orderBy: { stageDueAt: "asc" },
  })

  const withScores = cases
    .map((c) => ({
      id: c.id,
      clientName: c.clientName,
      caseType: c.caseType,
      status: c.status,
      stage: c.stage,
      stageVariant: c.stageVariant,
      stageStartedAt: c.stageStartedAt.toISOString(),
      stageDueAt: c.stageDueAt.toISOString(),
      lastActionAt: c.lastActionAt.toISOString(),
      priorityScore: calculatePriorityScore(c.stageDueAt),
      daysRemaining: getDaysRemaining(c.stageDueAt),
      daysOverdue: getDaysOverdue(c.stageDueAt),
      lateNbSubmission: c.lateNbSubmission,
    }))
    .sort((a, b) => a.priorityScore - b.priorityScore)

  return NextResponse.json(withScores)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { clientName, caseType } = body

  if (!clientName?.trim()) {
    return NextResponse.json({ error: "clientName is required" }, { status: 400 })
  }

  const now = new Date()
  const stageDueAt = addCalendarDays(now, STAGE_RULES.research_due_days_from_created)

  const newCase = await prisma.case.create({
    data: {
      clientName: clientName.trim(),
      caseType: caseType ?? "Remortgage",
      stageDueAt,
    },
  })

  return NextResponse.json(newCase, { status: 201 })
}
