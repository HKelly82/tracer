// POST /api/cases/[id]/stage — stage transition { action: string }
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
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
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
