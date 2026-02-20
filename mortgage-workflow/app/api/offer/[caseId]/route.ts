// POST /api/offer/[caseId] — upload offer PDF, extract key fields, compare to illustration
// GET  /api/offer/[caseId] — return existing offer snapshot
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { uploadDocument } from "@/lib/storage/supabase"
import { extractWithRegex } from "@/lib/pdf/parser-regex"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse")

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params
  const offer = await prisma.offerSnapshot.findUnique({ where: { caseId } })
  return NextResponse.json(offer ?? null)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params

  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { illustrations: true },
  })
  if (!caseRecord) return NextResponse.json({ error: "Case not found" }, { status: 404 })

  const primary = caseRecord.illustrations.find(
    (i) => i.variant === "FeeAdded" || i.variant === "None"
  )
  if (!primary?.confirmed) {
    return NextResponse.json(
      { error: "Illustration must be confirmed before uploading an offer" },
      { status: 403 }
    )
  }

  // Parse multipart
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload to storage
  const storagePath = await uploadDocument(caseId, buffer, file.name, "Offer")

  // Create document record
  const doc = await prisma.document.create({
    data: {
      caseId,
      documentType: "Offer",
      originalFilename: file.name,
      storagePath,
      parseStatus: "Parsed",
    },
  })

  // Extract PDF text and pull key fields
  let extractedRate: number | null = null
  let extractedLoan: number | null = null
  let extractedTerm: number | null = null
  let extractedRepayment: string | null = null
  let extractedExpiry: Date | null = null

  try {
    const parsed = await pdfParse(buffer)
    const results = extractWithRegex(parsed.text)

    const rateResult = results.get("initialRatePercent")
    if (rateResult) extractedRate = parseFloat(rateResult.valueNormalized)

    const loanResult = results.get("loanAmount")
    if (loanResult) extractedLoan = parseFloat(loanResult.valueNormalized)

    const termResult = results.get("termYears")
    if (termResult) extractedTerm = parseInt(termResult.valueNormalized, 10)

    const repayResult = results.get("repaymentMethod")
    if (repayResult) extractedRepayment = repayResult.valueNormalized

    const expiryResult = results.get("initialRateEndDate")
    if (expiryResult) {
      const d = new Date(expiryResult.valueNormalized)
      if (!isNaN(d.getTime())) extractedExpiry = d
    }
  } catch {
    // Extraction failed — proceed with null values
  }

  const confirmedRepayment: "Repayment" | "InterestOnly" =
    extractedRepayment === "InterestOnly" ? "InterestOnly" : "Repayment"

  // Compare to illustration
  const mismatchFields: string[] = []

  if (extractedRate !== null && Math.abs(extractedRate - Number(primary.initialRatePercent)) > 0.001) {
    mismatchFields.push("initialRatePercent")
  }
  if (extractedLoan !== null && Math.abs(extractedLoan - Number(primary.loanAmount)) > 0.01) {
    mismatchFields.push("loanAmount")
  }
  if (extractedTerm !== null && extractedTerm !== primary.termYears) {
    mismatchFields.push("termYears")
  }

  const matchesIllustration = mismatchFields.length === 0

  // Upsert offer snapshot
  const offer = await prisma.offerSnapshot.upsert({
    where: { caseId },
    create: {
      caseId,
      documentId: doc.id,
      offerExpiryAt: extractedExpiry,
      confirmedRatePercent: extractedRate ?? Number(primary.initialRatePercent),
      confirmedLoanAmount: extractedLoan ?? Number(primary.loanAmount),
      confirmedTermYears: extractedTerm ?? primary.termYears,
      confirmedRepaymentMethod: confirmedRepayment,
      matchesIllustration,
      mismatchFields,
      acknowledgedByUser: false,
    },
    update: {
      documentId: doc.id,
      offerExpiryAt: extractedExpiry,
      confirmedRatePercent: extractedRate ?? Number(primary.initialRatePercent),
      confirmedLoanAmount: extractedLoan ?? Number(primary.loanAmount),
      confirmedTermYears: extractedTerm ?? primary.termYears,
      confirmedRepaymentMethod: confirmedRepayment,
      matchesIllustration,
      mismatchFields,
      acknowledgedByUser: false,
      acknowledgedAt: null,
    },
  })

  return NextResponse.json(offer)
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
