# Implementation Progress

Tracks slice-by-slice progress for the mortgage adviser workflow tool.

---

## Slices 1–3 — Foundation, Case View, PDF Extraction, Fee Comparison

**Commit:** edf8dcf
**Build:** ✅ Clean

### Completed
- Authentication (NextAuth v5 beta, email/password, session middleware)
- Dashboard — case list with stage badges, timer countdowns
- Case view — CollapsiblePanel layout, StageHeader, TimerPanel, CaseProgressStepper
- PDF extraction — regex parser (0.95 confidence threshold) + Claude vision fallback
- Illustration upload + field override (InlineOverrideField) + confirm flow
- Multi-variant illustration support (FeeAdded / FeeUpfront auto-labelling)
- Fee disclosure calculation (interestChargedOnFee) — POST /api/cases/[id]/fee-calculation
- FeeComparisonPanel — read-only display, bg-[#F5F0E8]
- Suitability gate — requires confirmed primary illustration; also requires FeeUpfront confirmed + feeDisclosure when fee added to loan
- Auto-trigger fee calculation useEffect in case page

---

## Slice 4 — Suitability Letter Generator

**Date completed:** 2026-02-20
**Commit:** (pending)
**Build:** ✅ Clean

### Files created
- `mortgage-workflow/lib/documents/docx-utils.ts` — shared .docx helpers (Calibri 11pt, formatGBP, formatPercent, formatDate, formatYears, etc.)
- `mortgage-workflow/lib/documents/suitability-generator.ts` — JUSTIFICATION_PRESETS, computeInputHash (SHA-256 of 11 fields), generateSuitabilityLetter (§8.1–§8.8 sections)
- `mortgage-workflow/components/case/SuitabilityPanel.tsx` — 4-state panel (form / stale / review / approved)
- `mortgage-workflow/docs/Slice_Close_Out_Reports.md` — new file for per-slice reports

### Files modified
- `mortgage-workflow/app/api/suitability/[caseId]/route.ts` — replaced 501 stub; GET returns draft, POST generates/upserts
- `mortgage-workflow/app/api/suitability/[caseId]/approve/route.ts` — replaced 501 stub; sets approvedByUser=true
- `mortgage-workflow/app/api/suitability/[caseId]/download/route.ts` — replaced 501 stub; streams .docx buffer
- `mortgage-workflow/app/api/illustrations/[id]/field/route.ts` — added stale detection after field update
- `mortgage-workflow/app/(app)/cases/[id]/page.tsx` — added SuitabilityDraftRecord, portability/overpaymentPercent to IllustrationRecord, wired SuitabilityPanel

### Architectural decisions
| Decision | Rationale |
|---|---|
| `computeInputHash` SHA-256 on 11 snapshot fields | Deterministic stale detection without storing old field values |
| `staleDueToInputChange` set in field PATCH route | Keeps stale detection close to the mutation; no polling needed |
| `Uint8Array(buffer)` wrapper for NextResponse | Node Buffer not assignable to BodyInit in TypeScript strict mode |
| Local `DecimalLike` type instead of Prisma runtime import | `@prisma/client/runtime/library` not exported in Prisma v7 |

### Known issues / deferred
- No audit event for fee calculation (FeeCalculated not in AuditEventType enum); add in Slice 7 migration if needed
- Alternative Products section toggle stored but no dedicated letter section yet (content can be added later)

### Testing checklist
| Test | Result |
|---|---|
| Build passes | ✅ |
| SuitabilityPanel renders locked state when illustration not confirmed | Manual |
| Generate creates SuitabilityDraft with staleDueToInputChange=false | Manual |
| Field override on illustration sets staleDueToInputChange=true | Manual |
| Approve sets approvedByUser=true | Manual |
| Download streams valid .docx file | Manual |
| Stale banner shown when staleDueToInputChange=true | Manual |

---

## Slice 5 — ASF Generator

**Date completed:** 2026-02-20
**Commit:** (pending)
**Build:** ✅ Clean

### Files created
- `mortgage-workflow/lib/documents/asf-generator.ts` — 6-table .docx layout, calculateCommission (DefaultHelen100 / Shared7030 / ManualOverride)
- `mortgage-workflow/components/case/ASFPanel.tsx` — 3-state panel with commission override form

### Files modified
- `mortgage-workflow/app/api/asf/[caseId]/route.ts` — replaced 501 stub; GET, POST, PATCH commission override
- `mortgage-workflow/app/api/asf/[caseId]/approve/route.ts` — replaced 501 stub
- `mortgage-workflow/app/api/asf/[caseId]/download/route.ts` — replaced 501 stub
- `mortgage-workflow/app/(app)/cases/[id]/page.tsx` — added ASFDraftRecord, CommissionRecord, wired ASFPanel

### Architectural decisions
| Decision | Rationale |
|---|---|
| Prisma accessor `aSFDraft` | Prisma camelCase rules for all-caps prefix — verified in generated index.d.ts |
| calculateCommission preserves ManualOverride on regeneration | Prevents accidental reset of adviser-specified split |
| Suitability approval gate | ASF should only be generated after recommendation is approved |

### Testing checklist
| Test | Result |
|---|---|
| Build passes | ✅ |
| Default commission 100% Helen | Manual |
| 70/30 on sharedCase | Manual |
| Commission override logged | Manual |
| Approve + download | Manual |
