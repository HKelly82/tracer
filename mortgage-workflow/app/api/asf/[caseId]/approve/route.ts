// POST /api/asf/[caseId]/approve — approve ASF draft
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

  const draft = await prisma.aSFDraft.findUnique({ where: { caseId } })
  if (!draft) return NextResponse.json({ error: "No ASF draft found" }, { status: 404 })

  const updated = await prisma.aSFDraft.update({
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
