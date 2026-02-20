// GET  /api/asf/[caseId] — return existing ASF draft + commission
// POST /api/asf/[caseId] — generate / regenerate ASF draft
// PATCH /api/asf/[caseId] — commission override
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { writeAuditLog } from "@/lib/audit/logger"
import { calculateCommission } from "@/lib/documents/asf-generator"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params
  const [draft, commission] = await Promise.all([
    prisma.aSFDraft.findUnique({ where: { caseId } }),
    prisma.commission.findUnique({ where: { caseId } }),
  ])
  return NextResponse.json({ draft: draft ?? null, commission: commission ?? null })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params
  const body = await request.json()

  const { vulnerableClient, sourceOfBusiness, purposeOfLoan, borrowerType, accountNumber } = body

  if (vulnerableClient === undefined || !sourceOfBusiness || !purposeOfLoan || !borrowerType) {
    return NextResponse.json(
      { error: "vulnerableClient, sourceOfBusiness, purposeOfLoan and borrowerType are required" },
      { status: 400 }
    )
  }

  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { illustrations: true, commission: true, suitabilityDraft: { select: { approvedByUser: true } } },
  })
  if (!caseRecord) return NextResponse.json({ error: "Case not found" }, { status: 404 })

  // Gate: require approved suitability letter
  if (!caseRecord.suitabilityDraft?.approvedByUser) {
    return NextResponse.json(
      { error: "Suitability letter must be approved before generating ASF" },
      { status: 403 }
    )
  }

  const primary = caseRecord.illustrations.find(
    (i) => i.variant === "FeeAdded" || i.variant === "None"
  )
  if (!primary?.confirmed) {
    return NextResponse.json(
      { error: "Illustration must be confirmed before generating ASF" },
      { status: 403 }
    )
  }

  const existingDraft = await prisma.aSFDraft.findUnique({ where: { caseId } })
  const isRegeneration = !!existingDraft

  // Upsert commission (preserve ManualOverride if present)
  const commSplits = calculateCommission(caseRecord.sharedCase, caseRecord.commission)
  const commission = await prisma.commission.upsert({
    where: { caseId },
    create: {
      caseId,
      helenSplitPercent: commSplits.helenSplitPercent,
      eileenSplitPercent: commSplits.eileenSplitPercent,
      splitRuleApplied: commSplits.splitRuleApplied as "DefaultHelen100" | "Shared7030" | "ManualOverride",
    },
    update:
      caseRecord.commission?.splitRuleApplied === "ManualOverride"
        ? {} // preserve override — don't touch splits
        : {
            helenSplitPercent: commSplits.helenSplitPercent,
            eileenSplitPercent: commSplits.eileenSplitPercent,
            splitRuleApplied: commSplits.splitRuleApplied as "DefaultHelen100" | "Shared7030" | "ManualOverride",
          },
  })

  const draft = await prisma.aSFDraft.upsert({
    where: { caseId },
    create: {
      caseId,
      vulnerableClient: !!vulnerableClient,
      sourceOfBusiness,
      purposeOfLoan,
      borrowerType,
      accountNumber: accountNumber ?? null,
      approvedByUser: false,
    },
    update: {
      vulnerableClient: !!vulnerableClient,
      sourceOfBusiness,
      purposeOfLoan,
      borrowerType,
      accountNumber: accountNumber ?? null,
      approvedByUser: false,
      approvedAt: null,
      generatedAt: new Date(),
    },
  })

  await writeAuditLog({
    caseId,
    eventType: isRegeneration ? "DraftRegenerated" : "DraftGenerated",
    entityType: "ASFDraft",
    entityId: draft.id,
  })

  return NextResponse.json({ draft, commission })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await params
  const body = await request.json()
  const { helenSplitPercent, eileenSplitPercent, reason } = body

  if (helenSplitPercent === undefined || eileenSplitPercent === undefined || !reason?.trim()) {
    return NextResponse.json(
      { error: "helenSplitPercent, eileenSplitPercent and reason are required" },
      { status: 400 }
    )
  }

  const total = Number(helenSplitPercent) + Number(eileenSplitPercent)
  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json({ error: "Split percentages must total 100" }, { status: 400 })
  }

  const existing = await prisma.commission.findUnique({ where: { caseId } })
  const oldValue = existing
    ? `Helen ${Number(existing.helenSplitPercent)}% / Eileen ${Number(existing.eileenSplitPercent)}%`
    : undefined

  const commission = await prisma.commission.upsert({
    where: { caseId },
    create: {
      caseId,
      helenSplitPercent: Number(helenSplitPercent),
      eileenSplitPercent: Number(eileenSplitPercent),
      splitRuleApplied: "ManualOverride",
    },
    update: {
      helenSplitPercent: Number(helenSplitPercent),
      eileenSplitPercent: Number(eileenSplitPercent),
      splitRuleApplied: "ManualOverride",
    },
  })

  await writeAuditLog({
    caseId,
    eventType: "CommissionOverridden",
    entityType: "Commission",
    entityId: commission.id,
    oldValue,
    newValue: `Helen ${helenSplitPercent}% / Eileen ${eileenSplitPercent}%`,
    reason,
  })

  return NextResponse.json(commission)
}
