# CLAUDE CODE PROMPTS
## Mortgage Adviser Workflow Automation Tool — v1.1
### How to use this file

Each section below is a **complete prompt** to paste into Claude Code at the start of each slice.
Always reference `IMPLEMENTATION_SPEC.md` as the source of truth. Complete each slice fully before starting the next.

---

## INITIAL SETUP — Paste once before Slice 1

```
I'm building a mortgage adviser workflow automation tool. The full specification is in 
IMPLEMENTATION_SPEC.md. Please read it completely before doing anything.

Then set up the project:

1. Scaffold a Next.js 14 app:
   npx create-next-app@latest mortgage-workflow --typescript --tailwind --app --no-src-dir

2. Install dependencies:
   npm install prisma @prisma/client next-auth@beta bcryptjs
   npm install @supabase/supabase-js
   npm install docx
   npm install pdf-parse
   npm install @anthropic-ai/sdk
   npm install @react-pdf-viewer/core @react-pdf-viewer/default-layout pdfjs-dist
   npm install -D @types/bcryptjs @types/pdf-parse

3. Create .env.local with the variable structure from §4 of the spec (placeholder values)

4. Create prisma/schema.prisma with the exact schema from §3 of the spec

5. Create the full folder structure from §2 of the spec (empty files are fine)

6. Create lib/db/prisma.ts as a Prisma client singleton

7. Create scripts/hash-password.ts — a script that accepts a plaintext password argument
   and outputs a bcrypt hash, so the ADMIN_PASSWORD_HASH env var can be set

Confirm when done and show me the folder structure.
```

---

## SLICE 1 — Foundation, Auth, Dashboard, Case View Scaffold

```
Read IMPLEMENTATION_SPEC.md sections 1, 2, 3, 5, 6, 10, 11, 12, 13, and 15.

Build Slice 1:

--- GLOBAL STYLES & FONT ---

1. Apply Inter font globally via next/font/google in app/layout.tsx
2. Add to globals.css:
   - .font-tabular { font-variant-numeric: tabular-nums; }
   - @keyframes successPulse animation (§15)
   - .success-pulse class (600ms, forwards, no repeat)
3. Tailwind colour tokens configured in tailwind.config.ts matching the palette in §1

--- AUTHENTICATION ---

4. Implement NextAuth.js v5 credentials provider exactly as in §5
5. /app/(auth)/login/page.tsx — clean login form:
   - Background: #FAFAF8, card with border-[#E2E8F0], no drop shadow on card
   - Inter font, Input fields with inputMode hints
   - Primary button: #4A90D9
6. middleware.ts protecting all app routes

--- DATABASE ---

7. npx prisma migrate dev --name init
8. Seed script: 3 sample cases at different stages (Research/DIP/AwaitingNB) 
   with staggered due dates (1 overdue, 1 due tomorrow, 1 on track)

--- STAGE ENGINE ---

9. lib/stage-engine/timer.ts — exact code from §6
10. lib/stage-engine/transitions.ts — all 8 transition functions from §6
    Each transition must write an AuditLogEvent
11. lib/stage-engine/priority.ts — calculatePriorityScore, getDaysRemaining, getDaysOverdue

--- CASE API ---

12. All routes from §10 for cases and stage transitions

--- DASHBOARD ---

13. /app/(app)/dashboard/page.tsx
    - Background: #E8EDF5
    - Table with columns: [heatmap strip] | Client Name | Stage | Due Date | Days | Action
    - getHeatmapBorder() from §11 — border-l-4 strip on each row
    - Row backgrounds: bg-red-50 overdue, bg-orange-50 due soon, bg-[#FAFAF8] neutral
    - Sort by priorityScore ascending (overdue first)
    - DueDateTooltip on hover over Due Date cell (§11 — contextual text)
    - getPrimaryAction() button (§11) — rightmost column, one button per row
    - "New Case" button → modal to create case (clientName + caseType required)
    - font-medium for labels, font-bold for values, font-tabular for all numeric data

14. Chase Client modal (three options): 
    "Case Started → DIP" | "No Response (+2 days)" | "Lead Cold → Close"

--- CASE VIEW SCAFFOLD ---

15. /app/(app)/cases/[id]/page.tsx
    Two-column grid layout:
    - Left column (main): vertical stack of CollapsiblePanel components
    - Right column: CaseProgressStepper (position: sticky; top: 1.5rem)

16. CaseProgressStepper.tsx (§12):
    - Steps: Research → Chase Client → DIP → Awaiting NB → Submitted
    - Per-step states: completed (✅ green), active (🔵 blue), locked (🔒 padlock), future (○)
    - Clicking completed/active step scrolls to that panel smoothly
    - Locked step hover tooltip explains prerequisite (§12)

17. CollapsiblePanel.tsx:
    - transition-all duration-200 height animation
    - Header: panel name + status badge + rotating chevron
    - Default: collapsed except active stage panel

18. LockedPanelState.tsx:
    - bg-[#F5F0E8], border border-[#E2E8F0], centered padlock + message
    - Used inside Suitability and ASF panels when prereqs not met

19. ActivePanelContext — React context tracking activePanelId
    - Active panel gets: border-l-4 border-[#4A90D9] + bg-white
    - No opacity changes on other panels

20. StageHeader component — always visible at top of case view:
    - Client name, stage, stage variant, due date, countdown
    - Primary stage action button

21. TimerPanel — stage start, due date, days remaining, inline date edit (§13)

--- CONFIRM MODAL ---

22. ConfirmModal.tsx (stage transitions only):
    - fixed inset-0 backdrop-blur-sm bg-black/20
    - bg-white, border-[#E2E8F0], shadow-lg, max-w-md
    - "Are you sure?" with Confirm + Cancel buttons

--- INLINE OVERRIDE FIELD ---

23. InlineOverrideField.tsx (§13):
    States: idle → editing (amber border + reason textarea) → saving → saved (success pulse)
    Save on blur from reason textarea
    Cannot save without reason (inline validation message)
    Used for all date fields in TimerPanel

Test:
- Login works
- 3 seeded cases appear, sorted correctly (overdue first)
- Heatmap borders show correct colours
- Hovering due date shows contextual tooltip
- Advancing Research → Chase → DIP works with audit log entries
- Case view opens with stepper showing correct state
- Locked panels show instruction text
- Active panel highlight applies on interaction

Update Implementation_Progress.md to confirm work complete, decisions made and anything needed to enable another developer to continue the project build.
```

---

## SLICE 2 — PDF Upload + Illustration Extraction

```
Read IMPLEMENTATION_SPEC.md sections 7, 13, 14, and 15.

Build Slice 2:

--- STORAGE ---

1. lib/storage/supabase.ts:
   - uploadDocument(caseId, file, documentType): saves to cases/{caseId}/{type}/{filename}
     Returns storagePath
   - getSignedUrl(storagePath): returns a short-lived signed URL (never public bucket URL)
   All operations use SUPABASE_SERVICE_KEY server-side only

--- DOCUMENT UPLOAD API ---

2. POST /api/documents
   - Accepts multipart/form-data: { file, caseId, documentType, variant }
   - Saves to Supabase Storage
   - Creates Document record (parseStatus: Parsed initially)
   - Triggers extraction synchronously
   - Returns document + all extractedFields + illustrationSnapshot

--- HYBRID EXTRACTION ENGINE ---

3. lib/pdf/field-mappings.ts — all regex patterns from §7.2 exactly as written

4. lib/pdf/parser-regex.ts:
   - Input: raw PDF text string
   - For each pattern group in ESIS_PATTERNS: try each regex, return first match
   - Return: { fieldKey, valueRaw, valueNormalized, confidence, sourcePage? }
   - confidence = 0.95 if matched, 0 if not matched
   - Attempt to infer sourcePage from text position (page breaks in pdf-parse output)

5. lib/pdf/parser-vision.ts — Claude API fallback from §7.3:
   - Called only for fields where regex confidence < 0.7
   - Returns { value, confidence, sourcePage } per field
   - Parse JSON strictly, handle malformed responses gracefully

6. lib/pdf/extractor.ts:
   - Try regex extraction first
   - Check required fields (listed in §7.1) for confidence < 0.7
   - If any missing: call vision fallback for those fields only
   - Merge results (vision overrides regex only where regex confidence was low)
   - Create ExtractedField records for ALL fields
   - Create IllustrationSnapshot from extracted values
   - Detect arrangementFeeAddedToLoan from patterns in §7.2

--- ILLUSTRATION PANEL UI ---

7. IllustrationPanel.tsx — three states:
   State 1: No illustration → "Upload Illustration" button (+ drag-drop zone)
   State 2: Uploaded + processing → spinner
   State 3: Uploaded + extracted → "Verify Fields" button

   If fee detected on confirmed illustration:
   Show banner: "⚠️ Second Illustration Required (Fee Upfront Version)"
   Second upload button appears

8. IllustrationVerifyPane.tsx — split-pane view (§14):
   Left 50%: react-pdf-viewer showing the uploaded PDF via signed URL
             Page navigation controls below
   Right 50%: FieldConfirmRow for each extracted field
              Columns: Field Name | Extracted Value (font-tabular) | ✓ Confirm | ✎ Edit

   When user focuses/clicks a field row on the right:
   → activePage updates to field.sourcePage
   → PDF viewer jumps to that page

   "Confirm All" button: only enabled when all required fields individually confirmed
   On confirm all: IllustrationSnapshot.confirmed = true, log FieldConfirmed per field
   Success pulse on each field row as it's confirmed

9. FieldConfirmRow.tsx:
   Edit mode: InlineOverrideField (amber border + reason textarea on edit)
   Confirmed state: green badge + success pulse
   All values displayed with font-tabular class

10. GET /api/documents/[id] — returns document + extracted fields for viewer

--- AUDIT ---

11. All field confirmations and overrides log to AuditLogEvent
    Override requires reason (enforced by InlineOverrideField)

Test with the Santander 5yr illustration:
- All fields extract via regex (no vision fallback needed)
- Split-pane opens: PDF visible on left, fields on right
- Clicking "Total Amount Repayable" jumps to PDF page 2
- Clicking "ERC" section jumps to PDF page 4
- InlineOverrideField: cannot save without entering a reason
- Override saved → logged to audit with old value, new value, reason
- "Confirm All" succeeds → illustration marked confirmed
- Fee-added detection: upload Nationwide illustration → dual upload prompt appears

Update Implementation_Progress.md to confirm work complete, decisions made and anything needed to enable another developer to continue the project build.

```

---

## SLICE 3 — Dual Illustration Fee Logic

```
Read IMPLEMENTATION_SPEC.md sections 7 (fee detection), 12 (fee comparison panel), 
and §12 suitability gate logic.

Build Slice 3:

1. MULTI-VARIANT UPLOAD
   IllustrationPanel handles two uploads when fee detected:
   - Label first upload: "Illustration A — Fee Added"
   - Label second upload: "Illustration B — Fee Upfront"
   - Both use the same upload + extraction flow from Slice 2
   - variant field set correctly: FeeAdded / FeeUpfront

2. FEE DISCLOSURE CALCULATION API
   POST /api/illustrations/[caseId]/fee-calculation
   - Requires both FeeAdded and FeeUpfront IllustrationSnapshots to be confirmed
   - interestChargedOnFee = totalRepayableFeeAdded - totalRepayableFeeUpfront
   - Creates/updates FeeDisclosureCalculation record

3. FEE COMPARISON PANEL
   FeeComparisonPanel.tsx — visible only when:
   arrangementFeeAddedToLoan = true AND both illustrations confirmed
   
   Displays (all read-only, font-tabular):
   - "Total repayable (fee added to loan): £X"
   - "Total repayable (fee paid upfront): £X"
   - "Interest charged on arrangement fee over term: £X"
   
   Background: bg-[#F5F0E8] (warm cream, informational tone)
   No editing allowed

4. SUITABILITY GATE UPDATE
   isSuitabilityEnabled() from §12 must now check:
   - If fee added: both variants confirmed AND FeeDisclosureCalculation exists
   - If no fee: single illustration confirmed
   Locked panel message updates: "Upload and confirm both illustrations to unlock"

Test:
- Upload Nationwide fee-added illustration → system detects fee, prompts for second
- Upload Nationwide fee-upfront illustration → fee calculation runs
- Verify: interest = £316,933.06 − £316,156.60 = £776.46
- Fee comparison panel appears with correct values
- Suitability panel locked until both confirmed
- Single illustration with no fee: suitability unlocks after one confirmation

Update Implementation_Progress.md to confirm work complete, decisions made and anything needed to enable another developer to continue the project build.
```

---

## SLICE 4 — Suitability Letter Generator

```
Read IMPLEMENTATION_SPEC.md sections 8 and 12 (SuitabilityPanel, stale banner).

Build Slice 4:

1. SUITABILITY PANEL UI
   Only active (not locked) after illustration confirmed (isSuitabilityEnabled = true)
   
   Form fields:
   - Objective category: dropdown (§8 ObjectiveCategory enum values, human-readable labels)
   - Objective notes: textarea ("Summarise client's mortgage objectives in their own words")
   - Justification mode: toggle "Preset / Manual"
     - Preset: dropdown of JUSTIFICATION_PRESETS keys (§8.3) + "Custom reason" text field
               that populates {{custom_reason}} in the template
     - Manual: full textarea
   - Affordability summary: textarea
   - Risk summary: textarea
   - Optional section toggles (checkboxes):
     Portability | Overpayments | Alternative Products
   
   Below the form: live preview pane (rendered letter content, readonly)
   "Generate Suitability Letter" button at bottom

2. GENERATION API — POST /api/suitability/[caseId]
   - Validate illustration confirmed + all required form fields present
   - Build letter from templates in §8.1–8.8
   - Set includeFeeAddedSection = true if FeeDisclosureCalculation exists
   - Set includePortabilitySection from illustration.portability
   - Set includeOverpaymentSection from illustration.overpaymentPercent != null
   - Compute inputHash (§8.9)
   - Create SuitabilityDraft record
   - Log AuditLogEvent DraftGenerated
   - Return draft content for preview

3. DOCX GENERATION — lib/documents/suitability-generator.ts
   - Uses docx npm library
   - Font: Calibri 11pt (standard letter font)
   - Line spacing: 1.15
   - Sections in order from §8.1
   - Conditional sections appear only when include flag = true
   - Generate as Buffer — do NOT save to disk in production

4. STALE DETECTION
   When any confirmed illustration field changes via PATCH /api/illustrations/[id]/field:
   - Check if SuitabilityDraft exists for this caseId
   - If yes: set staleDueToInputChange = true
   - Return stale status in response

5. STALE BANNER (§12)
   When staleDueToInputChange = true, show inside SuitabilityPanel:
   - Full-width banner: bg-[#F5F0E8], border-[#DD6B20] 1px
   - Text: "⚠️ Illustration data has changed since this letter was generated.
            Regenerate before exporting."
   - "Regenerate Now" button (primary action)
   - Export button disabled

6. APPROVAL GATE
   After generation: preview of letter content
   Checkbox: "I confirm this reflects the product and client circumstances"
   Export button disabled until checked
   POST /api/suitability/[caseId]/approve → approvedByUser = true, approvedAt = now

7. DOWNLOAD — GET /api/suitability/[caseId]/download
   - Regenerates .docx buffer
   - Streams to client as file download
   - Content-Disposition: attachment; filename="Suitability_Letter_{clientName}_{date}.docx"
   - No server-side file persistence

Test:
- Generate letter for Santander case — verify all data fields populated
- Fee section: appears for Nationwide fee-added case, absent for Santander (no fee)
- Portability section: appears for Nationwide, check Santander shows portability text
- Overpayment section: appears for both (both have overpayment terms)
- Change a confirmed illustration field → stale banner appears, export disabled
- Regenerate → stale banner clears
- Approval checkbox required before export
- Download: valid .docx opens in Word with correct content

Update Implementation_Progress.md to confirm work complete, decisions made and anything needed to enable another developer to continue the project build.
```

---

## SLICE 5 — ASF Generator

```
Read IMPLEMENTATION_SPEC.md sections 9 and 12 (ASF Panel).

Build Slice 5:

1. ASF PANEL UI
   Enabled only when illustration is confirmed (same gate as suitability)
   
   Manual input fields (with dropdowns where applicable):
   - Vulnerable client: Yes/No toggle
   - Source of business: dropdown (Existing Client | New Enquiry | Referral | Other)
   - Purpose of loan: dropdown (Purchase | Remortgage | Product Switch | Further Advance)
   - Type of borrower: dropdown (FTB | Homeowner | BTL | Other)
   - Account number: text field, optional (note: "Enter after application confirmed")
   
   Pre-populated from illustration (display with InlineOverrideField if edit needed):
   - Lender, product type, repayment method, loan amount, term, property value,
     monthly repayment, interest rate, feature expires, proc fee, client fee
   
   Commission split section:
   - Default shows: Helen Kelly 100%, Eileen Kelly 0%
   - If case.sharedCase = true: shows 70% / 30% automatically
   - "Override" button → InlineOverrideField pattern: enter custom percentages + reason
   - Override logged to AuditLog as CommissionOverridden
   
   "Generate ASF" button

2. GENERATION API — POST /api/asf/[caseId]
   - Validate illustration confirmed
   - calculateCommission() from §9.2
   - Create ASFDraft record
   - Create/update Commission record
   - Log DraftGenerated

3. DOCX GENERATION — lib/documents/asf-generator.ts
   Recreates the physical ASF form as a Word document using docx Table elements.
   Match the exact 6-table layout from the physical form:
   
   Table 0: Client name | Adviser: Helen Kelly | Vulnerable: No | Date
   Table 1: Current address | Mortgage property address
   Table 2: Source of business | Lender | Product type | Purpose | Borrower type | 
             Repayment method
   Table 3: Application date | Account number | Loan amount | Term | Property value |
             Monthly repayment | Rate type | Interest rate | Feature expires
   Table 4: Proc fee | Fee requested | Client fee | Request from solicitor |
             Request from client
   Table 5: COMMISSION SPLITS header | Name | % Split rows:
             Helen Kelly | [helenSplitPercent]
             Eileen Kelly | [eileenSplitPercent]

4. APPROVAL + DOWNLOAD
   Same pattern as Suitability: approval checkbox → POST approve → GET download
   Filename: "ASF_{clientName}_{date}.docx"

Test:
- Solo case: Helen = 100%, Eileen = 0% in generated ASF
- sharedCase = true: regenerate → Helen = 70%, Eileen = 30%
- Commission override → custom split + reason required → logged to audit
- Download ASF: open in Word, verify table layout matches physical form
- Pre-populated fields match illustration values exactly

Update Implementation_Progress.md to confirm work complete, decisions made and anything needed to enable another developer to continue the project build.
```

---

## SLICE 6 — Offer Upload + Comparison

```
Read IMPLEMENTATION_SPEC.md sections 7.2 (offer extraction patterns), 10 (offer API), 
and 12 (OfferPanel states).

Build Slice 6:

1. OFFER PANEL UI — three states (§12):
   State 1: No offer uploaded
            Collapsed with "Upload Offer PDF" button
            Note: "Optional — offer upload does not affect stage progression"
   
   State 2: Offer uploaded, matches illustration
            Green "✓ Offer matches Illustration" confirmation
            Show key matched fields (rate, loan, term)
   
   State 3: Offer uploaded, mismatch found
            Amber/warning banner: "⚠️ Offer differs from Illustration"
            Comparison table: Field | Illustration Value | Offer Value
            "Confirm Reviewed" button

2. OFFER EXTRACTION
   Reuse the document upload flow from Slice 2
   Extract subset of ESIS fields: confirmedRatePercent, confirmedLoanAmount, 
   confirmedTermYears, confirmedRepaymentMethod, offerExpiryAt
   
   Use the same ESIS_PATTERNS where applicable (the Nationwide offer PDFs use 
   identical ESIS format — same regex patterns work)

3. COMPARISON LOGIC
   compareOfferToIllustration() — compare against primary IllustrationSnapshot
   (variant = None or FeeAdded, whichever is confirmed):
   
   - Rate: abs difference > 0.001 → mismatch
   - Loan amount: abs difference > £0.01 → mismatch (note: fee-added illustration 
     includes fee in loan amount; compare to fee-added variant if present)
   - Term: exact match required
   - Repayment method: exact match required
   
   Store mismatchFields array on OfferSnapshot

4. ACKNOWLEDGMENT API
   POST /api/offer/[caseId]/acknowledge
   - Sets acknowledgedByUser = true, acknowledgedAt = now
   - Logs OfferMismatchAcknowledged to AuditLog
   - Returns updated OfferSnapshot
   
   This does NOT block any stage progression.
   NB submission does NOT require offer upload.

Test:
- Upload Nationwide fee-upfront offer → compare to fee-upfront illustration
  → should show match (same loan amount, rate, term)
- Upload Nationwide fee-added offer → compare to fee-added illustration
  → loan amounts differ by £999 (fee) — verify mismatch correctly detected
- Acknowledge mismatch → green confirmation, logged to audit
- Verify that NB submission works regardless of offer state

Update Implementation_Progress.md to confirm work complete, decisions made and anything needed to enable another developer to continue the project build.
```

---

## SLICE 7 — Audit & Compliance Hardening

```
Read IMPLEMENTATION_SPEC.md sections 12 (Audit Summary), 16 (Security), and 19 (Testing).

Build Slice 7:

1. AUDIT SUMMARY PANEL
   Collapsed by default in case view
   Shows ALL AuditLogEvents for the case, reverse chronological
   
   Each entry displays:
   - Timestamp (formatted: "23 Jan 2026, 14:32")
   - Event type (human-readable label, e.g. "Field Overridden", "Stage Changed")
   - Field (if applicable)
   - Old value → New value (if applicable)
   - Reason (if provided)
   
   Expandable individual entries for full detail
   Read-only. Zero edit/delete controls visible.

2. IMMUTABLE AUDIT LOG — Prisma middleware
   In lib/db/prisma.ts, add middleware that throws an Error if any operation 
   attempts to DELETE or UPDATE an AuditLogEvent record:
   
   prisma.$use(async (params, next) => {
     if (params.model === 'AuditLogEvent') {
       if (params.action === 'delete' || params.action === 'deleteMany' ||
           params.action === 'update' || params.action === 'updateMany') {
         throw new Error('AuditLogEvent records are immutable')
       }
     }
     return next(params)
   })

3. NB LATE FLAG
   When POST /api/cases/[id]/stage is called with action: 'nb_submitted':
   - Compare nbSubmittedAt to nbDueAt
   - If nbSubmittedAt > nbDueAt: add "late_nb" flag to case (add lateNbSubmission: Boolean 
     field to Case model, migrate)
   - Show "⚠️ Submitted Late" badge on case in both dashboard and case view

4. SUBMISSION DATE PROTECTION
   applicationSubmittedAt and nbSubmittedAt:
   - Cannot be edited via normal PATCH /api/cases/[id]
   - Can only be changed via a dedicated override endpoint:
     PATCH /api/cases/[id]/submission-date
     Body: { field: 'applicationSubmittedAt' | 'nbSubmittedAt', newValue: string, reason: string }
   - Requires reason (validated server-side — reject if reason empty)
   - Logs DateOverridden to AuditLog with old + new value + reason
   - Original value preserved in audit log

5. ERROR STATES
   Ensure the following are handled gracefully everywhere:
   
   PDF parse failure (ParseStatus = Failed):
   - Show in IllustrationPanel: "Extraction failed. Please enter fields manually."
   - All fields appear as blank manual inputs (InlineOverrideField, source: Manual)
   - User can fill in all fields manually; confirm as normal
   
   Partial extraction (ParseStatus = Partial — some fields missing):
   - Show: "Some fields could not be extracted — please review and confirm manually."
   - Missing fields shown as empty inputs in the verification form
   - Split-pane still opens with PDF on left
   
   Generation failure (suitability or ASF):
   - Show error message inside the panel
   - Do NOT create a SuitabilityDraft or ASFDraft record
   - No partial drafts stored

6. DASHBOARD RECALCULATION
   Priority scores recalculate on every GET /api/cases request (no caching)
   Add a "Refresh" button to the dashboard header that re-fetches

7. FINAL GATE VERIFICATION CHECKLIST
   After building, manually verify all the following:
   □ Cannot generate Suitability without confirmed illustration
   □ Cannot generate Suitability without both illustrations if fee added
   □ Cannot export Suitability without approval checkbox ticked
   □ Cannot export stale Suitability (data changed after generation)
   □ Cannot mark DIP complete without explicit button click + confirm modal
   □ Cannot submit to NB without applicationSubmittedAt set
   □ All date changes require reason (inline, not modal)
   □ All field overrides require reason (inline)
   □ AuditLog cannot be deleted or edited (Prisma middleware)
   □ Offer mismatch requires acknowledgment but does NOT block stage
   □ Commission override requires reason and is audited
   □ NB submitted late correctly flagged
   □ PDF parse failure shows manual entry fallback

Update Implementation_Progress.md to confirm work complete, decisions made and anything needed to enable another developer to continue the project build.
```

---

## DEPLOYMENT — Run after all slices complete

```
Deploy to Vercel + Supabase:

1. Create Supabase project at supabase.com:
   - Copy DATABASE_URL (use pooled connection URL for Vercel serverless)
   - Create Storage bucket "mortgage-docs" — set to PRIVATE (not public)
   - Copy SUPABASE_SERVICE_KEY and NEXT_PUBLIC_SUPABASE_URL

2. Run migrations against Supabase:
   DATABASE_URL="[supabase pooled url]" npx prisma migrate deploy

3. Generate bcrypt password hash:
   node scripts/hash-password.ts [your chosen password]
   Copy the output as ADMIN_PASSWORD_HASH

4. Deploy to Vercel:
   - Push repo to GitHub
   - Connect repo in Vercel dashboard
   - Add ALL environment variables from .env.local in Vercel Settings → Environment Variables
   - Set NEXTAUTH_URL to the Vercel deployment URL (e.g. https://mortgage-workflow.vercel.app)
   - Deploy

5. Post-deployment smoke test:
   □ Login works on deployed URL
   □ Create a case, advance through stages
   □ Upload Santander illustration — extraction succeeds
   □ Split-pane PDF viewer loads
   □ Confirm fields, generate Suitability Letter, download .docx
   □ Generate ASF, download .docx
   □ Audit log shows all events
```
