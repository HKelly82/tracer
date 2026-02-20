// GET /api/suitability/[caseId]/download — stream .docx to client
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { generateSuitabilityLetter } from "@/lib/documents/suitability-generator"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params

  const [draft, caseRecord, feeDisclosure] = await Promise.all([
    prisma.suitabilityDraft.findUnique({ where: { caseId } }),
    prisma.case.findUnique({
      where: { id: caseId },
      include: { illustrations: true },
    }),
    prisma.feeDisclosureCalculation.findUnique({ where: { caseId } }),
  ])

  if (!draft) return NextResponse.json({ error: "No draft found" }, { status: 404 })
  if (!caseRecord) return NextResponse.json({ error: "Case not found" }, { status: 404 })

  const primary = caseRecord.illustrations.find(
    (i) => i.variant === "FeeAdded" || i.variant === "None"
  )
  if (!primary) return NextResponse.json({ error: "Illustration not found" }, { status: 404 })

  const feeDisclosureArg = feeDisclosure
    ? { interestChargedOnFee: Number(feeDisclosure.interestChargedOnFee) }
    : null

  const buffer = await generateSuitabilityLetter(draft, primary, feeDisclosureArg, caseRecord.clientName)

  const date = new Date().toISOString().split("T")[0]
  const safeName = caseRecord.clientName.replace(/[^a-zA-Z0-9]/g, "_")
  const filename = `Suitability_Letter_${safeName}_${date}.docx`

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
