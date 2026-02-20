// GET /api/audit/[caseId] — full audit log
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params

  const events = await prisma.auditLogEvent.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(events)
}
