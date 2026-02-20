# IMPLEMENTATION SPEC V2
## Mortgage Adviser Workflow Tool — Upgrade from v1 to v2
### For Claude Code

---

## ⚠️ UPGRADE CONTEXT — READ BEFORE BUILDING

This is an upgrade of an existing, working v1 codebase. The v1 implementation is documented in
IMPLEMENTATION_SPEC.md, Implementation_Progress.md, and Slice_Close_Out_Reports.md.

**What is retained from v1 (DO NOT rewrite):**
- Authentication (NextAuth v5, credentials provider, proxy.ts)
- PDF extraction engine (regex + vision hybrid)
- Audit logging infrastructure (writeAuditLog, AuditLogEvent model)
- Document generation library (docx npm, docx-utils.ts)
- Supabase storage integration
- Prisma client singleton (lib/db/prisma.ts) — including $extends middleware
- Stage engine (timer.ts, transitions.ts, priority.ts) — extended, not replaced

**What is replaced:**
- Dashboard (table → Kanban board)
- Case view (static panels → stage-aware dynamic panels)
- Case creation modal (basic → full lead intake)
- SL/ASF generation UX (approve-then-download → download-then-mark-complete)

**What is added:**
- WaitingOn enum + field on Case
- LeadSource enum + field on Case
- Task model (per-case waterfall tasks)
- Note model (free-text notes)
- DocumentChecklist model (per-person document tracking)
- Person model (joint applicants)
- Kanban board UI with drag-and-drop stage transitions
- Stage-aware case view rendering
- DIP Readiness checklist panel
- NB Readiness panel
- Quick Notes sidebar
- "Waiting on" selector

---

## 1. SCHEMA CHANGES

### 1.1 New Enums
```prisma
enum WaitingOn { Me Client Lender Passive }
enum LeadSource { Eileen Direct }
enum TaskStatus { Pending InProgress Complete Skipped }
```

### 1.2 Changes to Case Model

Add these fields to the existing Case model:
```prisma
  waitingOn       WaitingOn   @default(Me)
  leadSource      LeadSource  @default(Direct)
  clientSummary   String?     // Free text — Eileen's email or Helen's notes
  feeArrangement  String?     @default("£200 advice + £150 admin")

  tasks           Task[]
  notes           Note[]
  persons         Person[]
  documentChecks  DocumentCheck[]
```

### 1.3 New Models
```prisma
model Task {
  id            String      @id @default(uuid())
  caseId        String
  case          Case        @relation(fields: [caseId], references: [id])
  title         String
  dueDate       DateTime?
  status        TaskStatus  @default(Pending)
  waitingOn     WaitingOn   @default(Me)
  notes         String?
  sortOrder     Int         @default(0)
  completedAt   DateTime?
  createdAt     DateTime    @default(now())
}

model Note {
  id        String   @id @default(uuid())
  caseId    String
  case      Case     @relation(fields: [caseId], references: [id])
  content   String
  createdAt DateTime @default(now())
}

model Person {
  id             String          @id @default(uuid())
  caseId         String
  case           Case            @relation(fields: [caseId], references: [id])
  fullName       String
  role           String          @default("Applicant")  // Applicant, Guarantor, etc.
  sortOrder      Int             @default(0)
  documentChecks DocumentCheck[]
}

model DocumentCheck {
  id            String    @id @default(uuid())
  caseId        String
  case          Case      @relation(fields: [caseId], references: [id])
  personId      String?
  person        Person?   @relation(fields: [personId], references: [id])
  documentName  String    // "CVI", "Comentis", "Payslips", "Bank Statements", etc.
  required      Boolean   @default(true)
  completed     Boolean   @default(false)
  completedAt   DateTime?
  monthsCovered String?   // For payslips/bank statements: "Jan,Feb,Mar"
  expiresAt     DateTime? // For freshness tracking
  notes         String?
}
```

### 1.4 AuditEventType Enum Extension

Add to existing enum:
```prisma
enum AuditEventType {
  // ... existing values ...
  TaskCompleted
  TaskSkipped
  NoteAdded
  WaitingOnChanged
  DocumentCheckCompleted
}
```

### 1.5 Stage Enum Extension

Add four new values to the existing Stage enum. **Do NOT remove or rename existing values** — v1 data uses them and must survive migration.

```prisma
enum Stage {
  Lead              // v2 — new
  Research
  ChaseClient       // v1 legacy — maps to "Client Response" column
  ClientResponse    // v2 — new
  DIP
  PostDIPChase      // v1 legacy — maps to "NB Submission" column
  AwaitingNB
  NBSubmitted       // v1 legacy — maps to "NB Submission" column
  LenderProcessing  // v2 — new
  Offered           // v2 — new
  Closed            // v1 legacy — maps to "Completed" column
  Completed
}
```

**Kanban Column Mapping (for Slice 1 — KanbanColumn.tsx):**

| Kanban Column | Stage Enum Values |
|---------------|-------------------|
| Lead | `Lead` |
| Research | `Research` |
| Client Response | `ClientResponse`, `ChaseClient` (v1 legacy) |
| DIP / Application | `DIP` |
| NB Submission | `AwaitingNB`, `NBSubmitted` (v1 legacy), `PostDIPChase` (v1 legacy) |
| Lender Processing | `LenderProcessing` |
| Offered | `Offered` |
| Completed | `Completed`, `Closed` (v1 legacy) |

New cases created in v2 use only the new stage values. Existing v1 cases retain their original stage values. The Kanban UI (Slice 1) maps both sets into the correct columns. Legacy values can be removed in a future cleanup migration once all v1 cases are closed/completed.

---

## 2. API ROUTES — NEW AND MODIFIED

### 2.1 New Routes
GET    /api/cases/[id]/tasks         → List tasks for case
POST   /api/cases/[id]/tasks         → Create task
PATCH  /api/cases/[id]/tasks/[taskId] → Update task (status, notes, due date)
GET    /api/cases/[id]/notes         → List notes (reverse chronological)
POST   /api/cases/[id]/notes         → Create note
GET    /api/cases/[id]/persons       → List persons on case
POST   /api/cases/[id]/persons       → Add person
PATCH  /api/cases/[id]/persons/[personId] → Update person
GET    /api/cases/[id]/checklist     → Document checklist (with person joins)
POST   /api/cases/[id]/checklist     → Create checklist item
PATCH  /api/cases/[id]/checklist/[checkId] → Update checklist item
PATCH  /api/cases/[id]/waiting-on    → Update waitingOn { waitingOn: WaitingOn }

### 2.2 Modified Routes
POST   /api/cases          → Extended: accepts leadSource, clientSummary, feeArrangement, waitingOn
GET    /api/cases           → Extended: includes waitingOn, leadSource in response; grouped by stage for Kanban
GET    /api/cases/[id]      → Extended: includes tasks, notes, persons, documentChecks
PATCH  /api/cases/[id]      → Extended: can update waitingOn, clientSummary, feeArrangement
POST   /api/cases/[id]/stage → Extended: auto-generates default tasks for new stage

### 2.3 Retained Routes (No Changes)

All document, illustration, suitability, ASF, offer, and audit routes remain unchanged.
The only change is that the suitability and ASF download routes no longer require `approvedByUser = true` — they serve the .docx regardless. The approval field becomes a "marked complete" toggle.

---

## 3. COMPONENT ARCHITECTURE

### 3.1 Dashboard — Replace Entirely

Delete: `app/(app)/dashboard/page.tsx` (v1 table dashboard)
Delete: `components/dashboard/CaseTable.tsx`, `CaseRow.tsx`, `PriorityBadge.tsx`, `DueDateTooltip.tsx`

Create:
components/dashboard/
KanbanBoard.tsx          — Main board container, horizontal scroll
KanbanColumn.tsx         — Single stage column with active/monitoring zones
CaseCard.tsx             — Card component with waiting-on indicator
NewCaseModal.tsx         — Full lead intake modal
DashboardHeader.tsx      — Title, summary badges, search, refresh, new case button
WaitingOnLegend.tsx      — Icon legend bar

### 3.2 Case View — Restructure

Keep: `app/(app)/cases/[id]/page.tsx` — but heavily refactor to stage-aware rendering
Keep: `components/case/CaseProgressStepper.tsx` — update with new icons and "waiting on" selector
Keep: `components/case/IllustrationPanel.tsx`, `IllustrationVerifyPane.tsx`, `FeeComparisonPanel.tsx`, `OfferPanel.tsx`, `SuitabilityPanel.tsx`, `ASFPanel.tsx`, `AuditSummary.tsx`

Create:
components/case/
CaseSidebar.tsx          — Right sidebar: stepper + waiting-on + quick notes
WaitingOnSelector.tsx    — Prominent dropdown/toggle for waiting-on status
QuickNotes.tsx           — Always-visible note input + history
TaskList.tsx             — Stage task checklist with auto-generation
TaskItem.tsx             — Individual task with checkbox, due date, notes
DIPReadinessPanel.tsx    — Hero checklist for DIP stage
NBReadinessPanel.tsx     — Hero checklist for NB Submission stage
ClientSummaryBlock.tsx   — Editable free-text block for Lead stage
DocumentChecklist.tsx    — Per-person document tracking panel
StageAwareContent.tsx    — Router component: renders panels based on case.stage

Modify:
components/case/SuitabilityPanel.tsx  — Remove approval gate; add "Mark Complete" toggle; "Generate & Download" single button
components/case/ASFPanel.tsx          — Same changes; commission default from leadSource
components/case/LockedPanelState.tsx  — Becomes a soft warning banner, not a hard block

### 3.3 UI Components — Additions
components/ui/
WaitingOnBadge.tsx       — Reusable: icon + label + colour for any waiting-on state
CaseTypeBadge.tsx        — Reusable: icon + label + colour for case types

---

## 4. STAGE-AWARE RENDERING RULES

The case view's left column renders ONLY the panels relevant to the current stage.
StageAwareContent.tsx implements this mapping:

| Stage | Panels Rendered |
|-------|----------------|
| Lead | ClientSummaryBlock, TaskList, NoteHistory |
| Research | TaskList, ClientSummaryBlock (read-only), NoteHistory |
| ClientResponse | TaskList, ClientSummaryBlock (read-only), NoteHistory |
| DIP | DIPReadinessPanel (hero), TaskList, DocumentChecklist, IllustrationPanel (collapsed), NoteHistory |
| PostDIPChase | TaskList, NoteHistory |
| AwaitingNB / NBSubmission | NBReadinessPanel (hero), SuitabilityPanel, ASFPanel, TaskList, NoteHistory |
| LenderProcessing | TaskList, OfferPanel, NoteHistory |
| Offered | OfferPanel, TaskList, NoteHistory |
| Completed | CommissionTracking, TaskList, NoteHistory |

Every stage always has: CaseHeader (top), TaskList, NoteHistory.
The sidebar (stepper + waiting-on + quick notes) is always visible.

---

## 5. DEFAULT TASKS BY STAGE

When a case transitions to a new stage via POST /api/cases/[id]/stage, auto-generate default tasks:

| Stage | Default Tasks |
|-------|--------------|
| Lead | Contact client, Send Client Agreement + Authority, Set up on IO, Send PFP invite, Send CVI + Comentis links |
| Research | Complete initial research (Sourcing Brain), Send initial options email, Chase client response |
| ClientResponse | Client confirms preferences, Gather outstanding documents, Complete full factfind |
| DIP | DIP readiness check, Submit application on lender portal, Record application date |
| AwaitingNB | Upload/confirm illustration, Generate Suitability Letter, Generate ASF, Verify NB docs, Submit pack to NB, Record NB submission date |
| LenderProcessing | Monitor lender progress, Respond to underwriter queries, Chase lender |
| Offered | Check offer against illustration, Send offer confirmation email, Monitor for completion |
| Completed | Mark complete, Email NB, Track commission, Track fee invoice |

Tasks are created with status=Pending and waitingOn=Me by default.
Helen can skip, reorder, add, or delete tasks at any time.

---

## 6. GATE CHANGES — HARD TO SOFT

v1 hard gates become v2 soft warnings:

| Gate | v1 Behaviour | v2 Behaviour |
|------|-------------|-------------|
| SL without confirmed illustration | API returns 403, UI locked | API succeeds with warning flag. UI shows amber banner: "Illustration not yet confirmed — letter may contain placeholder values." Download works. |
| ASF without approved SL | API returns 403, UI locked | API succeeds. UI shows amber banner: "Suitability Letter not yet marked complete." |
| Download without approval | API returns 403 | Download always works. "Approved" field renamed to "markedComplete". |
| Export while stale | Export button disabled | Amber banner warns. Download still works. |

Implementation: Remove the `if (!approvedByUser)` checks from download routes. Add a `markedComplete` Boolean to SuitabilityDraft and ASFDraft (keep `approvedByUser` for backward compat, default both to false).

---

## 7. V1 BUG FIXES (from Audit_Report.md)

Fix these during the relevant slice:

| Bug | Fix In Slice | Fix |
|-----|-------------|-----|
| SuitabilityPanel generated date always blank | Slice 3 (SL panel refactor) | Use `draft.generatedAt` not `draft.id` |
| ASFPanel form reappears after approval | Slice 3 (ASF panel refactor) | Fix visibility condition: `!hasDraft \|\| (!isApproved && !isMarkedComplete)` |
| staleDueToInputChange not set on field override | Slice 0 (bug fix pass) | Already implemented in v1 Slice 4 per close-out report — verify |
| PartAndPart repayment not handled in offer route | Slice 4 (Offer panel) | Add to type union |
| Duplicate root page redirect | Slice 1 (Dashboard replace) | Remove `app/(app)/page.tsx` |
| .env.txt in repo | Pre-slice | Check .gitignore, rotate if pushed |

---

## 8. ICON SYSTEM (from UX_UI_Proposal.md §3)

Use Lucide React throughout. Standard stroke widths:
- 2.2 for tiny status indicators (10–12px)
- 2.0 for standard action icons (14–16px)
- 1.5 for decorative/stepper icons (16–20px)

See UX_UI_Proposal.md §3 for the full icon mapping.

---

## 9. DELIVERY SLICES

### Slice 0 — Schema Migration + Bug Fixes
Prisma schema changes (new models, new fields on Case, enum extensions). Migration. Fix v1 bugs that don't require UI changes. Verify .env.txt situation. Update seed script with new fields.

### Slice 1 — Kanban Dashboard
Replace table dashboard with Kanban board. New case modal with lead source, client summary, fee arrangement. Dashboard header with summary badges. Drag-and-drop stage transitions. Active/monitoring zones. Lucide icons for waiting-on and case types. Delete old dashboard components.

### Slice 2 — Case View Restructure + Sidebar
Stage-aware case view rendering. Right sidebar with stepper, waiting-on selector, quick notes. StageAwareContent router. Notes API + UI. Waiting-on API + UI.

### Slice 3 — SL/ASF Panel Refactor + Soft Gates
Remove approval gates from SL and ASF download routes. Add "Mark Complete" toggle. Convert LockedPanelState to soft warning banners. Fix SuitabilityPanel date bug. Fix ASFPanel form visibility bug. Commission default from leadSource.

### Slice 4 — Task System
Task model API. Default task generation on stage transition. TaskList and TaskItem components. Task completion auto-creates next task. Task reordering. Fix PartAndPart offer bug.

### Slice 5 — Document Checklist + DIP Readiness
Person model API. DocumentCheck model API. DocumentChecklist component with per-person tracking. DIPReadinessPanel hero component. Freshness tracking for payslips/bank statements.

### Slice 6 — NB Readiness + Polish
NBReadinessPanel component. ClientSummaryBlock for Lead stage. Illustration verification UX improvements (Accept All one-click, formatted values). End-to-end stage flow testing.

### Slice 7 — Documentation + Production Readiness
Update README.md. Update Implementation_Progress.md with all v2 slices. Final build validation. Verify all testing checklists. Update Slice_Close_Out_Reports.md.