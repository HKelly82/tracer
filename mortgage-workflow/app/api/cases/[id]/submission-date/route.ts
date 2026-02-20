// POST /api/cases/[id]/submission-date — protected update for applicationSubmittedAt / nbSubmittedAt
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { writeAuditLog } from "@/lib/audit/logger"

const ALLOWED_FIELDS = ["applicationSubmittedAt", "nbSubmittedAt"] as const
type AllowedField = (typeof ALLOWED_FIELDS)[number]

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { field, newValue, reason } = body as {
    field: string
    newValue: string
    reason: string
  }

  if (!ALLOWED_FIELDS.includes(field as AllowedField)) {
    return NextResponse.json(
      { error: `field must be one of: ${ALLOWED_FIELDS.join(", ")}` },
      { status: 400 }
    )
  }
  if (!newValue?.trim()) {
    return NextResponse.json({ error: "newValue is required" }, { status: 400 })
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 })
  }

  const newDate = new Date(newValue)
  if (isNaN(newDate.getTime())) {
    return NextResponse.json({ error: "newValue must be a valid ISO date string" }, { status: 400 })
  }

  const existing = await prisma.case.findUnique({
    where: { id },
    select: { applicationSubmittedAt: true, nbSubmittedAt: true },
  })
  if (!existing) return NextResponse.json({ error: "Case not found" }, { status: 404 })

  const oldDate = existing[field as AllowedField] as Date | null
  const oldValue = oldDate ? oldDate.toISOString() : undefined

  await prisma.case.update({
    where: { id },
    data: { [field]: newDate },
  })

  await writeAuditLog({
    caseId: id,
    eventType: "DateOverridden",
    fieldKey: field,
    oldValue,
    newValue: newDate.toISOString(),
    reason,
  })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
