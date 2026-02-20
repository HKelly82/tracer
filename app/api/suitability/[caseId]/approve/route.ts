// POST /api/suitability/[caseId]/approve — mark draft as approved by user
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params

  const draft = await prisma.suitabilityDraft.findUnique({ where: { caseId } })
  if (!draft) return NextResponse.json({ error: "No draft found" }, { status: 404 })
  if (draft.staleDueToInputChange) {
    return NextResponse.json(
      { error: "Draft is stale — regenerate before approving" },
      { status: 400 }
    )
  }

  const updated = await prisma.suitabilityDraft.update({
    where: { caseId },
    data: { approvedByUser: true, approvedAt: new Date() },
  })

  return NextResponse.json(updated)
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
