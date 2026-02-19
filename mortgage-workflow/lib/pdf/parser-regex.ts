// lib/pdf/parser-regex.ts
// Regex-based PDF text extraction

import {
  ESIS_PATTERNS,
  MONETARY_FIELDS,
  PERCENT_FIELDS,
  DATE_FIELDS,
  BOOLEAN_FIELDS,
  MULTI_GROUP_FIELDS,
} from "./field-mappings"

export interface RegexResult {
  fieldKey: string
  valueRaw: string
  valueNormalized: string
  confidence: number
  sourcePage: number | undefined
  fieldType: "String" | "Number" | "Date" | "Boolean"
}

// Split pdf-parse text output into pages using form-feed character (\f)
function splitIntoPages(text: string): string[] {
  return text.split(/\f/)
}

// Find which page (1-based) a matched string appears on
function findPage(pages: string[], matchedValue: string): number | undefined {
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].includes(matchedValue)) return i + 1
  }
  return undefined
}

// Parse a UK date string into ISO YYYY-MM-DD
function parseUKDate(raw: string): string {
  // "31 March 2029" / "31-03-2029" / "31/03/2029"
  const clean = raw.trim()

  // Try "dd Month yyyy" or "dd-Month-yyyy"
  const longMatch = clean.match(
    /(\d{1,2})[\s-](January|February|March|April|May|June|July|August|September|October|November|December)[\s-](\d{4})/i
  )
  if (longMatch) {
    const MONTHS: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04",
      may: "05", june: "06", july: "07", august: "08",
      september: "09", october: "10", november: "11", december: "12",
    }
    const day = longMatch[1].padStart(2, "0")
    const month = MONTHS[longMatch[2].toLowerCase()]
    const year = longMatch[3]
    if (month) return `${year}-${month}-${day}`
  }

  // Try "dd/mm/yyyy" or "dd-mm-yyyy"
  const shortMatch = clean.match(/(\d{2})[/-](\d{2})[/-](\d{2,4})/)
  if (shortMatch) {
    const day = shortMatch[1]
    const month = shortMatch[2]
    let year = shortMatch[3]
    if (year.length === 2) year = `20${year}`
    return `${year}-${month}-${day}`
  }

  return clean // Return as-is if unparseable
}

// Normalize a monetary value — strip commas
function normalizeMoney(raw: string): string {
  return raw.replace(/,/g, "").trim()
}

function getFieldType(fieldKey: string): "String" | "Number" | "Date" | "Boolean" {
  if (BOOLEAN_FIELDS.has(fieldKey)) return "Boolean"
  if (DATE_FIELDS.has(fieldKey)) return "Date"
  if (MONETARY_FIELDS.has(fieldKey) || PERCENT_FIELDS.has(fieldKey)) return "Number"
  return "String"
}

/**
 * Run regex extraction over a raw PDF text string.
 * Returns one RegexResult per field key (or undefined if not found).
 */
export function extractWithRegex(rawText: string): Map<string, RegexResult> {
  const pages = splitIntoPages(rawText)
  const results = new Map<string, RegexResult>()

  for (const [fieldKey, patterns] of Object.entries(ESIS_PATTERNS)) {
    // Boolean fields — just check if the pattern exists in text
    if (BOOLEAN_FIELDS.has(fieldKey)) {
      for (const pattern of patterns) {
        if (pattern.test(rawText)) {
          results.set(fieldKey, {
            fieldKey,
            valueRaw: "true",
            valueNormalized: "true",
            confidence: 0.95,
            sourcePage: findPage(pages, "true") ?? 1,
            fieldType: "Boolean",
          })
          break
        }
      }
      if (!results.has(fieldKey)) {
        results.set(fieldKey, {
          fieldKey,
          valueRaw: "false",
          valueNormalized: "false",
          confidence: 0.95,
          sourcePage: undefined,
          fieldType: "Boolean",
        })
      }
      continue
    }

    // loanAmountWithFeeAdded — special 2-group pattern
    if (fieldKey === "loanAmountWithFeeAdded") {
      for (const pattern of patterns) {
        const m = rawText.match(pattern)
        if (m) {
          // group[1] = loan amount, group[2] = fee amount
          // We store this as a JSON-encoded pair; the extractor will handle it
          const loanAmt = normalizeMoney(m[1])
          const feeAmt = normalizeMoney(m[2])
          const raw = `${m[1]}|${m[2]}`
          results.set(fieldKey, {
            fieldKey,
            valueRaw: raw,
            valueNormalized: `${loanAmt}|${feeAmt}`,
            confidence: 0.95,
            sourcePage: findPage(pages, m[0].slice(0, 40)),
            fieldType: "Number",
          })
          break
        }
      }
      continue
    }

    // Standard fields
    for (const pattern of patterns) {
      const m = rawText.match(pattern)
      if (!m) continue

      // For multi-group fields (monthlyPaymentInitial, monthlyPaymentReversion),
      // the value is in the LAST capture group
      let valueRaw: string
      if (MULTI_GROUP_FIELDS.has(fieldKey)) {
        valueRaw = m[m.length - 1] // last capture group
      } else {
        valueRaw = m[1]
      }

      // Normalize based on field type
      let valueNormalized: string
      const type = getFieldType(fieldKey)
      if (MONETARY_FIELDS.has(fieldKey)) {
        valueNormalized = normalizeMoney(valueRaw)
      } else if (DATE_FIELDS.has(fieldKey)) {
        valueNormalized = parseUKDate(valueRaw)
      } else {
        valueNormalized = valueRaw.trim()
      }

      const sourcePage = findPage(pages, valueRaw.trim())

      results.set(fieldKey, {
        fieldKey,
        valueRaw: valueRaw.trim(),
        valueNormalized,
        confidence: 0.95,
        sourcePage,
        fieldType: type,
      })
      break // first matching pattern wins
    }
  }

  return results
}
