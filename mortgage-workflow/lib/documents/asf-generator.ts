// lib/documents/asf-generator.ts
// Generates an Adviser Summary Form (ASF) as a .docx Buffer

import { Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle } from "docx"
import { formatGBP, formatPercent, formatDate, formatShortDate } from "./docx-utils"
import type { ASFDraft, Commission, IllustrationSnapshot, Case } from "@prisma/client"

// ─── Commission logic (§9.2) ──────────────────────────────────

export function calculateCommission(
  sharedCase: boolean,
  existingCommission?: Commission | null
): { helenSplitPercent: number; eileenSplitPercent: number; splitRuleApplied: string } {
  if (existingCommission?.splitRuleApplied === "ManualOverride") {
    return {
      helenSplitPercent: Number(existingCommission.helenSplitPercent),
      eileenSplitPercent: Number(existingCommission.eileenSplitPercent),
      splitRuleApplied: "ManualOverride",
    }
  }
  if (sharedCase) {
    return { helenSplitPercent: 70, eileenSplitPercent: 30, splitRuleApplied: "Shared7030" }
  }
  return { helenSplitPercent: 100, eileenSplitPercent: 0, splitRuleApplied: "DefaultHelen100" }
}

// ─── Table helpers ────────────────────────────────────────────

const BORDER_THIN = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
}

function cell(text: string, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20, font: "Calibri" })],
        spacing: { after: 60 },
      }),
    ],
    borders: BORDER_THIN,
  })
}

function labelCell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20, font: "Calibri", color: "555555" })],
        spacing: { after: 60 },
      }),
    ],
    borders: BORDER_THIN,
    shading: { fill: "F5F5F5" },
  })
}

function row(...cells: TableCell[]): TableRow {
  return new TableRow({ children: cells })
}

function fullWidthTable(rows: TableRow[]): Table {
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
  })
}

function spacer(): Paragraph {
  return new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, font: "Calibri", color: "2D3748" })],
    spacing: { after: 80, before: 160 },
  })
}

// ─── Main generator ───────────────────────────────────────────

export async function generateASF(
  draft: ASFDraft,
  snapshot: IllustrationSnapshot,
  commission: Commission,
  caseRecord: Pick<Case, "clientName" | "applicationSubmittedAt" | "sharedCase">
): Promise<Buffer> {
  const today = formatShortDate(new Date())
  const productType = snapshot.initialRateEndDate ? "Fixed Rate" : "Variable Rate"
  const featureExpires = snapshot.initialRateEndDate
    ? formatDate(snapshot.initialRateEndDate)
    : "N/A"

  const helenPct = Number(commission.helenSplitPercent)
  const eileenPct = Number(commission.eileenSplitPercent)
  const feeRequested = commission.feeWaived ? "No" : "Yes"

  // ── Table 0: Identification ──
  const table0 = fullWidthTable([
    row(
      labelCell("Client name"),
      cell(caseRecord.clientName),
      labelCell("Adviser"),
      cell("Helen Kelly"),
    ),
    row(
      labelCell("Vulnerable client"),
      cell(draft.vulnerableClient ? "Yes" : "No"),
      labelCell("Date"),
      cell(today),
    ),
  ])

  // ── Table 1: Addresses ──
  const table1 = fullWidthTable([
    row(
      labelCell("Current address"),
      cell(""),
      labelCell("Mortgage property address"),
      cell(""),
    ),
  ])

  // ── Table 2: Business details ──
  const table2 = fullWidthTable([
    row(
      labelCell("Source of business"),
      cell(draft.sourceOfBusiness ?? ""),
      labelCell("Lender"),
      cell(snapshot.lenderName),
    ),
    row(
      labelCell("Product type"),
      cell(productType),
      labelCell("Purpose of loan"),
      cell(draft.purposeOfLoan ?? ""),
    ),
    row(
      labelCell("Type of borrower"),
      cell(draft.borrowerType ?? ""),
      labelCell("Repayment method"),
      cell(snapshot.repaymentMethod),
    ),
  ])

  // ── Table 3: Mortgage details ──
  const table3 = fullWidthTable([
    row(
      labelCell("Application date"),
      cell(caseRecord.applicationSubmittedAt ? formatShortDate(caseRecord.applicationSubmittedAt) : ""),
      labelCell("Account number"),
      cell(draft.accountNumber ?? ""),
    ),
    row(
      labelCell("Loan amount"),
      cell(formatGBP(snapshot.loanAmount)),
      labelCell("Mortgage term"),
      cell(`${snapshot.termYears} years`),
    ),
    row(
      labelCell("Property value"),
      cell(formatGBP(snapshot.propertyValue)),
      labelCell("Monthly repayment"),
      cell(formatGBP(snapshot.monthlyPaymentInitial)),
    ),
    row(
      labelCell("Rate type"),
      cell(productType),
      labelCell("Interest rate"),
      cell(formatPercent(snapshot.initialRatePercent)),
    ),
    row(
      labelCell("Feature expires"),
      cell(featureExpires),
      labelCell(""),
      cell(""),
    ),
  ])

  // ── Table 4: Fees ──
  const table4 = fullWidthTable([
    row(
      labelCell("Proc fee"),
      cell(snapshot.procFeeAmount != null ? formatGBP(snapshot.procFeeAmount) : ""),
      labelCell("Fee requested"),
      cell(feeRequested),
    ),
    row(
      labelCell("Client fee"),
      cell(formatGBP(snapshot.brokerFeeAmount)),
      labelCell(""),
      cell(""),
    ),
  ])

  // ── Table 5: Commission splits ──
  const table5 = fullWidthTable([
    row(
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Commission Splits", bold: true, size: 22, font: "Calibri" })],
            spacing: { after: 60 },
          }),
        ],
        columnSpan: 4,
        borders: BORDER_THIN,
        shading: { fill: "EDF2F7" },
      }),
    ),
    row(
      labelCell("Helen Kelly"),
      cell(`${helenPct}%`),
      labelCell("Eileen Kelly"),
      cell(`${eileenPct}%`),
    ),
  ])

  const children = [
    sectionHeading("Adviser Summary Form"),
    spacer(),
    table0,
    spacer(),
    table1,
    spacer(),
    sectionHeading("Business Details"),
    table2,
    spacer(),
    sectionHeading("Mortgage Details"),
    table3,
    spacer(),
    sectionHeading("Fees"),
    table4,
    spacer(),
    table5,
  ]

  const doc = new Document({
    sections: [{ properties: {}, children }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
