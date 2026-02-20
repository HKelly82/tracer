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
