# Mortgage Workflow Tool — Pre-Client Audit Report

**Date:** 2026-02-20
**Reviewer:** Senior Developer (Claude Sonnet 4.6)
**Scope:** Full codebase review against `docs/Implementation_Progress.md`

---

## Executive Summary

The implementation is substantially further along than the documentation suggests. Slices 1–3 are fully complete as documented. Slices 4–6 (Suitability Letter, ASF + Commission, Offer Upload) are also fully implemented but undocumented. Slice 7 (Audit Hardening) is partially complete. Several bugs and one significant security concern have been identified and are detailed below.

The tool is **functionally complete** for the core workflow. Outstanding items are minor and targeted.

---

## 1. Implementation Status by Slice

| Slice | Feature | Status | Documented |
|---|---|---|---|
| 1 | Foundation, Auth, Dashboard, Case View | ✅ Complete | ✅ Yes |
| 2 | PDF Upload + Illustration Extraction | ✅ Complete | ✅ Yes |
| 3 | Multi-Variant Upload + Fee Comparison | ✅ Complete | ✅ Yes |
| 4 | Suitability Letter `.docx` generation | ✅ Complete | ❌ Missing |
| 5 | ASF `.docx` + Commission logic | ✅ Complete | ❌ Missing |
| 6 | Offer upload + mismatch comparison | ✅ Complete | ❌ Missing |
| 7 | Audit hardening (Prisma middleware) | ⚠️ Partial | ❌ Missing |

**Recommendation:** Update `docs/Implementation_Progress.md` to document Slices 4–6 before handover. The client and future developers will otherwise underestimate how much has been built.

---

## 2. What Was Built (Slices 4–6)

### Slice 4 — Suitability Letter

- `SuitabilityPanel.tsx` — Full UI: objective form, justification mode toggle (Preset/Manual), affordability/risk fields, optional sections (portability, overpayments, alternatives), generate → approve → download flow
- `app/api/suitability/[caseId]/route.ts` — GET (return draft) and POST (generate/regenerate with input hash, audit log)
- `app/api/suitability/[caseId]/approve/route.ts` — Blocks approval of stale drafts
- `app/api/suitability/[caseId]/download/route.ts` — Streams `.docx` (only if approved and not stale)
- `lib/documents/suitability-generator.ts` — Full letter with 6 justification presets, conditional sections (fee, ERC, portability, overpayments), `computeInputHash` for stale detection
- Gate: requires confirmed illustration; requires both illustrations + fee disclosure for fee scenarios

### Slice 5 — ASF + Commission

- `ASFPanel.tsx` — Full UI: source of business, purpose, borrower type, account number, vulnerable client flag, commission display, override form (requires reason, validates 100% total), generate → approve → download flow
- `app/api/asf/[caseId]/route.ts` — GET, POST (generates ASF + upserts commission), PATCH (commission override with audit log)
- `app/api/asf/[caseId]/approve/route.ts` and `download/route.ts` — Complete
- `lib/documents/asf-generator.ts` — Full tabular `.docx` with 6 sections: identification, addresses, business details, mortgage details, fees, commission splits
- Gate: requires approved suitability letter before ASF can be generated

### Slice 6 — Offer Upload + Mismatch

- `OfferPanel.tsx` — Three states: empty (upload button) → matched (green banner + key figures) → mismatched (amber warning + comparison table + acknowledge button)
- `app/api/offer/[caseId]/route.ts` — POST: uploads PDF, runs regex extraction, compares rate/loan/term against illustration, upserts `OfferSnapshot` with mismatch fields
- `app/api/offer/[caseId]/acknowledge/route.ts` — Records acknowledgement, writes `OfferMismatchAcknowledged` audit event
- Gate: requires confirmed illustration before offer upload

---

## 3. Bugs Found

### 3.1 Suitability Panel — Generated Date Always Blank
**File:** `components/case/SuitabilityPanel.tsx:332`
**Severity:** Low (cosmetic)

```tsx
// BUG: draft.id is a UUID, not a date
new Date(draft.id).toString() !== "Invalid Date" ? "" : ""
```

Both branches return `""`. The condition logic is dead code. The generated date is never displayed. The `draft.id` (a UUID) is not a date.
**Fix:** Use `draft.generatedAt` (available on the Prisma model via `generatedAt DateTime @default(now())` on `SuitabilityDraft`).

---

### 3.2 ASF Panel — Form Reappears After Approval
**File:** `components/case/ASFPanel.tsx:204`
**Severity:** Low (UX confusion)

```tsx
{(!hasDraft || isApproved) && (
  <div className="space-y-4">
    {/* form... */}
    <Button>Regenerate ASF / Generate ASF</Button>
  </div>
)}
```

When the ASF is approved, the full input form reappears alongside the "✓ Approved" block. This is inconsistent with `SuitabilityPanel`, which hides the form when approved and only shows Regenerate + Download buttons.

---

### 3.3 No Mechanism to Set `staleDueToInputChange = true`
**File:** `app/api/illustrations/[id]/field/route.ts` (field override), `lib/documents/suitability-generator.ts`
**Severity:** Medium (data integrity risk)

`computeInputHash` is called at generation time and stored. If a user later overrides illustration fields (which writes a `FieldOverridden` audit event), the suitability draft's `staleDueToInputChange` is never set to `true`. The stale banner will not appear even though the letter content is out of date.
**Fix:** After any `FieldOverridden` write, query and update any existing `SuitabilityDraft` for that case to set `staleDueToInputChange = true` if the new hash differs.

---

### 3.4 Offer Route — `PartAndPart` Repayment Not Handled
**File:** `app/api/offer/[caseId]/route.ts:101`
**Severity:** Low

```ts
const confirmedRepayment: "Repayment" | "InterestOnly" =
  extractedRepayment === "InterestOnly" ? "InterestOnly" : "Repayment"
```

`PartAndPart` is a valid enum value in the schema but is silently coerced to `"Repayment"`. This would not affect most cases but could cause a mismatch false-negative for part-and-part mortgages.

---

### 3.5 Duplicate Root Page Redirect
**Files:** `app/page.tsx`, `app/(app)/page.tsx`
**Severity:** Very Low (redundancy)

Both files redirect to `/dashboard`. In Next.js App Router, both map to the route `/`. While Next.js resolves the conflict in favour of the root-level file (which we fixed today), the `app/(app)/page.tsx` is now unreachable dead code.
**Fix:** Remove `app/(app)/page.tsx` or leave as-is (harmless).

---

## 4. Security Observations

### 4.1 `.env.txt` File Committed to Repository
**Severity:** High

```
c:/Users/hmkel/Tracer/mortgage-workflow/.env.txt
```

This file was present in the repository root. `.env.local` is correctly listed in `.gitignore`, but `.env.txt` may not be. If this file contains credentials (API keys, database URL, etc.) and has been pushed to GitHub, those credentials should be considered compromised and rotated.
**Action required:** Verify `.env.txt` is in `.gitignore` and does not appear in git history. If it was pushed, rotate all credentials (Supabase, Anthropic API key, NextAuth secret).

### 4.2 `ADMIN_PASSWORD_HASH` Environment Variable — Fragile Setup
**Severity:** Medium (operational risk)

The bcrypt hash contains `$` characters which Next.js's `dotenv-expand` interprets as variable references. A base64-encoding workaround is in place (`Buffer.from(..., "base64")` in `lib/auth.ts`). This is functional but non-obvious and will break silently if the env var is ever updated using standard tools or CI systems.
**Recommendation:** Document this explicitly in `docs/` or in `.env.local` as a comment. Alternatively, store the hash in a file read via `fs.readFileSync` at startup, bypassing dotenv entirely.

### 4.3 No Auth Rate Limiting
**Severity:** Low

The `/api/auth/callback/credentials` endpoint has no brute-force protection. For an internal single-user tool this is acceptable, but worth noting.

---

## 5. Items Not Yet Implemented

### 5.1 Slice 7 — Audit Hardening
The docs specify:
- **Prisma middleware blocking `AuditLogEvent` deletes** — Not implemented. `prisma.$use` middleware is not present in `lib/db/prisma.ts`.
- **End-to-end gate verification** — The gates (illustration confirmed → suitability → ASF) are enforced at the API level, which is correct. No additional hardening beyond what's implemented.

The audit log itself is comprehensive and is written correctly for all stage transitions, field confirmations, overrides, document generation, commission overrides, offer mismatch acknowledgement, and case closure.

### 5.2 README.md
The `README.md` is the default create-next-app template. It contains no project-specific documentation.
**Fix:** Replace with a project README covering setup, credentials, seeding, and the workflow overview.

### 5.3 Offer Panel — No Drag-and-Drop
The Illustration panel supports drag-and-drop upload. The Offer panel uses a file input button only. This is a minor UX inconsistency.

---

## 6. Positive Observations

These are things done particularly well:

- **Gate enforcement is consistent** across UI and API. Every panel checks its prerequisites at both the component level (locked state / enabled flag) and the API level (returns 403 with a clear error message). There is no way to generate a suitability letter without a confirmed illustration.
- **Audit log coverage is thorough.** Every meaningful action (stage changes, field confirmations, field overrides, date overrides, document generation, commission overrides, offer acknowledgement, case closure) writes an audit event with old/new values and reasons where applicable.
- **Commission split logic is correct.** `ManualOverride` is preserved across ASF regenerations. The 70/30 shared-case rule is enforced. Override requires a reason and is audited.
- **Stale draft detection** (for suitability) uses a cryptographic hash of the illustration fields that matter. The hash covers all relevant fields: loan amount, term, rate, rate end date, reversion rate, monthly payments, APRC, total repayable, fee amount, and fee-added flag.
- **Fee disclosure is mandatory**, not optional. The `useEffect` auto-trigger in the case view ensures it is always calculated once both illustrations are confirmed, and the suitability gate won't open without it for fee-scenario cases.
- **Proxy/middleware protection** (`proxy.ts`) correctly excludes `/login`, `/api/auth`, and static assets from the auth check, preventing redirect loops.
- **Soft delete** on cases preserves all data. The `status: "Active"` filter on `GET /api/cases` means closed cases disappear from the dashboard without data loss.

---

## 7. Summary of Actions Required Before Client Handover

| Priority | Item | Action |
|---|---|---|
| 🔴 High | `.env.txt` in repo | Verify not committed; rotate credentials if pushed |
| 🟠 Medium | `staleDueToInputChange` not set on field override | Fix in illustration field route |
| 🟠 Medium | `ADMIN_PASSWORD_HASH` env var workaround | Add comment/documentation |
| 🟡 Low | `SuitabilityPanel` generated date always blank | Fix to use `draft.generatedAt` |
| 🟡 Low | `ASFPanel` form reappears after approval | Fix form visibility condition |
| 🟡 Low | `PartAndPart` repayment not handled in offer route | Add to type union and handling |
| 🟢 Low | `README.md` is default template | Replace with project documentation |
| 🟢 Low | `docs/Implementation_Progress.md` not updated for Slices 4–6 | Document completed work |
| 🟢 Low | Prisma middleware blocking audit log deletes | Implement if required for Slice 7 |
| 🟢 Cosmetic | Offer panel lacks drag-and-drop | Optional UX improvement |
