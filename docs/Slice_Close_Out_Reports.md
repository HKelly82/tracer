# Slice Close Out Reports

Each section below is appended at the end of the corresponding implementation slice.
It captures what was built, key decisions made, and any deferred items — giving any developer
enough context to continue the project or understand why choices were made.

## Report Format

```
## Slice N — [Title]
Date completed | Commit hash | Build status
Files created / modified
Architectural decisions
Known issues / deferred
Testing checklist
```

---
<!-- Slice 4 report appended below -->

## Slice 4 — Suitability Letter Generator

**Date completed:** 2026-02-20
**Commit:** `87ab53e`
**Build:** ✅ Clean

### Files created
- `lib/documents/docx-utils.ts` — shared .docx paragraph/formatting helpers
- `lib/documents/suitability-generator.ts` — JUSTIFICATION_PRESETS, computeInputHash, generateSuitabilityLetter
- `components/case/SuitabilityPanel.tsx` — 4-state panel component

### Files modified
- `app/api/suitability/[caseId]/route.ts` — replaced 501 stub (GET + POST)
- `app/api/suitability/[caseId]/approve/route.ts` — replaced 501 stub
- `app/api/suitability/[caseId]/download/route.ts` — replaced 501 stub
- `app/api/illustrations/[id]/field/route.ts` — added stale detection after field update
- `app/(app)/cases/[id]/page.tsx` — wired SuitabilityPanel, extended IllustrationRecord type

### Architectural decisions
| Decision | Rationale |
|---|---|
| SHA-256 inputHash on 11 snapshot fields | Deterministic stale detection without storing old values |
| staleDueToInputChange set in field PATCH | Mutation-adjacent; no polling needed |
| Uint8Array wrapper for NextResponse | Node Buffer not assignable to BodyInit |
| Local DecimalLike type | @prisma/client/runtime/library not exported in Prisma v7 |

### Known issues / deferred
- FeeCalculated AuditEventType not yet in schema (deferred to Slice 7 migration if needed)

### Testing checklist
| Test | Result |
|---|---|
| npm run build | ✅ |
| Locked state renders when illustration unconfirmed | Manual |
| Generate creates draft | Manual |
| Field override marks draft stale | Manual |
| Approve unlocks download | Manual |
| Download streams .docx | Manual |

---

## Slice 5 — ASF Generator

**Date completed:** 2026-02-20
**Commit:** `0afb012`
**Build:** ✅ Clean

### Files created
- `lib/documents/asf-generator.ts` — 6-table Word layout, calculateCommission logic
- `components/case/ASFPanel.tsx` — 3-state panel (form / approval gate / approved+download) with commission override

### Files modified
- `app/api/asf/[caseId]/route.ts` — replaced 501 stub (GET + POST + PATCH commission override)
- `app/api/asf/[caseId]/approve/route.ts` — replaced 501 stub
- `app/api/asf/[caseId]/download/route.ts` — replaced 501 stub
- `app/(app)/cases/[id]/page.tsx` — added ASFDraftRecord, CommissionRecord interfaces, wired ASFPanel

### Architectural decisions
| Decision | Rationale |
|---|---|
| Prisma accessor is `aSFDraft` not `asFDraft` | Prisma converts ASFDraft model name via camelCase rules — verified in generated index.d.ts |
| calculateCommission preserves ManualOverride on POST regeneration | Prevents commission split reset when adviser regenerates ASF |
| Suitability letter approval required as gate | Ensures ASF is not generated before the core recommendation document is approved |
| `null` → `undefined` for oldValue in writeAuditLog | writeAuditLog params type uses string | undefined |

### Known issues / deferred
- None

### Testing checklist
| Test | Result |
|---|---|
| npm run build | ✅ |
| Default commission 100% Helen on non-shared case | Manual |
| 70/30 split on sharedCase=true | Manual |
| Commission override logged with reason | Manual |
| Approve unlocks download | Manual |
| Download streams valid .docx | Manual |

---

## Slice 6 — Offer Upload + Comparison

**Date completed:** 2026-02-20
**Commit:** `2f5ec1b`
**Build:** ✅ Clean

### Files created
- `components/case/OfferPanel.tsx` — 3-state panel (no offer / match / mismatch + acknowledge)

### Files modified
- `app/api/offer/[caseId]/route.ts` — replaced 501 stub; GET returns offer, POST uploads+extracts+compares
- `app/api/offer/[caseId]/acknowledge/route.ts` — replaced 501 stub; POST acknowledges mismatch with audit log
- `app/(app)/cases/[id]/page.tsx` — added OfferRecord interface, `offer` to CaseData, wired OfferPanel; extended IllustrationRecord with initialRatePercent + termYears

### Architectural decisions
| Decision | Rationale |
|---|---|
| extractWithRegex reused for offer PDF | Same ESIS pattern format; only 4 fields needed, no vision fallback required |
| Extraction failure falls through gracefully | Offer may use different templates — null values fallback to illustration values |
| Offer upload does not gate stage progression | Per spec — offer is optional and supplementary |
| OfferMismatchAcknowledged audit event on acknowledge | Provides compliance trail for any rate/loan/term discrepancies |

### Known issues / deferred
- No manual field correction UI for offer (extracted values can differ from actual offer if regex misses) — could add inline override in future slice

### Testing checklist
| Test | Result |
|---|---|
| npm run build | ✅ |
| Upload offer PDF shows correct extracted fields | Manual |
| Match state shown when fields align | Manual |
| Mismatch state shows comparison table | Manual |
| Acknowledge records audit event | Manual |
| No offer state shows upload button | Manual |

---

## Slice 7 — Audit & Compliance Hardening

**Date completed:** 2026-02-20
**Commit:** `a8ace59`
**Build:** ✅ Clean

### Files created
- `prisma/migrations/20260220124535_add_late_nb_flag/migration.sql` — lateNbSubmission Boolean column
- `app/api/cases/[id]/submission-date/route.ts` — protected date override with reason + DateOverridden audit
- `components/case/AuditSummary.tsx` — expandable audit log panel, reverse chronological, human-readable labels

### Files modified
- `prisma/schema.prisma` — added `lateNbSubmission Boolean @default(false)` to Case model
- `lib/db/prisma.ts` — added `$extends` middleware to block delete/update on AuditLogEvent
- `app/api/cases/[id]/stage/route.ts` — added late NB detection after nb_submitted action
- `app/api/cases/[id]/route.ts` — block applicationSubmittedAt + nbSubmittedAt in PATCH body
- `app/api/cases/route.ts` — include lateNbSubmission in case list response
- `app/(app)/cases/[id]/page.tsx` — wired AuditSummary, added lateNbSubmission to CaseData, late badge
- `app/(app)/dashboard/page.tsx` — added Refresh button with spinner
- `components/dashboard/CaseRow.tsx` — added Late NB badge next to client name
- `components/case/IllustrationPanel.tsx` — parse failure (Failed/Partial) banners in extracted state
- `types/index.ts` — added lateNbSubmission to CaseSummary

### Architectural decisions
| Decision | Rationale |
|---|---|
| `$extends` instead of `$use` | Prisma v7 uses Client Extensions API; `$use` is deprecated |
| Computed select with explicit fields in submission-date route | TypeScript cannot infer type from dynamic `{ [field]: true }` select |
| Prisma generate required after schema + migration | Generated client types must be regenerated after schema changes |

### Known issues / deferred
- Immutable audit log middleware ($extends) is in-process only — direct DB access can still mutate rows; full protection requires RLS policies in Supabase
- lateNbSubmission flag is set at nb_submitted time; if submission date is later corrected via submission-date route, the flag is not automatically updated

### Testing checklist
| Test | Result |
|---|---|
| npm run build | ✅ |
| PATCH /api/cases/[id] with applicationSubmittedAt returns 400 | Manual |
| POST /api/cases/[id]/submission-date updates date with audit event | Manual |
| nb_submitted after deadline sets lateNbSubmission=true | Manual |
| Late NB badge shows on dashboard and case view | Manual |
| AuditSummary shows events in reverse chronological order | Manual |
| IllustrationPanel shows Failed/Partial banners | Manual |
| Dashboard Refresh button reloads cases | Manual |

---

## Repo Flatten — Housekeeping

**Date completed:** 2026-02-20
**Commit:** `aa4be10`, `b24fd76`
**Build:** ✅ Clean

### Summary
- Moved all files from `mortgage-workflow/` subdirectory to repository root
- Removed orphan `docs/` at old root (outdated copies of governance + progress docs, stray image)
- Removed placeholder `README.md` at old root
- Added `.claude/` to `.gitignore`
- 105 files moved with 100% git rename detection — full history preserved
- npm install + prisma generate + npm run build all verified at new root

### Action Required
- If Vercel "Root Directory" is set to `mortgage-workflow`, change it to `.` in Vercel dashboard

---

## V2 Slice 0 — Schema Migration + Bug Fixes

**Date completed:** 2026-02-20
**Commit:** `674a3f2`
**Build:** ✅ Clean
**Migration:** `20260220210312_v2_schema_upgrade`

### 1. What Was Delivered
- Prisma schema extended with all v2 models, enums, and fields
- Stage enum extended with 4 new values (Lead, ClientResponse, LenderProcessing, Offered)
- 3 backend bug fixes (PartAndPart type union, SL download gate, ASF download gate)
- 2 bug verifications (staleDueToInputChange already fixed, .env.txt never committed)
- Seed script updated with v2 fields, new-stage cases, sample tasks, and notes
- IMPLEMENTATION_SPEC_V2.md updated with §1.5 Stage Enum Extension

### 2. Files Created
- `prisma/migrations/20260220210312_v2_schema_upgrade/migration.sql`

### 3. Files Modified
| File | Change |
|---|---|
| `prisma/schema.prisma` | 3 new enums, 4 new Stage values, 5 new AuditEventType values, 4 new Case fields, markedComplete on SuitabilityDraft + ASFDraft, 4 new models |
| `app/api/offer/[caseId]/route.ts` | Added PartAndPart to repayment method type union |
| `app/api/suitability/[caseId]/download/route.ts` | Removed approvedByUser and staleDueToInputChange gates |
| `app/api/asf/[caseId]/download/route.ts` | Removed approvedByUser gate |
| `scripts/seed.ts` | v2 fields on existing cases, 2 new cases (Lead + ClientResponse stages), sample tasks + notes |
| `docs/IMPLEMENTATION_SPEC_V2.md` | Added §1.5 Stage Enum Extension with Kanban column mapping table |
| `docs/Implementation_Progress.md` | Appended V2 Slice 0 progress |

### 4. New Dependencies Added
- None

### 5. New Environment Variables Required
- None

### 6. PRD Acceptance Criteria Status

| Criteria | Status |
|---|---|
| WaitingOn, LeadSource, TaskStatus enums created | ✅ Fully satisfied |
| Case model extended with waitingOn, leadSource, clientSummary, feeArrangement | ✅ Fully satisfied |
| Task, Note, Person, DocumentCheck models created | ✅ Fully satisfied |
| AuditEventType extended with 5 new values | ✅ Fully satisfied |
| markedComplete added to SuitabilityDraft + ASFDraft | ✅ Fully satisfied |
| Stage enum extended with Lead, ClientResponse, LenderProcessing, Offered | ✅ Fully satisfied |
| PartAndPart handling fixed in offer route | ✅ Fully satisfied |
| Approval gates removed from SL + ASF download routes | ✅ Fully satisfied |
| staleDueToInputChange verified | ✅ Already implemented in v1 Slice 4 |
| .env.txt verified | ✅ Not in git history, covered by .gitignore |
| Seed script updated | ✅ Fully satisfied |
| Migration runs clean | ✅ Fully satisfied |
| Build passes | ✅ Fully satisfied |

### 7. Compliance Validation

| Check | Status |
|---|---|
| FCA references intact | ✅ No FCA-related code modified |
| Risk warnings intact | ✅ No warning text modified |
| No unintended PII persistence | ✅ New models store case data only, consistent with v1 pattern |
| No security regression | ✅ Auth middleware unchanged. Audit log immutability ($extends) unchanged. |
| No placeholder content where prohibited | ✅ No placeholder content introduced |

### 8. Manual Testing Checklist

| Test | Expected |
|---|---|
| `npx prisma migrate dev` runs clean | Migration applied without errors |
| `npm run build` passes | No TypeScript or compilation errors |
| `npx tsx scripts/seed.ts` completes | 5 cases with tasks and notes seeded |
| GET /api/cases returns all 5 seeded cases | Cases include waitingOn and leadSource fields |
| GET /api/cases/[id] for seed-case-4 | Returns Lead stage case with clientSummary |
| GET /api/suitability/[caseId]/download (unapproved draft) | Returns .docx (previously 400) |
| GET /api/asf/[caseId]/download (unapproved draft) | Returns .docx (previously 400) |
| Upload offer PDF with PartAndPart repayment | confirmedRepaymentMethod = "PartAndPart" |
| Existing v1 cases (Research, DIP, AwaitingNB stages) | Still load correctly, no regressions |

### 9. Known Gaps
- `approvedByUser` field retained on SuitabilityDraft and ASFDraft for backward compatibility. Will be deprecated in favour of `markedComplete` when UI is updated in Slice 3.
- Stale draft check removed from SL download route along with approval gate. The stale banner remains a UI-layer concern (Slice 3).

### 10. Technical Debt Introduced
- Two boolean fields serve similar purposes: `approvedByUser` (v1) and `markedComplete` (v2) on both SuitabilityDraft and ASFDraft. Plan to deprecate `approvedByUser` in Slice 3 when the UI is refactored.
- Stage enum now has 12 values including legacy mappings. Legacy values will become unused as v1 cases are closed. Cleanup migration can remove them later.

### 11. Follow-Up Tasks
- Slice 1: Kanban dashboard must use the column mapping table from §1.5 to group both new and legacy stage values
- Slice 3: SuitabilityPanel and ASFPanel UI refactor — replace approval flow with "mark complete" toggle using the new `markedComplete` field

### Architectural Decisions

| Decision | Rationale |
|---|---|
| Additive Stage enum (no removals) | v1 data uses existing values. Migration would require understanding each case's true business state. Legacy values map to Kanban columns in Slice 1. |
| markedComplete alongside approvedByUser | Clean v2 semantics without breaking v1 code that references approvedByUser. Deprecated in Slice 3. |
| Stale check removed from download route | v2 philosophy: "suggest, never block". Stale warning is a UI concern, not a download gate. |
| Seed script cleans tasks/notes on re-run | Prevents duplicate task/note accumulation from repeated seeding. Uses deleteMany with seed-case- prefix filter. |

### Decision Log

**Decision V2-001**

| Field | Value |
|---|---|
| Decision ID | V2-001 |
| Type | Architecture |
| Context | V2 introduces new stages (Lead, ClientResponse, LenderProcessing, Offered) but v1 data uses existing stage values (ChaseClient, PostDIPChase, NBSubmitted). Existing cases cannot be migrated without understanding their actual business state. |
| Decision | Add new Stage enum values additively. Do NOT remove or rename existing values. Kanban UI (Slice 1) maps both new and legacy values into columns using a mapping table documented in IMPLEMENTATION_SPEC_V2.md §1.5. |
| Alternatives Considered | (A) Rename existing values via data migration — risky, requires understanding each case's true state. (B) Defer all stage changes to Slice 1 — separates schema from the slice that consumes it, less cohesive. |
| Consequences (Short Term) | Stage enum has 12 values (8 legacy + 4 new). Some values are semantically overlapping (ChaseClient ≈ ClientResponse). |
| Consequences (Long Term) | Once all v1 cases are closed/completed, legacy values become unused. Can be removed in a future cleanup migration. |
| Reversible | Yes |
