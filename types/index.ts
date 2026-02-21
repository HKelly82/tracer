// Shared TypeScript types

export type Stage =
  | "Lead"
  | "Research"
  | "ChaseClient"
  | "ClientResponse"
  | "DIP"
  | "PostDIPChase"
  | "AwaitingNB"
  | "NBSubmitted"
  | "LenderProcessing"
  | "Offered"
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

export type WaitingOn = "Me" | "Client" | "Lender" | "Passive"

export type LeadSource = "Eileen" | "Direct"

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
  | "TaskCompleted"
  | "TaskSkipped"
  | "NoteAdded"
  | "WaitingOnChanged"
  | "DocumentCheckCompleted"

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
  waitingOn: WaitingOn
  leadSource: LeadSource
  clientSummary: string | null
  feeArrangement: string | null
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
