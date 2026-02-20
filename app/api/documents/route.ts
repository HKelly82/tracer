// POST /api/documents — upload PDF, extract fields, return document + snapshot
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { uploadDocument } from "@/lib/storage/supabase"
import { extractFromPdf } from "@/lib/pdf/extractor"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const caseId = formData.get("caseId") as string | null
  const documentType = (formData.get("documentType") as string | null) ?? "Illustration"
  const variant = (formData.get("variant") as string | null) ?? "None"

  if (!file || !caseId) {
    return NextResponse.json({ error: "file and caseId are required" }, { status: 400 })
  }

  if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 })
  }

  // Read file into buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload to Supabase Storage
  const storagePath = await uploadDocument(caseId, buffer, file.name, documentType)

  // Create Document record
  const document = await prisma.document.create({
    data: {
      caseId,
      documentType: documentType as "Illustration" | "Offer" | "Application" | "Other",
      variant: variant as "FeeAdded" | "FeeUpfront" | "None" | null,
      originalFilename: file.name,
      storagePath,
      parseStatus: "Parsed",
    },
  })

  // Run hybrid extraction synchronously
  let extractionResult = null
  try {
    extractionResult = await extractFromPdf(
      buffer,
      document.id,
      caseId,
      (variant as "FeeAdded" | "FeeUpfront" | "None") ?? "None"
    )
  } catch (err) {
    console.error("Extraction failed:", err)
    await prisma.document.update({
      where: { id: document.id },
      data: { parseStatus: "Failed" },
    })
  }

  // Fetch the complete document with extracted fields
  const fullDocument = await prisma.document.findUniqueOrThrow({
    where: { id: document.id },
    include: { extractedFields: true },
  })

  // Fetch the illustration snapshot if created
  const illustrationSnapshot = extractionResult?.illustrationSnapshotId
    ? await prisma.illustrationSnapshot.findUnique({
        where: { id: extractionResult.illustrationSnapshotId },
      })
    : null

  return NextResponse.json({
    document: fullDocument,
    illustrationSnapshot,
    usedVisionFallback: extractionResult?.usedVisionFallback ?? false,
    missingRequiredFields: extractionResult?.missingRequiredFields ?? [],
  }, { status: 201 })
}
