// POST /api/illustrations/[id]/confirm — confirm all fields on an illustration snapshot
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { writeAuditLog } from "@/lib/audit/logger"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const snapshot = await prisma.illustrationSnapshot.findUnique({ where: { id } })
  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const now = new Date()

  // Confirm all extracted fields on the linked document
  await prisma.extractedField.updateMany({
    where: { documentId: snapshot.documentId, confirmed: false },
    data: { confirmed: true, confirmedAt: now },
  })

  // Mark snapshot as confirmed
  await prisma.illustrationSnapshot.update({
    where: { id },
    data: { confirmed: true },
  })

  // Log one FieldConfirmed audit event per field
  const fields = await prisma.extractedField.findMany({
    where: { documentId: snapshot.documentId },
  })

  await Promise.all(
    fields.map((f) =>
      writeAuditLog({
        caseId: snapshot.caseId,
        eventType: "FieldConfirmed",
        entityType: "ExtractedField",
        entityId: f.id,
        fieldKey: f.fieldKey,
        newValue: f.valueNormalized,
      })
    )
  )

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}

export async function PATCH() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}
