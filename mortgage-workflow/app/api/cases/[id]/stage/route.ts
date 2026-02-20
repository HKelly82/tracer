// POST /api/cases/[id]/stage — stage transition { action: string }
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { executeStageAction } from "@/lib/stage-engine/transitions"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { action } = body

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 })
  }

  try {
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
