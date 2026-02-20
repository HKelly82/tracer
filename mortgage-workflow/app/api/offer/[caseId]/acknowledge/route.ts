// POST /api/offer/[caseId]/acknowledge — acknowledge offer mismatch
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { writeAuditLog } from "@/lib/audit/logger"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params

  const offer = await prisma.offerSnapshot.findUnique({ where: { caseId } })
  if (!offer) return NextResponse.json({ error: "No offer found" }, { status: 404 })

  const updated = await prisma.offerSnapshot.update({
    where: { caseId },
    data: { acknowledgedByUser: true, acknowledgedAt: new Date() },
  })

  await writeAuditLog({
    caseId,
    eventType: "OfferMismatchAcknowledged",
    entityType: "OfferSnapshot",
    entityId: offer.id,
    newValue: offer.mismatchFields.join(", "),
  })

  return NextResponse.json(updated)
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
