# CLAUDE CODE PROMPTS — V2 UPGRADE
## Mortgage Adviser Workflow Tool
### How to use this file

Each section is a complete prompt to paste into Claude Code at the start of each slice.
Follow the governance protocol in MasterGovernancePrompt.md for every slice:
1. Produce Slice Declaration (plan) → wait for approval
2. Implement within approved scope
3. Produce Slice Close-Out Report → append to Slice_Close_Out_Reports.md
4. Update Implementation_Progress.md

Complete each slice fully before starting the next.

---

## SLICE 0 — Schema Migration + Bug Fixes
Read IMPLEMENTATION_SPEC_V2.md §1 (Schema Changes) and Audit_Report.md §3 (Bugs).
This slice makes NO UI changes. It prepares the database and fixes backend bugs.

SCHEMA MIGRATION
Add to prisma/schema.prisma:

WaitingOn enum (Me, Client, Lender, Passive)
LeadSource enum (Eileen, Direct)
TaskStatus enum (Pending, InProgress, Complete, Skipped)
New fields on Case: waitingOn, leadSource, clientSummary, feeArrangement
Task model (id, caseId, title, dueDate, status, waitingOn, notes, sortOrder, completedAt, createdAt)
Note model (id, caseId, content, createdAt)
Person model (id, caseId, fullName, role, sortOrder)
DocumentCheck model (id, caseId, personId, documentName, required, completed, completedAt, monthsCovered, expiresAt, notes)
Extend AuditEventType enum with: TaskCompleted, TaskSkipped, NoteAdded, WaitingOnChanged, DocumentCheckCompleted
Add markedComplete Boolean @default(false) to SuitabilityDraft and ASFDraft

Run: npx prisma migrate dev --name v2_schema_upgrade
SEED SCRIPT UPDATE
Update scripts/seed.ts:

Existing cases get waitingOn and leadSource values
Add clientSummary free text to at least 2 cases
Create 2-3 sample tasks per seeded case
Create 1-2 sample notes per case


BUG FIXES (backend only)

Verify staleDueToInputChange is set on field override (Audit_Report §3.3) — check app/api/illustrations/[id]/field/route.ts
Fix PartAndPart handling in app/api/offer/[caseId]/route.ts (Audit_Report §3.4) — add PartAndPart to the type union
Remove approval requirement from suitability download route — app/api/suitability/[caseId]/download/route.ts should serve .docx regardless of approvedByUser
Remove approval requirement from ASF download route — same pattern
Check .env.txt is in .gitignore


VERIFY

npx prisma migrate dev runs clean
npm run build passes
Seed script runs without errors
Existing API routes still work (no regressions)



Produce Slice Declaration first. Wait for approval before implementing.
Update Implementation_Progress.md and Slice_Close_Out_Reports.md when complete.

---

## SLICE 1 — Kanban Dashboard
Read IMPLEMENTATION_SPEC_V2.md §3.1 (Dashboard components) and UX_UI_Proposal.md §4 (Dashboard design).
Replace the v1 table dashboard with a Kanban board.

DELETE old components:

components/dashboard/CaseTable.tsx
components/dashboard/CaseRow.tsx
components/dashboard/PriorityBadge.tsx
components/dashboard/DueDateTooltip.tsx


CREATE new dashboard components:

components/dashboard/KanbanBoard.tsx — Horizontal scrolling container, 8 columns
components/dashboard/KanbanColumn.tsx — Stage column with active/monitoring zones
Active zone: cases where waitingOn=Me OR any task overdue
Monitoring zone: all other cases, rendered at 68% opacity
Labelled divider between zones (only if both zones have cases)
components/dashboard/CaseCard.tsx — Card with:
Row 1: Waiting-on icon (Lucide) + label + overdue badge (if applicable)
Row 2: Client name (bold)
Row 3: Case type pill with icon
Row 4: Next task in primary blue
Row 5: Time in stage + note snippet (muted)
Cards are draggable (HTML5 drag-and-drop)
components/dashboard/NewCaseModal.tsx — Modal with:
Client name (required), Case type (dropdown), Lead source (toggle: Eileen/Direct with commission split shown),
Client summary (large textarea), Fee arrangement (text, default "£200 advice + £150 admin")
components/dashboard/DashboardHeader.tsx — Title "Cases", summary badges (action count + overdue count),
search input, refresh button, "New Case" button
components/dashboard/WaitingOnLegend.tsx — Horizontal legend bar showing all 4 indicators


CREATE shared UI components:

components/ui/WaitingOnBadge.tsx — Reusable icon + label for any WaitingOn value
components/ui/CaseTypeBadge.tsx — Reusable icon + label for any CaseType value


UPDATE app/(app)/dashboard/page.tsx — Replace table with KanbanBoard
DELETE app/(app)/page.tsx — Remove duplicate root redirect (Audit_Report §3.5)
UPDATE POST /api/cases — Accept new fields: leadSource, clientSummary, feeArrangement, waitingOn
UPDATE GET /api/cases — Include waitingOn, leadSource, clientSummary in response
DRAG-AND-DROP — When a card is dropped on a new column:
POST /api/cases/[id]/stage with the appropriate action
If the transition doesn't map to an existing action (e.g. moving backward), use a new generic
"stage_override" action that updates the stage directly with an audit log entry

ICON SYSTEM (Lucide React):

Waiting-on: MousePointerClick (Me), UserClock (Client), Landmark (Lender), Eye (Passive)
Case types: RefreshCcw (Remortgage), Home (FTB/Purchase), ArrowRightLeft (Product Switch), Key (BTL)
Actions: Plus (new case), Search, RotateCw (refresh), X (close modal), AlertTriangle (overdue)
Stroke widths: 2.2 at 10-12px, 2.0 at 14-16px

COLOUR TOKENS (from UX_UI_Proposal.md §2.3):

Dashboard background: #EEF1F6
Card background: #fff with border 1px solid #E2E8F0
Overdue card border: 1px solid #FEB2B2
NO shadows on cards. Subtle shadow on hover only: 0 2px 8px rgba(0,0,0,0.06)
Modal only: full shadow + backdrop blur

Test:

Board renders with 8 columns
Cases distributed correctly by stage
Active cases appear above monitoring divider
Monitoring cases at reduced opacity
Drag card from Research to DIP — stage updates, card moves
New Case modal creates case with leadSource and clientSummary
Search filters cards by client name
Summary badges show correct counts

Produce Slice Declaration first. Wait for approval.

---

## SLICE 2 — Case View Restructure + Sidebar
Read IMPLEMENTATION_SPEC_V2.md §3.2 (Case view components), §4 (Stage-aware rendering), and UX_UI_Proposal.md §5 (Case detail view).
Restructure the case view to be stage-aware with a persistent sidebar.

CREATE components/case/CaseSidebar.tsx
Right column (280px, sticky top: 1.5rem). Contains:

CaseProgressStepper (updated with Lucide icons: CheckCircle2, ArrowRightCircle, Circle)
WaitingOnSelector — prominent toggle group to change waiting-on status
QuickNotes — always-visible textarea + recent notes list


CREATE components/case/WaitingOnSelector.tsx

Four-option toggle: Me / Client / Lender / Passive
Uses WaitingOnBadge for each option
PATCH /api/cases/[id]/waiting-on on change
Logs WaitingOnChanged audit event


CREATE components/case/QuickNotes.tsx

Textarea with Cmd/Ctrl+Enter to save
POST /api/cases/[id]/notes on submit
Shows last 5 notes below input, reverse chronological
Each note: content + timestamp


CREATE API routes:

GET /api/cases/[id]/notes — reverse chronological
POST /api/cases/[id]/notes — create note, log NoteAdded audit event
PATCH /api/cases/[id]/waiting-on — update, log WaitingOnChanged audit event


CREATE components/case/StageAwareContent.tsx
Router component that renders panels based on case.stage:

Lead: ClientSummaryBlock, TaskList, NoteHistory
Research/ClientResponse: TaskList, ClientSummaryBlock (read-only), NoteHistory
DIP: placeholder for DIPReadinessPanel (Slice 5), TaskList, IllustrationPanel, NoteHistory
AwaitingNB: placeholder for NBReadinessPanel (Slice 6), SuitabilityPanel, ASFPanel, TaskList, NoteHistory
LenderProcessing: TaskList, OfferPanel, NoteHistory
Offered: OfferPanel, TaskList, NoteHistory
Completed: TaskList, NoteHistory


CREATE components/case/ClientSummaryBlock.tsx

Large editable textarea with warm cream background (#F5F0E8)
Shows case.clientSummary
Editable at Lead stage, read-only at other stages
PATCH /api/cases/[id] to save


REFACTOR app/(app)/cases/[id]/page.tsx

Two-column layout: left = StageAwareContent, right = CaseSidebar
Remove the old static panel stack
Keep ActivePanelContext if still useful, otherwise remove



Test:

Lead stage shows only: summary block, tasks (placeholder), notes
DIP stage shows: tasks, illustration panel, notes (no SL/ASF)
NB stage shows: SL panel, ASF panel, tasks, notes
Sidebar stepper shows correct stage states
Waiting-on selector updates and persists
Quick notes save and appear in history
Stage-aware content changes when stage transitions

Produce Slice Declaration first. Wait for approval.

---

## SLICE 3 — SL/ASF Panel Refactor + Soft Gates
Read IMPLEMENTATION_SPEC_V2.md §6 (Gate changes) and UX_UI_Proposal.md §7.2-7.3 (SL/ASF generation).
Convert hard gates to soft warnings and update document generation UX.

SUITABILITY PANEL REFACTOR (components/case/SuitabilityPanel.tsx)

Remove approval checkbox and approval gate
Single button: "Generate & Download" — generates .docx and immediately triggers browser download
Add "Mark Complete" toggle below (simple checkbox, updates markedComplete on SuitabilityDraft)
If illustration not confirmed: show amber banner warning, but form is still usable
If draft is stale: show amber banner, download still works
FIX: Generated date displays draft.generatedAt (Audit_Report §3.1)


ASF PANEL REFACTOR (components/case/ASFPanel.tsx)

Same pattern: "Generate & Download" single button, "Mark Complete" toggle
Commission split default from case.leadSource (not case.sharedCase — sharedCase maps to leadSource=Eileen)
If SL not marked complete: show amber banner warning, but ASF generation still works
FIX: Form visibility after approval (Audit_Report §3.2)


UPDATE DOWNLOAD ROUTES

app/api/suitability/[caseId]/download/route.ts — remove approvedByUser check
app/api/asf/[caseId]/download/route.ts — remove approvedByUser check


UPDATE LOCKED PANEL STATE

LockedPanelState.tsx becomes a soft warning component
Background stays #F5F0E8 but messaging changes from "🔒 Locked" to "⚠️ Recommended: [prerequisite] before proceeding"
No padlock icon. AlertTriangle icon instead.


ADD MARK-COMPLETE API

POST /api/suitability/[caseId]/complete — sets markedComplete=true, logs audit event
POST /api/asf/[caseId]/complete — same pattern



Test:

SL generation works without confirmed illustration (with warning)
Download works without marking complete
"Mark Complete" toggle persists
ASF commission defaults to 70/30 when leadSource=Eileen
Stale banner shows but download is not blocked
Old approval flow removed entirely

Produce Slice Declaration first. Wait for approval.

---

## SLICE 4 — Task System
Read IMPLEMENTATION_SPEC_V2.md §5 (Default tasks by stage) and Requirements_v2.md §4 (Task system).
Build the per-case task system with waterfall dependencies.

API ROUTES

GET /api/cases/[id]/tasks — ordered by sortOrder
POST /api/cases/[id]/tasks — create task { title, dueDate?, waitingOn? }
PATCH /api/cases/[id]/tasks/[taskId] — update { status, notes, dueDate, waitingOn, title }
Completing a task logs TaskCompleted audit event
Skipping a task logs TaskSkipped audit event


AUTO-GENERATION
When POST /api/cases/[id]/stage transitions to a new stage:

Generate default tasks for that stage (from IMPLEMENTATION_SPEC_V2.md §5)
Tasks created with status=Pending, waitingOn=Me, sortOrder sequential
Do NOT delete tasks from previous stages — they remain as completed history


COMPONENTS

components/case/TaskList.tsx — Shows tasks grouped: current stage tasks first, then completed from previous stages (collapsed)
components/case/TaskItem.tsx — Checkbox to complete, inline editable title, due date (editable), waiting-on indicator, notes field
Completing a task: checkbox → green check → auto-creates next task if waterfall logic defined
"Add Task" button at bottom for custom tasks


OFFER BUG FIX
Fix PartAndPart handling in app/api/offer/[caseId]/route.ts (Audit_Report §3.4)

Test:

Create case → Lead tasks auto-generated
Complete "Contact client" → next task auto-generated (if waterfall defined)
Skip a task → logged, doesn't block progress
Add custom task → appears in list
Transition Research → DIP → DIP tasks generated, Research tasks preserved
Tasks show in case view TaskList component

Produce Slice Declaration first. Wait for approval.

---

## SLICE 5 — Document Checklist + DIP Readiness
Read IMPLEMENTATION_SPEC_V2.md §1.3 (DocumentCheck, Person models) and Requirements_v2.md §5 (Document Checklist) and §2.7 (DIP Readiness).

API ROUTES

GET/POST /api/cases/[id]/persons — manage joint applicants
GET/POST/PATCH /api/cases/[id]/checklist — document checklist items


PERSON MANAGEMENT

When creating a case, optionally add persons (joint applicants)
Each person has per-person document requirements (CVI, Comentis, payslips, bank statements)
"Add Applicant" button in case view creates Person + auto-generates their document checklist items


DOCUMENT CHECKLIST COMPONENT (components/case/DocumentChecklist.tsx)

Expandable panel showing all documents per person
Each item: checkbox, document name, status icon (CheckCircle2 / AlertTriangle / XCircle), notes
Payslips/bank statements: show monthsCovered field (e.g., "Jan, Feb, Mar")
Freshness alert: if earliest month > 3 months old at expected application date, show amber warning


DIP READINESS PANEL (components/case/DIPReadinessPanel.tsx)

Hero panel at DIP stage — the main thing Helen sees
Aggregates: Client Agreement, Authority to Proceed, CVI (per person), Comentis (per person),
Illustration confirmed, Research saved, Payslips (per person with months), Bank statements (per person)
Each line: icon (green/amber/red) + item name + detail text
Overall status: "Ready for DIP" (all green) or "X items outstanding" (count)


DEFAULT CHECKLIST GENERATION
When a case is created (or when persons are added), auto-generate standard checklist items:
Per case: Client Agreement, Authority to Proceed, Research, Illustration
Per person: CVI, Comentis, ID, Proof of Address, Payslips (3 months), Bank Statements (3 months)
Conditional: SA302 (self-employed), Proof of Deposit (FTB/Purchase), Credit Report (if adverse)

Test:

Add joint applicant → per-person checklist items generated
Complete checklist items → DIP Readiness panel updates
Payslip freshness: Jan payslip entered, expected DIP in May → amber warning
All items complete → "Ready for DIP" green state
Missing CVI → red XCircle with "CVI — Not completed" text

Produce Slice Declaration first. Wait for approval.

---

## SLICE 6 — NB Readiness + Polish
Read IMPLEMENTATION_SPEC_V2.md §4 (NBSubmission stage) and UX_UI_Proposal.md §7 (NB Submission view).

NB READINESS PANEL (components/case/NBReadinessPanel.tsx)
Checklist for NB submission pack:

Illustration confirmed (auto-detected from IllustrationSnapshot.confirmed)
Suitability Letter (markedComplete on SuitabilityDraft)
ASF (markedComplete on ASFDraft)
All documents on file (aggregated from DocumentChecklist)
Pack submitted to NB (manual checkbox/task)


ILLUSTRATION VERIFICATION UX IMPROVEMENTS

"Accept All" button works immediately — one click confirms every field (no individual confirmation prerequisite)
Formatted values in field rows: £188,599.00 not 188599, 4.08% not 4.08, 30 years not 30
Update IllustrationVerifyPane.tsx and FieldConfirmRow.tsx


CLIENT SUMMARY BLOCK — Lead stage

Ensure ClientSummaryBlock renders correctly at Lead stage (editable) and other stages (read-only)
Large textarea, warm cream background


END-TO-END TESTING
Full workflow test:

Create case (Kanban) → Lead tasks appear
Add notes → visible in sidebar
Change waiting-on → card moves between active/monitoring zones on dashboard
Progress through stages → stage-aware content updates
DIP Readiness → all items tracked
Generate SL → download immediately → mark complete
Generate ASF → download immediately → mark complete
NB Readiness → all items checked
Upload offer → comparison works
Complete case → commission tracking visible



Test:

NB Readiness panel reflects actual state of SL, ASF, documents
Accept All confirms all illustration fields in one click
Values formatted correctly in verification pane
Full workflow from Lead → Completed works without blocking

Produce Slice Declaration first. Wait for approval.

---

## SLICE 7 — Documentation + Production Readiness
This slice writes no feature code. It ensures the project is documented and ready for handover.

README.md — Replace default create-next-app with project documentation:

Project overview (what it does, who it's for)
Tech stack
Setup instructions (clone, install, env vars, migrate, seed, run)
Credentials setup (hash-password script, base64 encoding note)
Deployment (Vercel + Supabase)
Architecture overview (stage-aware rendering, task system, document generation)


IMPLEMENTATION_PROGRESS.md — Add v2 slice entries (0–6):

Status, date, files created/modified, architectural decisions, testing checklists


SLICE_CLOSE_OUT_REPORTS.md — Verify all v2 slices have close-out reports
FINAL VALIDATION

npm run build — clean, no errors
No console.error in browser
No TODO markers in production code (grep for TODO)
No hardcoded secrets (grep for patterns)
All environment variables documented in README
.env.txt not in git history (verify)


KNOWN GAPS DOCUMENT
Create docs/KNOWN_GAPS.md listing:

Features deferred to future phases (email agent, IO integration, mobile)
Any v1 bugs not yet fixed
Any technical debt introduced during v2



Produce Slice Declaration first. Wait for approval.