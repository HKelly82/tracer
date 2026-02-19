// lib/storage/supabase.ts
// Server-side only — uses SUPABASE_SERVICE_KEY, never exposed to client
import { createClient } from "@supabase/supabase-js"

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error("Supabase env vars not set")
  return createClient(url, key)
}

const BUCKET = () => process.env.SUPABASE_STORAGE_BUCKET ?? "mortgage-docs"

/**
 * Upload a PDF buffer to Supabase Storage.
 * Path: cases/{caseId}/{documentType}/{filename}
 * Returns the storagePath (never a public URL).
 */
export async function uploadDocument(
  caseId: string,
  buffer: Buffer,
  filename: string,
  documentType: string
): Promise<string> {
  const supabase = getClient()
  // Sanitise filename — strip path separators
  const safe = filename.replace(/[/\\]/g, "_")
  const path = `cases/${caseId}/${documentType}/${Date.now()}_${safe}`

  const { error } = await supabase.storage
    .from(BUCKET())
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return path
}

/**
 * Generate a short-lived signed URL for a given storage path.
 * Default expiry: 3600 seconds (1 hour).
 */
export async function getSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = getClient()

  const { data, error } = await supabase.storage
    .from(BUCKET())
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "no URL returned"}`)
  }

  return data.signedUrl
}
