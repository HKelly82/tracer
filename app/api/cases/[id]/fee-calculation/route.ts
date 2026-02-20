// POST /api/cases/[id]/fee-calculation — compute & persist fee disclosure calculation
// GET  /api/cases/[id]/fee-calculation — return existing calculation
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: caseId } = await params

  const illustrations = await prisma.illustrationSnapshot.findMany({
    where: { caseId },
  })

  const feeAdded = illustrations.find(
    (i) => i.variant === "FeeAdded" || i.variant === "None"
  )
  const feeUpfront = illustrations.find((i) => i.variant === "FeeUpfront")

  if (!feeAdded?.confirmed || !feeUpfront?.confirmed) {
    return NextResponse.json(
      { error: "Both illustrations must be confirmed before calculating fee disclosure" },
      { status: 400 }
    )
  }

  const totalRepayableFeeAdded = Number(feeAdded.totalAmountRepayable)
  const totalRepayableFeeUpfront = Number(feeUpfront.totalAmountRepayable)
  const interestChargedOnFee = totalRepayableFeeAdded - totalRepayableFeeUpfront
  const feeAddedAmount = Number(feeAdded.arrangementFeeAmount)

  const calc = await prisma.feeDisclosureCalculation.upsert({
    where: { caseId },
    create: {
      caseId,
      feeAddedAmount,
      totalRepayableFeeAdded,
      totalRepayableFeeUpfront,
      interestChargedOnFee,
    },
    update: {
      feeAddedAmount,
      totalRepayableFeeAdded,
      totalRepayableFeeUpfront,
      interestChargedOnFee,
      calculatedAt: new Date(),
    },
  })

  return NextResponse.json(calc)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: caseId } = await params

  const calc = await prisma.feeDisclosureCalculation.findUnique({
    where: { caseId },
  })

  return NextResponse.json(calc ?? null)
}
