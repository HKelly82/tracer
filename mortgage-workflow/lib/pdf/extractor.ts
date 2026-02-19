// lib/pdf/extractor.ts
// Hybrid PDF extraction: regex first, Claude vision fallback for low-confidence fields

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse")

import { prisma } from "@/lib/db/prisma"
import { extractWithRegex, type RegexResult } from "./parser-regex"
import { extractWithVision } from "./parser-vision"
import { REQUIRED_FIELDS, MONETARY_FIELDS, DATE_FIELDS } from "./field-mappings"

export interface ExtractionResult {
  documentId: string
  illustrationSnapshotId: string | null
  fieldCount: number
  usedVisionFallback: boolean
  missingRequiredFields: string[]
}

/**
 * Full extraction pipeline for an uploaded PDF.
 * Runs regex, calls vision for low-confidence fields, persists all results.
 */
export async function extractFromPdf(
  pdfBuffer: Buffer,
  documentId: string,
  caseId: string,
  variant: "FeeAdded" | "FeeUpfront" | "None" = "None"
): Promise<ExtractionResult> {
  // --- 1. Parse PDF text ---
  let rawText = ""
  let numpages = 1
  try {
    const parsed = await pdfParse(pdfBuffer)
    rawText = parsed.text as string
    numpages = parsed.numpages as number
  } catch (err) {
    console.error("pdf-parse failed:", err)
    // Continue with empty text — vision fallback will handle it
  }

  // --- 2. Regex extraction ---
  const regexResults = extractWithRegex(rawText)

  // --- 3. Check required fields for low confidence ---
  const lowConfidenceFields = REQUIRED_FIELDS.filter((field) => {
    const result = regexResults.get(field)
    return !result || result.confidence < 0.7
  })

  // --- 4. Vision fallback for missing / low-confidence required fields ---
  let usedVisionFallback = false
  if (lowConfidenceFields.length > 0) {
    usedVisionFallback = true
    try {
      const visionResults = await extractWithVision(pdfBuffer, [...lowConfidenceFields])

      // Merge: vision overrides regex ONLY for fields where regex confidence was low
      for (const field of lowConfidenceFields) {
        const v = visionResults[field]
        if (v && v.value != null && v.confidence > 0) {
          regexResults.set(field, {
            fieldKey: field,
            valueRaw: v.value,
            valueNormalized: v.value,
            confidence: v.confidence,
            sourcePage: v.sourcePage ?? undefined,
            fieldType: DATE_FIELDS.has(field) ? "Date"
              : MONETARY_FIELDS.has(field) ? "Number"
              : "String",
          })
        }
      }
    } catch (err) {
      console.error("Vision fallback failed:", err)
    }
  }

  // --- 5. Handle loanAmountWithFeeAdded special case ---
  const feeAddedResult = regexResults.get("loanAmountWithFeeAdded")
  let arrangementFeeAddedToLoan = false
  let feeAmountFromPattern: string | null = null

  if (feeAddedResult) {
    // valueNormalized is "loanAmt|feeAmt"
    const parts = feeAddedResult.valueNormalized.split("|")
    if (parts.length === 2) {
      arrangementFeeAddedToLoan = true
      feeAmountFromPattern = parts[1]
      // Ensure loanAmount uses the base amount (before fee)
      if (!regexResults.has("loanAmount") || (regexResults.get("loanAmount")?.confidence ?? 0) < 0.5) {
        regexResults.set("loanAmount", {
          fieldKey: "loanAmount",
          valueRaw: parts[0],
          valueNormalized: parts[0],
          confidence: 0.95,
          sourcePage: feeAddedResult.sourcePage,
          fieldType: "Number",
        })
      }
    }
  }

  // Also check the boolean flag
  const feeAddedFlagResult = regexResults.get("arrangementFeeAddedToLoan")
  if (feeAddedFlagResult?.valueNormalized === "true") {
    arrangementFeeAddedToLoan = true
  }

  // --- 6. Persist ExtractedField records ---
  const fieldsToPersist = Array.from(regexResults.entries())
    .filter(([key]) => key !== "loanAmountWithFeeAdded") // internal use only

  await prisma.extractedField.deleteMany({ where: { documentId } })

  await prisma.extractedField.createMany({
    data: fieldsToPersist.map(([key, result]) => ({
      documentId,
      fieldKey: key,
      valueRaw: result.valueRaw,
      valueNormalized: result.valueNormalized,
      valueType: result.fieldType,
      confidence: result.confidence,
      sourcePage: result.sourcePage ?? null,
    })),
  })

  // --- 7. Build IllustrationSnapshot from extracted values ---
  function getVal(key: string): string | undefined {
    return regexResults.get(key)?.valueNormalized
  }

  function getNum(key: string, fallback = 0): number {
    const v = getVal(key)
    if (!v) return fallback
    const n = parseFloat(v.replace(/,/g, ""))
    return isNaN(n) ? fallback : n
  }

  const lenderName = getVal("lenderName") ?? ""
  const productName = getVal("productDescription") ?? getVal("lenderName") ?? ""
  const loanAmount = getNum("loanAmount")
  const termYears = parseInt(getVal("termYears") ?? "0", 10)
  const propertyValue = getNum("propertyValue")
  const initialRatePercent = getNum("initialRatePercent")
  const reversionRatePercent = getNum("reversionRatePercent")
  const monthlyPaymentInitial = getNum("monthlyPaymentInitial")
  const monthlyPaymentReversion = getNum("monthlyPaymentReversion")
  const aprcPercent = getNum("aprcPercent")
  const totalAmountRepayable = getNum("totalAmountRepayable")
  const arrangementFeeAmount = feeAmountFromPattern
    ? parseFloat(feeAmountFromPattern)
    : getNum("arrangementFeeAmount")
  const brokerFeeAmount = getNum("brokerFeeAmount")
  const procFeeAmount = getVal("procFeeAmount") ? getNum("procFeeAmount") : null
  const cashbackAmount = getVal("cashbackAmount") ? getNum("cashbackAmount") : null
  const overpaymentPercent = getVal("overpaymentPercent") ? getNum("overpaymentPercent") : null
  const portability = regexResults.get("portability")?.valueNormalized === "true"
  const productCode = getVal("productCode") ?? null
  const ercSummaryText: string | null = null // extracted in later slice

  // Parse initialRateEndDate
  let initialRateEndDate: Date
  const rateEndRaw = getVal("initialRateEndDate")
  try {
    initialRateEndDate = rateEndRaw ? new Date(rateEndRaw) : new Date()
    if (isNaN(initialRateEndDate.getTime())) initialRateEndDate = new Date()
  } catch {
    initialRateEndDate = new Date()
  }

  // Only create a snapshot if we have the minimum required fields
  const missingRequiredFields = REQUIRED_FIELDS.filter((f) => {
    const v = regexResults.get(f)
    return !v || v.confidence < 0.7
  })

  let illustrationSnapshotId: string | null = null

  if (lenderName && loanAmount > 0 && termYears > 0) {
    // If fee detected but caller passed variant "None", upgrade to "FeeAdded"
    const effectiveVariant = (arrangementFeeAddedToLoan && variant === "None") ? "FeeAdded" : variant

    // Upsert illustration snapshot (one per document)
    const snapshot = await prisma.illustrationSnapshot.upsert({
      where: { documentId },
      create: {
        caseId,
        documentId,
        variant: effectiveVariant,
        lenderName,
        productName,
        productCode,
        repaymentMethod: "Repayment",
        loanAmount,
        termYears,
        propertyValue: propertyValue || 0,
        initialRatePercent,
        initialRateEndDate,
        reversionRatePercent,
        monthlyPaymentInitial,
        monthlyPaymentReversion,
        aprcPercent,
        totalAmountRepayable,
        arrangementFeeAmount,
        arrangementFeeAddedToLoan,
        brokerFeeAmount,
        procFeeAmount,
        cashbackAmount,
        ercSummaryText,
        portability,
        overpaymentPercent,
      },
      update: {
        lenderName,
        productName,
        productCode,
        loanAmount,
        termYears,
        propertyValue: propertyValue || 0,
        initialRatePercent,
        initialRateEndDate,
        reversionRatePercent,
        monthlyPaymentInitial,
        monthlyPaymentReversion,
        aprcPercent,
        totalAmountRepayable,
        arrangementFeeAmount,
        arrangementFeeAddedToLoan,
        brokerFeeAmount,
        procFeeAmount,
        cashbackAmount,
        portability,
        overpaymentPercent,
        variant: effectiveVariant,
      },
    })
    illustrationSnapshotId = snapshot.id
  }

  // --- 8. Update document parse status ---
  await prisma.document.update({
    where: { id: documentId },
    data: {
      parseStatus: missingRequiredFields.length === 0 ? "Parsed"
        : missingRequiredFields.length <= 2 ? "Partial"
        : "Failed",
    },
  })

  return {
    documentId,
    illustrationSnapshotId,
    fieldCount: fieldsToPersist.length,
    usedVisionFallback,
    missingRequiredFields,
  }
}
