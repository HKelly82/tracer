// Shared TypeScript types

export type Stage =
  | "Research"
  | "ChaseClient"
  | "DIP"
  | "PostDIPChase"
  | "AwaitingNB"
  | "NBSubmitted"
  | "Closed"
  | "Completed"

export type StageVariant = "PostDIPChase"

export type CaseStatus = "Active" | "Closed" | "Completed"

export type CaseType =
  | "FTB"
  | "HomeMover"
  | "Remortgage"
  | "BTL"
  | "ProductSwitch"
  | "Other"

export type RepaymentMethod = "Repayment" | "InterestOnly" | "PartAndPart"

export type AuditEventType =
  | "StageChanged"
  | "FieldConfirmed"
  | "FieldOverridden"
  | "DateOverridden"
  | "DraftGenerated"
  | "DraftRegenerated"
  | "OfferMismatchAcknowledged"
  | "CaseClosed"
  | "CaseReopened"
  | "CommissionOverridden"

export interface PrimaryAction {
  label: string
  action: string
}

export interface CaseSummary {
  id: string
  clientName: string
  lateNbSubmission?: boolean
  caseType: CaseType
  status: CaseStatus
  stage: Stage
  stageVariant: StageVariant | null
  stageStartedAt: string
  stageDueAt: string
  lastActionAt: string
  priorityScore: number
  daysRemaining: number
  daysOverdue: number
}

export interface AuditLogEventRecord {
  id: string
  caseId: string
  eventType: AuditEventType
  entityType: string | null
  entityId: string | null
  fieldKey: string | null
  oldValue: string | null
  newValue: string | null
  reason: string | null
  createdAt: string
}
