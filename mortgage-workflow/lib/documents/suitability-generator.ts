// lib/documents/suitability-generator.ts
// Generates a Suitability Letter as a .docx Buffer

import crypto from "crypto"
import { Document, Packer } from "docx"
import {
  bodyParagraph,
  boldParagraph,
  rightAlignedParagraph,
  blankLine,
  formatGBP,
  formatPercent,
  formatDate,
  formatYears,
} from "./docx-utils"
import type { IllustrationSnapshot, SuitabilityDraft } from "@prisma/client"

// ─── Justification presets (§8.3) ────────────────────────────

export const JUSTIFICATION_PRESETS: Record<string, string> = {
  rate_security_5yr:
    "A Fixed Rate is being recommended because you prefer the security of knowing your monthly payments will not fluctuate during the initial term. I have recommended a Fixed Rate period of 5 years because {{custom_reason}}.",
  rate_security_2yr:
    "A Fixed Rate is being recommended because you prefer the security of knowing your monthly payments will not fluctuate during the initial term. I have recommended a Fixed Rate period of 2 years because {{custom_reason}}.",
  reduce_payment:
    "In order to ensure that your monthly payments remain within your budget, you wanted to reduce your monthly mortgage costs. {{custom_reason}}.",
  product_switch:
    "Your existing mortgage rate is due to expire and to avoid being moved onto the lender's standard variable rate, I have recommended this product switch. {{custom_reason}}.",
  remortgage_better_rate:
    "Your existing mortgage rate is due to expire and following a whole of market review I have identified a more competitive rate with {{lenderName}}. {{custom_reason}}.",
  flexibility_review:
    "I have recommended a {{term}} year Fixed Rate because you wanted the flexibility to review your mortgage at the end of the term, at which point you feel that interest rates may have changed. {{custom_reason}}.",
}

// ─── Input hash (§8.9) ───────────────────────────────────────

export function computeInputHash(snapshot: IllustrationSnapshot): string {
  const fields = [
    snapshot.loanAmount,
    snapshot.termYears,
    snapshot.initialRatePercent,
    snapshot.initialRateEndDate,
    snapshot.reversionRatePercent,
    snapshot.monthlyPaymentInitial,
    snapshot.monthlyPaymentReversion,
    snapshot.aprcPercent,
    snapshot.totalAmountRepayable,
    snapshot.arrangementFeeAmount,
    snapshot.arrangementFeeAddedToLoan,
  ]
  return crypto.createHash("sha256").update(JSON.stringify(fields)).digest("hex")
}

// ─── Letter generator ─────────────────────────────────────────

interface FeeDisclosure {
  interestChargedOnFee: number
}

export async function generateSuitabilityLetter(
  draft: SuitabilityDraft,
  snapshot: IllustrationSnapshot,
  feeDisclosure: FeeDisclosure | null,
  clientName: string
): Promise<Buffer> {
  const today = formatDate(new Date())
  const illustrationDate = formatDate(snapshot.createdAt)
  const rateType = snapshot.initialRateEndDate ? "Fixed" : "Variable"

  // ── Justification text ──
  let justificationText = ""
  if (draft.justificationMode === "Preset" && draft.presetJustificationKey) {
    let preset = JUSTIFICATION_PRESETS[draft.presetJustificationKey] ?? ""
    // Replace template vars
    preset = preset.replace(/\{\{custom_reason\}\}/g, draft.manualJustificationText ?? "")
    preset = preset.replace(/\{\{lenderName\}\}/g, snapshot.lenderName)
    preset = preset.replace(/\{\{term\}\}/g, String(snapshot.termYears))
    justificationText = preset
  } else {
    justificationText = draft.manualJustificationText ?? ""
  }

  const paragraphs = [
    // Header
    rightAlignedParagraph(clientName),
    rightAlignedParagraph(today),
    blankLine(),

    // Salutation
    bodyParagraph(`Dear ${clientName},`),
    blankLine(),

    // Standard intro
    boldParagraph("Mortgage Recommendation"),
    bodyParagraph(
      "Following our recent discussions and having considered your personal and financial circumstances, I am pleased to confirm my mortgage recommendation."
    ),
    blankLine(),

    // Objectives
    boldParagraph("Your Mortgage Objectives"),
    bodyParagraph(draft.objectiveNotes ?? ""),
    blankLine(),

    // Recommendation (§8.2)
    boldParagraph("My Recommendation"),
    bodyParagraph(
      `A ${formatYears(snapshot.termYears)} ${rateType.toLowerCase()} rate mortgage with ${snapshot.lenderName}, on a ${snapshot.repaymentMethod.toLowerCase()} basis.`
    ),
    bodyParagraph(
      `The initial interest rate of ${formatPercent(snapshot.initialRatePercent)} will be applied until ${formatDate(snapshot.initialRateEndDate)}, resulting in monthly payments of ${formatGBP(snapshot.monthlyPaymentInitial)}. The monthly payments, after the end of this rate would be ${formatGBP(snapshot.monthlyPaymentReversion)}, this is based on the lender's current variable rate of ${formatPercent(snapshot.reversionRatePercent)}, which is subject to change and could go up, therefore you may have to pay more than the figure quoted.`
    ),
    blankLine(),

    // Justification (§8.3)
    boldParagraph("Why I Recommend This Product"),
    bodyParagraph(justificationText),
    blankLine(),
  ]

  // Conditional — Fee Added (§8.4)
  if (draft.includeFeeAddedSection && feeDisclosure) {
    paragraphs.push(
      boldParagraph("Arrangement Fee"),
      bodyParagraph(
        `You have agreed and given permission for fees of ${formatGBP(snapshot.arrangementFeeAmount)} to be added to the loan to cover the lender's arrangement fee. Interest of ${formatGBP(feeDisclosure.interestChargedOnFee)} will be charged on this amount over the whole term of the mortgage.`
      ),
      blankLine()
    )
  }

  // ERC (§8.5) — always included
  paragraphs.push(
    boldParagraph("Early Repayment Charges"),
    bodyParagraph(
      `Early redemption penalties apply to the mortgage I have recommended. This means if you repay the mortgage within the initial rate period you will have to repay the amount outstanding, and an additional amount based on a percentage of your mortgage balance. The exact charge will depend on the date at which you make the repayment. Full details are included in your mortgage illustration dated ${illustrationDate}.`
    ),
    blankLine()
  )

  // Affordability
  paragraphs.push(
    boldParagraph("Affordability"),
    bodyParagraph(draft.affordabilitySummary ?? ""),
    blankLine()
  )

  // Conditional — Portability (§8.6)
  if (draft.includePortabilitySection) {
    paragraphs.push(
      boldParagraph("Portability"),
      bodyParagraph(
        "This mortgage is portable, meaning you have the right to transfer this product to a new mortgage on another property, subject to meeting the lender's criteria at that time."
      ),
      blankLine()
    )
  }

  // Conditional — Overpayments (§8.7)
  if (draft.includeOverpaymentSection && snapshot.overpaymentPercent != null) {
    paragraphs.push(
      boldParagraph("Overpayments"),
      bodyParagraph(
        `This mortgage allows overpayments of up to ${formatPercent(snapshot.overpaymentPercent, 0)}% of the outstanding balance per year without incurring early repayment charges. Overpayments in excess of this may attract early repayment charges on the excess amount.`
      ),
      blankLine()
    )
  }

  // Closing paragraphs (§8.8)
  paragraphs.push(
    bodyParagraph(
      `My recommendation is in keeping with your mortgage objectives, based on your current income and expenditure the repayments are affordable, and my research indicates you will meet the lender's lending criteria. Based on current interest rates the loan will continue to be affordable at the end of the ${rateType.toLowerCase()} rate period.`
    ),
    blankLine(),
    bodyParagraph(
      "There will be other costs and charges associated with arranging your new mortgage. These have been detailed in the documentation presented to you."
    ),
    blankLine(),
    bodyParagraph(`I have provided you with a Mortgage Illustration dated ${illustrationDate}.`),
    blankLine(),
    bodyParagraph("Should you require further information please do not hesitate to contact me."),
    blankLine(),
    bodyParagraph("Yours sincerely,"),
    blankLine(),
    blankLine(),
    boldParagraph("Helen Kelly"),
    bodyParagraph("Mortgage & Protection Adviser"),
  )

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
