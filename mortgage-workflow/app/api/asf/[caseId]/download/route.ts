// GET /api/asf/[caseId]/download — stream ASF .docx to client
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { generateASF } from "@/lib/documents/asf-generator"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params

  const [draft, caseRecord, commission] = await Promise.all([
    prisma.aSFDraft.findUnique({ where: { caseId } }),
    prisma.case.findUnique({
      where: { id: caseId },
      include: { illustrations: true },
    }),
    prisma.commission.findUnique({ where: { caseId } }),
  ])

  if (!draft) return NextResponse.json({ error: "No ASF draft found" }, { status: 404 })
  if (!draft.approvedByUser) {
    return NextResponse.json({ error: "ASF must be approved before downloading" }, { status: 400 })
  }
  if (!caseRecord) return NextResponse.json({ error: "Case not found" }, { status: 404 })
  if (!commission) return NextResponse.json({ error: "Commission record not found" }, { status: 404 })

  const primary = caseRecord.illustrations.find(
    (i) => i.variant === "FeeAdded" || i.variant === "None"
  )
  if (!primary) return NextResponse.json({ error: "Illustration not found" }, { status: 404 })

  const buffer = await generateASF(draft, primary, commission, {
    clientName: caseRecord.clientName,
    applicationSubmittedAt: caseRecord.applicationSubmittedAt,
    sharedCase: caseRecord.sharedCase,
  })

  const date = new Date().toISOString().split("T")[0]
  const safeName = caseRecord.clientName.replace(/[^a-zA-Z0-9]/g, "_")
  const filename = `ASF_${safeName}_${date}.docx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
