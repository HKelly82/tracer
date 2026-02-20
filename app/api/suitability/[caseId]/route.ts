// GET  /api/suitability/[caseId] — return existing draft
// POST /api/suitability/[caseId] — generate / regenerate suitability letter draft
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { writeAuditLog } from "@/lib/audit/logger"
import { computeInputHash } from "@/lib/documents/suitability-generator"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params
  const draft = await prisma.suitabilityDraft.findUnique({ where: { caseId } })
  return NextResponse.json(draft ?? null)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params
  const body = await request.json()

  const {
    objectiveCategory,
    objectiveNotes,
    justificationMode,
    presetJustificationKey,
    manualJustificationText,
    affordabilitySummary,
    riskSummary,
    includeAlternativeProducts,
    includePortabilitySection,
    includeOverpaymentSection,
  } = body

  if (!objectiveCategory || !justificationMode || !affordabilitySummary || !riskSummary) {
    return NextResponse.json({ error: "objectiveCategory, justificationMode, affordabilitySummary and riskSummary are required" }, { status: 400 })
  }

  // Fetch case + illustrations
  const [caseRecord, feeDisclosure] = await Promise.all([
    prisma.case.findUnique({
      where: { id: caseId },
      include: { illustrations: true },
    }),
    prisma.feeDisclosureCalculation.findUnique({ where: { caseId } }),
  ])

  if (!caseRecord) return NextResponse.json({ error: "Case not found" }, { status: 404 })

  const primary = caseRecord.illustrations.find(
    (i) => i.variant === "FeeAdded" || i.variant === "None"
  )
  if (!primary?.confirmed) {
    return NextResponse.json(
      { error: "Illustration must be confirmed before generating suitability letter" },
      { status: 403 }
    )
  }

  if (primary.arrangementFeeAddedToLoan) {
    const feeUpfront = caseRecord.illustrations.find((i) => i.variant === "FeeUpfront")
    if (!feeUpfront?.confirmed || !feeDisclosure) {
      return NextResponse.json(
        { error: "Both illustrations must be confirmed and fee calculation completed" },
        { status: 403 }
      )
    }
  }

  const inputHash = computeInputHash(primary)
  const existingDraft = await prisma.suitabilityDraft.findUnique({ where: { caseId } })
  const isRegeneration = !!existingDraft

  const draft = await prisma.suitabilityDraft.upsert({
    where: { caseId },
    create: {
      caseId,
      objectiveCategory,
      objectiveNotes: objectiveNotes ?? null,
      justificationMode,
      presetJustificationKey: presetJustificationKey ?? null,
      manualJustificationText: manualJustificationText ?? null,
      affordabilitySummary,
      riskSummary,
      includeFeeAddedSection: !!feeDisclosure,
      includeErcSection: true,
      includePortabilitySection: includePortabilitySection ?? !!primary.portability,
      includeOverpaymentSection: includeOverpaymentSection ?? primary.overpaymentPercent != null,
      includeAlternativeProducts: includeAlternativeProducts ?? false,
      inputHash,
      staleDueToInputChange: false,
      approvedByUser: false,
    },
    update: {
      objectiveCategory,
      objectiveNotes: objectiveNotes ?? null,
      justificationMode,
      presetJustificationKey: presetJustificationKey ?? null,
      manualJustificationText: manualJustificationText ?? null,
      affordabilitySummary,
      riskSummary,
      includeFeeAddedSection: !!feeDisclosure,
      includeErcSection: true,
      includePortabilitySection: includePortabilitySection ?? !!primary.portability,
      includeOverpaymentSection: includeOverpaymentSection ?? primary.overpaymentPercent != null,
      includeAlternativeProducts: includeAlternativeProducts ?? false,
      inputHash,
      staleDueToInputChange: false,
      approvedByUser: false,
      approvedAt: null,
      generatedAt: new Date(),
    },
  })

  await writeAuditLog({
    caseId,
    eventType: isRegeneration ? "DraftRegenerated" : "DraftGenerated",
    entityType: "SuitabilityDraft",
    entityId: draft.id,
  })

  return NextResponse.json(draft)
}
