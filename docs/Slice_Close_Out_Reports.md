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
**Commit:** (pending)
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
**Commit:** (pending)
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
**Commit:** (pending)
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
