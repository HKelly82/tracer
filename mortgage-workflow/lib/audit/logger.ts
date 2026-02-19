// lib/audit/logger.ts
import { prisma } from "@/lib/db/prisma"
import type { AuditEventType } from "@/types"

export interface AuditLogInput {
  caseId: string
  eventType: AuditEventType
  entityType?: string
  entityId?: string
  fieldKey?: string
  oldValue?: string
  newValue?: string
  reason?: string
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLogEvent.create({
    data: {
      caseId: input.caseId,
      eventType: input.eventType,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      fieldKey: input.fieldKey ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      reason: input.reason ?? null,
    },
  })
}
