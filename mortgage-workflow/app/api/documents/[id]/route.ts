// GET /api/documents/[id] — returns document + extracted fields + signed URL
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { getSignedUrl } from "@/lib/storage/supabase"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const document = await prisma.document.findUnique({
    where: { id },
    include: { extractedFields: { orderBy: { fieldKey: "asc" } } },
  })

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Generate signed URL for PDF viewer — never expose raw storage path
  let signedUrl: string | null = null
  try {
    signedUrl = await getSignedUrl(document.storagePath)
  } catch (err) {
    console.error("Could not generate signed URL:", err)
  }

  // Fetch associated illustration snapshot
  const illustrationSnapshot = await prisma.illustrationSnapshot.findUnique({
    where: { documentId: id },
  })

  return NextResponse.json({
    ...document,
    signedUrl,
    illustrationSnapshot,
  })
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}

export async function PATCH() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}
