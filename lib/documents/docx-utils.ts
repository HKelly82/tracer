// lib/documents/docx-utils.ts
// Shared helpers for .docx generation (used by suitability-generator and asf-generator)

import {
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  type IParagraphOptions,
} from "docx"
// Prisma's Decimal objects expose .toNumber(); accept either number or Decimal-like
type DecimalLike = number | { toNumber(): number }

// Calibri 11pt = 22 half-points. Line spacing 1.15 = 276 twips.
const BODY_SIZE = 22
const LINE_SPACING = 276

export function heading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
  })
}

export function bodyParagraph(text: string, extra?: Partial<IParagraphOptions>): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: BODY_SIZE,
        font: "Calibri",
      }),
    ],
    spacing: { after: 160, line: LINE_SPACING },
    ...extra,
  })
}

export function boldParagraph(text: string, extra?: Partial<IParagraphOptions>): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: BODY_SIZE,
        font: "Calibri",
      }),
    ],
    spacing: { after: 160, line: LINE_SPACING },
    ...extra,
  })
}

export function rightAlignedParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: BODY_SIZE, font: "Calibri" })],
    alignment: AlignmentType.RIGHT,
    spacing: { after: 80 },
  })
}

export function blankLine(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: "", size: BODY_SIZE })],
    spacing: { after: 80 },
  })
}

// ─── Formatters ──────────────────────────────────────────────

export function formatGBP(n: DecimalLike | null | undefined): string {
  if (n == null) return "£0.00"
  const num = typeof n === "number" ? n : n.toNumber()
  return `£${num.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPercent(n: DecimalLike | null | undefined, decimals = 2): string {
  if (n == null) return "0%"
  const num = typeof n === "number" ? n : n.toNumber()
  return `${num.toFixed(decimals)}%`
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

export function formatShortDate(d: Date | string | null | undefined): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatMonths(n: number): string {
  if (n === 1) return "1 month"
  return `${n} months`
}

export function formatYears(n: number): string {
  if (n === 1) return "1 year"
  return `${n} years`
}
