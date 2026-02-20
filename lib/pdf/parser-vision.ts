// lib/pdf/parser-vision.ts
// Claude API vision fallback — called only for fields with regex confidence < 0.7

import Anthropic from "@anthropic-ai/sdk"

export interface VisionFieldResult {
  value: string | null
  confidence: number
  sourcePage: number | null
}

export type VisionResults = Record<string, VisionFieldResult>

/**
 * Use Claude's vision/document API to extract missing fields from a PDF.
 * Only called for fields where regex confidence < 0.7.
 */
export async function extractWithVision(
  pdfBuffer: Buffer,
  missingFields: string[]
): Promise<VisionResults> {
  if (missingFields.length === 0) return {}

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const model = process.env.ANTHROPIC_VISION_MODEL ?? "claude-opus-4-6"

  const prompt = `Extract these fields from this UK mortgage illustration (ESIS format) and return ONLY valid JSON:
${missingFields.map((f) => `- ${f}`).join("\n")}

Format:
{ "fieldName": { "value": <extracted>, "confidence": 0.95, "sourcePage": 2 } }

Rules:
- monetary: number without £/commas (148000)
- percentages: number (3.92)
- dates: ISO YYYY-MM-DD
- booleans: true/false
- sourcePage: 1-based page number where found
- not found: null with confidence 0`

  const base64Pdf = pdfBuffer.toString("base64")

  let rawText: string
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ] as Anthropic.ContentBlockParam[],
        },
      ],
    })

    const content = response.content[0]
    rawText = content.type === "text" ? content.text : ""
  } catch (err) {
    console.error("Vision fallback API error:", err)
    return {}
  }

  // Parse JSON strictly — strip markdown code fences if present
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim()
    const parsed = JSON.parse(cleaned) as Record<
      string,
      { value: unknown; confidence: number; sourcePage: number | null } | null
    >

    const results: VisionResults = {}
    for (const [key, val] of Object.entries(parsed)) {
      if (!val) {
        results[key] = { value: null, confidence: 0, sourcePage: null }
        continue
      }
      results[key] = {
        value: val.value != null ? String(val.value) : null,
        confidence: typeof val.confidence === "number" ? val.confidence : 0,
        sourcePage: typeof val.sourcePage === "number" ? val.sourcePage : null,
      }
    }
    return results
  } catch (err) {
    console.error("Vision fallback JSON parse error:", err, "\nRaw:", rawText)
    return {}
  }
}
