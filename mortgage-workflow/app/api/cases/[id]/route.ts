// GET    /api/cases/[id] — full case with all relations
// PATCH  /api/cases/[id] — update case fields
// DELETE /api/cases/[id] — soft delete (status = Closed)
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { writeAuditLog } from "@/lib/audit/logger"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [c, feeDisclosure] = await Promise.all([
    prisma.case.findUnique({
      where: { id },
      include: {
        illustrations: true,
        offer: true,
        suitabilityDraft: true,
        asfDraft: true,
        commission: true,
        auditLog: { orderBy: { createdAt: "asc" } },
        documents: { include: { extractedFields: true } },
      },
    }),
    prisma.feeDisclosureCalculation.findUnique({ where: { caseId: id } }),
  ])

  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ...c, feeDisclosure: feeDisclosure ?? null })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const updated = await prisma.case.update({
    where: { id },
    data: body,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.case.findUnique({ where: { id }, select: { stage: true } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.case.update({
    where: { id },
    data: { status: "Closed" },
  })

  await writeAuditLog({
    caseId: id,
    eventType: "CaseClosed",
    oldValue: existing.stage,
    newValue: "Closed",
  })

  return NextResponse.json({ ok: true })
}
