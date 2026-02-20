// PATCH /api/illustrations/[id]/field — override a single extracted field
// Body: { fieldKey: string, newValue: string, reason: string }
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { writeAuditLog } from "@/lib/audit/logger"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { fieldKey, newValue, reason } = body

  if (!fieldKey || newValue == null || !reason?.trim()) {
    return NextResponse.json(
      { error: "fieldKey, newValue, and reason are required" },
      { status: 400 }
    )
  }

  const snapshot = await prisma.illustrationSnapshot.findUnique({ where: { id } })
  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const field = await prisma.extractedField.findFirst({
    where: { documentId: snapshot.documentId, fieldKey },
  })

  if (!field) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 })
  }

  const now = new Date()
  const oldValue = field.valueNormalized

  await prisma.extractedField.update({
    where: { id: field.id },
    data: {
      valueNormalized: String(newValue),
      overridden: true,
      overrideReason: reason.trim(),
      overriddenAt: now,
      confirmed: true,
      confirmedAt: now,
      source: "Manual",
    },
  })

  await writeAuditLog({
    caseId: snapshot.caseId,
    eventType: "FieldOverridden",
    entityType: "ExtractedField",
    entityId: field.id,
    fieldKey,
    oldValue,
    newValue: String(newValue),
    reason: reason.trim(),
  })

  // Stale detection — mark SuitabilityDraft stale if one exists
  const existingDraft = await prisma.suitabilityDraft.findUnique({
    where: { caseId: snapshot.caseId },
    select: { id: true, staleDueToInputChange: true },
  })
  if (existingDraft && !existingDraft.staleDueToInputChange) {
    await prisma.suitabilityDraft.update({
      where: { caseId: snapshot.caseId },
      data: { staleDueToInputChange: true },
    })
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}
