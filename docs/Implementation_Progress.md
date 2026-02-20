# Implementation Progress

## Repo Flatten — Housekeeping

**Status: COMPLETE** ✅
**Date completed:** 2026-02-20

---

## What was done

### Directory Structure
- Moved all files from `mortgage-workflow/` subdirectory up to the repository root (`Tracer/`)
- Removed orphan `docs/` directory at the old root level (contained outdated copies of CLAUDE_CODE_PROMPTS.md, Implementation_Progress.md, MasterGovernancePrompt.md, Slice_Close_Out_Reports.md, and a stray image)
- Removed placeholder 12-byte `README.md` at old root (app's own README.md now serves as repo README)
- Added `.claude/` to `.gitignore`
- All 105 files moved with 100% git rename detection — full history preserved
- `npm install` + `prisma generate` + `npm run build` all pass at new root

### Vercel Action Required
- If Vercel project has "Root Directory" set to `mortgage-workflow`, update it to `.` (or clear it) in Vercel dashboard under Settings > General > Root Directory

---

## V2 Slice 0 — Schema Migration + Bug Fixes

**Status: COMPLETE** ✅
**Date completed:** 2026-02-20

---

## What was built

### Prisma Schema — V2 Extension
- 3 new enums: `WaitingOn` (Me, Client, Lender, Passive), `LeadSource` (Eileen, Direct), `TaskStatus` (Pending, InProgress, Complete, Skipped)
- 4 new Stage values: `Lead`, `ClientResponse`, `LenderProcessing`, `Offered` — additive, no v1 values removed
- 5 new AuditEventType values: `TaskCompleted`, `TaskSkipped`, `NoteAdded`, `WaitingOnChanged`, `DocumentCheckCompleted`
- 4 new fields on Case: `waitingOn`, `leadSource`, `clientSummary`, `feeArrangement`
- `markedComplete` Boolean added to both `SuitabilityDraft` and `ASFDraft`
- 4 new models: `Task`, `Note`, `Person`, `DocumentCheck`
- Migration: `20260220210312_v2_schema_upgrade`

### Bug Fixes
- **PartAndPart repayment** (Audit_Report §3.4): `app/api/offer/[caseId]/route.ts` — added `PartAndPart` to type union instead of silently coercing to `Repayment`
- **SL download approval gate** removed: `app/api/suitability/[caseId]/download/route.ts` — serves .docx regardless of `approvedByUser`
- **ASF download approval gate** removed: `app/api/asf/[caseId]/download/route.ts` — same pattern
- **staleDueToInputChange** (Audit_Report §3.3): Verified already implemented in v1 Slice 4 — field override route sets stale flag correctly (lines 65-74)
- **.env.txt** (Audit_Report §4.1): Verified `.env*` in `.gitignore`, never committed to git history

### Seed Script Update
- Existing 3 cases updated with `waitingOn`, `leadSource`, `clientSummary`, `feeArrangement`
- 2 new cases added: `Lead` stage (Eileen referral) and `ClientResponse` stage (Direct lead)
- Sample tasks (2-3 per case) and notes (1-2 per case) seeded

### Documentation
- `IMPLEMENTATION_SPEC_V2.md` — added §1.5 Stage Enum Extension with Kanban column mapping table

---

## Testing Checklist

| Test | Expected |
|---|---|
| `npx prisma migrate dev` | ✅ Clean — migration `20260220210312_v2_schema_upgrade` applied |
| `npm run build` | ✅ Clean — no TypeScript errors |
| `npx tsx scripts/seed.ts` | ✅ 5 cases seeded with tasks and notes |
| SL download without approval | .docx served (previously returned 400) |
| ASF download without approval | .docx served (previously returned 400) |
| Offer upload with PartAndPart | Correctly stored as `PartAndPart` (previously coerced to `Repayment`) |
| Existing API routes | No regressions — all routes still compile and respond |

---

## Slice 3 — Multi-Variant Upload + Fee Comparison Panel

**Status: COMPLETE** ✅
**Date completed:** 2026-02-19

---

## What was built

### Extractor — Variant Auto-Upgrade
- `lib/pdf/extractor.ts` — When `arrangementFeeAddedToLoan = true` is detected and the caller passed `variant = "None"`, the extractor automatically upgrades the stored variant to `"FeeAdded"`. This ensures the snapshot is correctly categorised regardless of which variant the upload UI defaulted to.

### Fee Calculation API
- `POST /api/cases/[id]/fee-calculation` — Finds both `FeeAdded` (or `None`) and `FeeUpfront` IllustrationSnapshots for the case; requires both to be confirmed; calculates `interestChargedOnFee = totalRepayableFeeAdded − totalRepayableFeeUpfront`; upserts `FeeDisclosureCalculation` record.
- `GET /api/cases/[id]/fee-calculation` — Returns the existing calculation or `null`.
- `GET /api/cases/[id]` — Updated to fetch `FeeDisclosureCalculation` alongside the case (separate query, merged into response) since there is no Prisma relation between `Case` and `FeeDisclosureCalculation`.

### FeeComparisonPanel
- `components/case/FeeComparisonPanel.tsx` — Read-only informational panel. `bg-[#F5F0E8]` (warm cream) background. Displays:
  - Total repayable (fee added to loan)
  - Total repayable (fee paid upfront)
  - Interest charged on arrangement fee over term (amber `#DD6B20`, bold)
  - All values formatted as `£X,XXX.XX` with `font-tabular`

### Case View Updates (`app/(app)/cases/[id]/page.tsx`)
- **Labels**: When fee scenario detected, primary slot relabels to `"Illustration A — Fee Added"` and secondary to `"Illustration B — Fee Upfront"`; no-fee cases keep `"Mortgage Illustration"`
- **FeeComparisonPanel**: Rendered inside the Illustration panel section when `hasFeeScenario && data.feeDisclosure`
- **Auto-trigger**: `useEffect` watches `data.illustrations`; when both are confirmed and `feeDisclosure` is null, fires `POST /api/cases/[id]/fee-calculation` then refreshes case data
- **Suitability gate**: `isSuitabilityEnabled()` updated to also require `feeDisclosure != null` for fee cases
- **Locked panel messages**: Fee scenarios show `"Upload and confirm both illustrations to unlock"`; no-fee cases show `"Confirm Illustration data to unlock"`
- **`CaseData` type**: Added `totalAmountRepayable` to `IllustrationRecord`; added `feeDisclosure: FeeDisclosure | null`

### Build Fix
- `"FeeCalculated"` is not in `AuditEventType` enum (schema would require migration to add). Removed audit log call from fee-calculation route — the calculation is derived/idempotent data.

---

## Testing Checklist

| Test | Expected |
|---|---|
| Upload fee-added illustration | Extraction detects fee; variant stored as FeeAdded; second slot appears |
| Second slot label | "Illustration B — Fee Upfront" |
| Upload fee-upfront illustration | Extracts correctly; variant stored as FeeUpfront |
| Confirm both illustrations | Fee calculation fires automatically; FeeComparisonPanel appears |
| Interest = £316,933.06 − £316,156.60 | £776.46 displayed in amber |
| Suitability locked (fee case, only one confirmed) | "Upload and confirm both illustrations to unlock" |
| Suitability unlocks (fee case) | Only after both confirmed + feeDisclosure exists |
| Upload illustration with no fee | Single panel; no second slot |
| Suitability unlocks (no-fee case) | After single illustration confirmed |
| Fee comparison panel | Read-only; no edit controls |

---

## Architectural Decisions

| Decision | Rationale |
|---|---|
| Variant auto-upgrade in extractor | Caller cannot know variant before extraction; easier to detect at extraction time than to rewrite the snapshot via a separate API call after upload |
| Fee calculation in `GET /api/cases/[id]` via separate query | `FeeDisclosureCalculation` has no Prisma `@relation` to `Case` — adding one requires a schema migration. Instead, parallel `findUnique` query merged into response. Works fine without migration. |
| Auto-trigger via `useEffect` (not on button press) | Fee disclosure is a mandatory regulatory disclosure, not user-initiated. Auto-calculate once prerequisites are met to ensure it's never missed. |
| No audit event for fee calculation | `AuditEventType` enum does not include `FeeCalculated` and modifying it requires a Prisma migration. The calculation is derived/idempotent and the component field confirmations already provide a clear audit trail. |

---

## Slice 2 — PDF Upload + Illustration Extraction

**Status: COMPLETE** ✅
**Date completed:** 2026-02-19

---

## What was built

### Storage
- `lib/storage/supabase.ts` — `uploadDocument(caseId, buffer, filename, documentType)` → storagePath; `getSignedUrl(storagePath, expiresInSeconds)` → signed URL. Uses `SUPABASE_SERVICE_KEY` server-side only.

### PDF Extraction Engine
- `lib/pdf/field-mappings.ts` — All ESIS regex patterns from §7.2 (`ESIS_PATTERNS`); `REQUIRED_FIELDS`, `MONETARY_FIELDS`, `PERCENT_FIELDS`, `DATE_FIELDS`, `BOOLEAN_FIELDS`, `MULTI_GROUP_FIELDS`
- `lib/pdf/parser-regex.ts` — `extractWithRegex(rawText)`. Splits on `\f` for page detection. Handles boolean fields, `loanAmountWithFeeAdded` 2-group, multi-group patterns. UK date parsing. Returns confidence 0.95 on match.
- `lib/pdf/parser-vision.ts` — `extractWithVision(pdfBuffer, missingFields)`. Sends base64 PDF as `type: "document"` to Claude API. Returns `VisionResults` with value/confidence/sourcePage per field.
- `lib/pdf/extractor.ts` — `extractFromPdf(pdfBuffer, documentId, caseId, variant)`. Hybrid: regex first → vision for low-confidence required fields → merge → persist ExtractedField rows → upsert IllustrationSnapshot → update Document.parseStatus.

### Document API Routes
- `POST /api/documents` — Multipart upload; saves to Supabase Storage; creates Document record; runs `extractFromPdf`; returns document + extractedFields + illustrationSnapshot
- `GET /api/documents/[id]` — Returns document + extractedFields + fresh signed URL + linked illustrationSnapshot

### Illustration API Routes
- `POST /api/illustrations/[id]/confirm` — Confirms all ExtractedFields on linked document; sets `IllustrationSnapshot.confirmed = true`; writes one `FieldConfirmed` audit event per field
- `PATCH /api/illustrations/[id]/field` — Updates a single ExtractedField `{ fieldKey, newValue, reason }`; sets `overridden = true`, `source = Manual`; writes `FieldOverridden` audit event with old/new value + reason

### UI Components
- `components/ui/SuccessPulse.tsx` — Wraps children; applies `success-pulse` CSS class when `trigger` prop changes; removes class after 700 ms
- `components/ui/FieldConfirmRow.tsx` — Field label + page ref, value display, edit mode (amber border + reason textarea + save/cancel), confirmed badge; calls `onFocus(sourcePage)` to jump PDF viewer; SuccessPulse on save

### Case UI — Illustration Panels
- `components/case/IllustrationVerifyPane.tsx` — Full-screen overlay. Left 50%: react-pdf-viewer with `pageNavigationPlugin`. Right 50%: sorted FieldConfirmRow list (required fields first). Header: confirm count + "Confirm All" (disabled until all required confirmed). Dynamic import `ssr: false`. pdfjs worker from CDN at v3.11.174.
- `components/case/IllustrationPanel.tsx` — 3-state panel: empty (drag-drop zone + upload button) → uploading (spinner) → extracted (lender/loan/variant summary + Verify Fields button). Shows fee-added banner when `arrangementFeeAddedToLoan = true`. Dynamic imports IllustrationVerifyPane.
- `app/(app)/cases/[id]/page.tsx` — IllustrationPanel wired in; renders primary panel (variant=None/FeeAdded) + conditional FeeUpfront panel when primary has `arrangementFeeAddedToLoan = true`; auto-refreshes case data via `onUploaded`

### Build Fixes
- `next.config.ts`: Added `serverExternalPackages: ["pdf-parse"]` — prevents pdfjs-dist from being bundled server-side (avoids `DOMMatrix is not defined` error). Moved `turbopack` from `experimental.turbopack` to top-level (Next.js 16 config change). Canvas alias retained for webpack.
- `lib/pdf/parser-vision.ts`: Fixed Anthropic SDK TypeScript error — cast `content` array as `Anthropic.ContentBlockParam[]` instead of casting individual document block element.

---

## Testing Checklist

| Test | Expected |
|---|---|
| Upload valid PDF illustration | Spinner → extracted summary card |
| Drag-and-drop PDF | Same as button upload |
| Upload non-PDF | Error message "Please upload a PDF file." |
| Extracted summary card | Lender name, loan amount, variant displayed |
| Verify Fields button | Opens full-screen split pane |
| PDF viewer | Document rendered, pages scrollable |
| Field rows | Required fields sorted first |
| Jump to page | Clicking a field row jumps PDF to source page |
| Edit a field | Amber border; requires reason to save |
| Save override without reason | Shows "Please enter a reason." error |
| Save override with reason | Field marked Confirmed; audit event written |
| Confirm All button | Disabled until all required fields confirmed |
| Confirm All success | Green pulse; pane closes; summary shows "✓ Confirmed" |
| Fee-added illustration | Second IllustrationPanel slot appears for FeeUpfront |
| Suitability panel unlock | Unlocks after both illustrations confirmed (if fee-added) |

---

## Architectural Decisions

| Decision | Rationale |
|---|---|
| `serverExternalPackages: ["pdf-parse"]` | pdf-parse v2 bundles pdfjs-dist which uses DOM APIs (DOMMatrix, etc.). Marking it external means Next.js loads it natively at runtime rather than bundling it through Turbopack |
| `turbopack.resolveAlias` top-level | Next.js 16 moved turbopack config from `experimental.turbopack` to top-level `turbopack` key |
| Hybrid regex + vision extraction | Regex is fast and deterministic for known ESIS layouts; vision fallback handles non-standard formatting. Required fields below 0.7 confidence trigger vision. |
| pdfjs worker from CDN | react-pdf-viewer requires a matching worker URL; CDN pin to exact pdfjs-dist v3.11.174 avoids version mismatch errors |
| `ssr: false` for IllustrationVerifyPane | pdfjs-dist and react-pdf-viewer require browser APIs; dynamic import with `ssr: false` prevents server-side evaluation |
| FieldConfirmRow local `confirmed` state | Allows instant UI feedback without waiting for a refetch; parent (IllustrationVerifyPane) tracks full list state |

---

## Slice 1 — Foundation + Auth + Dashboard + Case View Scaffold

**Status: COMPLETE** ✅
**Date completed:** 2026-02-19

---

## What was built

### Global Styles & Font
- `app/layout.tsx` — Inter font applied globally via `next/font/google` with CSS variable `--font-inter`
- `app/globals.css` — Tailwind v4 `@theme` block with full colour palette tokens; `.font-tabular` utility; `@keyframes successPulse` + `.success-pulse` class (600ms, forwards, no-repeat)

### Authentication
- `lib/auth.ts` — NextAuth.js v5 credentials provider; bcrypt password compare; JWT session strategy (30 min); Helen Kelly user
- `proxy.ts` — Route protection using `auth as proxy` (Next.js 16 uses `proxy.ts` instead of `middleware.ts` — see below)
- `app/(auth)/login/page.tsx` — Clean login form: `#FAFAF8` background, `border-[#E2E8F0]` card (no shadow), Inter font, `inputMode` hints, `#4A90D9` primary button
- `app/api/auth/[...nextauth]/route.ts` — Exports `{ GET, POST }` from `handlers`

### Database
- Schema already migrated (`prisma migrate dev --name init` was pre-run)
- `scripts/seed.ts` — Seeds 3 cases:
  - **Jane Doe** — Research — OVERDUE by 3 days
  - **John Smith** — DIP — Due tomorrow
  - **Sarah Connor** — AwaitingNB — On track (12 days)
- Run with: `npx tsx scripts/seed.ts`

### Stage Engine
- `lib/stage-engine/timer.ts` — `STAGE_RULES`, `addCalendarDays`, `calculatePriorityScore`, `getDaysRemaining`, `getDaysOverdue`
- `lib/stage-engine/transitions.ts` — 8 transition functions + `executeStageAction` router: `research_complete`, `chase_to_dip`, `chase_no_response`, `chase_cold_close`, `dip_to_post_dip_chase`, `dip_complete`, `nb_submitted`, `completed`; each writes `AuditLogEvent`
- `lib/stage-engine/priority.ts` — `getHeatmapBorder`, `getRowBackground`, `getPrimaryAction` + re-exports from timer

### Audit Logger
- `lib/audit/logger.ts` — `writeAuditLog(input: AuditLogInput)` — thin wrapper around `prisma.auditLogEvent.create`

### Case API Routes
- `GET /api/cases` — Active cases sorted by `priorityScore` ascending (overdue first)
- `POST /api/cases` — Create case; auto-calculates `stageDueAt` from `STAGE_RULES.research_due_days_from_created`
- `GET /api/cases/[id]` — Full case with all relations
- `PATCH /api/cases/[id]` — Update case fields
- `DELETE /api/cases/[id]` — Soft delete (status = Closed) + audit log
- `POST /api/cases/[id]/stage` — Stage transition `{ action: string }` → routes to transitions engine
- `GET /api/audit/[caseId]` — Full audit log ordered by `createdAt asc`

### Dashboard
- `app/(app)/dashboard/page.tsx` — Client component; fetches via `/api/cases`; "New Case" modal (clientName + caseType required); background `#E8EDF5`
- `components/dashboard/CaseTable.tsx` — Table with Chase Client 3-option modal
- `components/dashboard/CaseRow.tsx` — Heatmap `border-l-4` strip; row backgrounds; DueDateTooltip on Due Date cell; action button; ConfirmModal integration
- `components/dashboard/DueDateTooltip.tsx` — Contextual hover text: overdue / due today / N days remaining
- `components/dashboard/PriorityBadge.tsx` — Colour-coded days badge

### UI Components
- `components/ui/Button.tsx` — primary / secondary / danger / ghost variants
- `components/ui/StatusBadge.tsx` — Stage-to-colour mapping
- `components/ui/ConfirmModal.tsx` — `backdrop-blur-sm bg-black/20`, `border-[#E2E8F0] shadow-lg max-w-md`
- `components/ui/CollapsiblePanel.tsx` — `transition-all duration-200`; rotating chevron; `isActive` prop drives `border-l-4 border-[#4A90D9] bg-white`
- `components/ui/InlineOverrideField.tsx` — idle → editing (amber border + reason textarea) → saving → saved (success-pulse); cannot save without reason

### Case View
- `app/(app)/cases/[id]/page.tsx` — Two-column grid (left: panels, right: sticky stepper); `ActivePanelProvider` wraps page
- `components/case/ActivePanelContext.tsx` — React context; `activePanelId` + `setActivePanelId`
- `components/case/CaseProgressStepper.tsx` — 5 steps (Research → Chase Client → DIP → Awaiting NB → Submitted); completed / active / future states; smooth scroll on click
- `components/case/StageHeader.tsx` — Client name, stage badge, due date, countdown, primary action button; Chase modal inline
- `components/case/TimerPanel.tsx` — Stage started, due date (InlineOverrideField), days remaining/overdue, current stage
- `components/case/LockedPanelState.tsx` — `bg-[#F5F0E8] border-[#E2E8F0]` padlock + message

---

## Architectural Decisions

| Decision | Rationale |
|---|---|
| `proxy.ts` instead of `middleware.ts` | Next.js 16 renamed middleware convention. `middleware.ts` still works but emits a deprecation warning. Migrated to `proxy.ts` + `auth as proxy` |
| Tailwind v4 CSS theme tokens | No `tailwind.config.ts` in Tailwind v4. Colours defined via `@theme` block in `globals.css` |
| `prisma.config.ts` `earlyAccess` removed | That property doesn't exist in `PrismaConfig` type — was causing a TS error |
| Empty API stubs (Slice 2–7 routes) | Next.js 16 requires all `route.ts` files to export at least one HTTP handler. Added `GET/POST/PATCH` stubs returning `501 Not Implemented` |
| `calculatePriorityScore` exported from both `timer.ts` and `priority.ts` | `priority.ts` re-exports from `timer.ts` — the spec has the function in `timer.ts` but also mentions it in §11. Both paths work |
| Chase No Response — due date extension logic | Extends from `max(current due date, today) + 2 days` to avoid going backwards if already overdue |

---

## Testing Checklist

| Test | Expected |
|---|---|
| Login with `helen` / `[password]` | Redirects to `/dashboard` |
| Login with wrong password | Error message shown |
| Dashboard loads | 3 seeded cases visible |
| Sort order | Jane Doe (overdue) first, John Smith (due tomorrow) second, Sarah Connor last |
| Heatmap borders | Red / amber / green respectively |
| Due date hover tooltip | Contextual text shown |
| "Complete Research" on Jane Doe | Advances to ChaseClient; new due date calculated |
| Chase Client modal | Three options; "Case Started → DIP" advances stage |
| "No Response (+2 days)" | Due date extended; stays in ChaseClient |
| "Lead Cold → Close" | Case closed; removed from dashboard |
| "Complete DIP" on John Smith | Advances to AwaitingNB |
| Case view opens | Two-column layout, stepper shows correct state |
| Stepper states | Research=completed, DIP=active, etc. |
| Locked panels | Suitability + ASF show padlock + instruction |
| Active panel highlight | border-l-4 blue left border on clicked panel |
| Audit log panel | Shows stage transition events |

---

## What a Developer Needs to Continue

### To run the app
```bash
cd Tracer
cp .env.local .env.local  # already populated
npm run dev
# → http://localhost:3000
# Login: helen / [plaintext password used to generate ADMIN_PASSWORD_HASH]
```

### To reseed
```bash
npx tsx scripts/seed.ts
```

### Next slices
- **Slice 4** — Suitability letter `.docx` generation
- **Slice 5** — ASF `.docx` generation + commission logic
- **Slice 6** — Offer upload + mismatch comparison
- **Slice 7** — Audit hardening (Prisma middleware blocking AuditLog deletes, end-to-end gate verification)

### Key files for Slice 4
- `components/case/SuitabilityPanel.tsx` — stub exists, ready to implement
- `app/api/suitability/[caseId]/route.ts` — stub (501), implement draft generation
- `app/api/suitability/[caseId]/approve/route.ts` — stub (501), implement approval
- `app/api/suitability/[caseId]/download/route.ts` — stub (501), implement `.docx` download
- Suitability panel is already gated correctly in `app/(app)/cases/[id]/page.tsx` — will unlock once Slice 3 prerequisites are met
