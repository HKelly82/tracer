# IMPLEMENTATION SPEC
## Mortgage Adviser Workflow Automation Tool
### Version 1.1 — For Claude Code

---

## ⚠️ FLAGGED DISCREPANCY — READ BEFORE BUILDING

The PRD states commission defaults to **100% Helen**, with 70/30 only when `shared_case = true`.
The physical ASF template is pre-filled with **70/30** as default.

**Resolution encoded in this spec:** PRD logic is used. Default = 100% Helen. `shared_case = true` triggers 70/30. The commission split UI must allow manual override on any case. Confirm with Helen before go-live.

---

## 1. TECHNOLOGY STACK

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Full-stack, Vercel-native |
| Database | PostgreSQL via Supabase | Free tier, cloud-accessible |
| ORM | Prisma | Type-safe, migration tooling |
| Auth | NextAuth.js v5 (credentials provider) | Free, simple, single-user |
| File storage | Supabase Storage | Co-located with DB |
| PDF parsing | pdf-parse (primary) + Anthropic Claude API vision (fallback) | Hybrid |
| PDF viewer | @react-pdf-viewer/core | Split-pane document verification |
| Doc generation | docx (npm) | Produces real .docx files |
| Styling | Tailwind CSS | Utility-first |
| Font | Inter (via next/font/google) | High x-height, excellent numeric legibility |
| Deployment | Vercel | Free tier, works everywhere |

### Colour Palette

```
Primary (Action):      #4A90D9  — Buttons, primary nav, active panel accent
Surface (Warm):        #FAFAF8  — Main page background
Dashboard Neutral:     #E8EDF5  — Case list background
Alert (Overdue):       #E53E3E  — Overdue cases, danger states
Warning (Due):         #DD6B20  — Due today/tomorrow, amber states
Success:               #38A169  — Completed stages, confirmed fields
Text (Primary):        #2D3748  — Main text, soft grey-black
Text (Muted):          #A0AEC0  — Closed/inactive items
Accent (Warm):         #F5F0E8  — Stale banners, locked panels, cream tones
Border:                #E2E8F0  — All section borders (1px)
Active Panel Accent:   #4A90D9  — Left border on currently active panel
```

### Typography Rules

- **Font:** Inter via `next/font/google`. Apply globally in `layout.tsx`.
- **Tabular figures:** All numeric data in tables and confirmation forms must use `font-variant-numeric: tabular-nums` so decimals align vertically. Add `.font-tabular` utility to `globals.css`.
- **Weight hierarchy:** `font-medium` (500) for labels. `font-bold` (700) for data values. `font-normal` for body text.
- **No drop shadows on regular elements.** Use `border border-[#E2E8F0]` to define sections. `shadow-lg` for modals only.

```css
/* globals.css */
.font-tabular {
  font-variant-numeric: tabular-nums;
}
```

---

## 2. PROJECT STRUCTURE

```
/app
  /api
    /auth/[...nextauth]/route.ts
    /cases/route.ts
    /cases/[id]/route.ts
    /cases/[id]/stage/route.ts
    /documents/route.ts
    /documents/[id]/route.ts
    /illustrations/[id]/confirm/route.ts
    /illustrations/[id]/field/route.ts
    /suitability/[caseId]/route.ts
    /suitability/[caseId]/approve/route.ts
    /suitability/[caseId]/download/route.ts
    /asf/[caseId]/route.ts
    /asf/[caseId]/approve/route.ts
    /asf/[caseId]/download/route.ts
    /offer/[caseId]/route.ts
    /offer/[caseId]/acknowledge/route.ts
    /audit/[caseId]/route.ts
  /(auth)
    /login/page.tsx
  /(app)
    /layout.tsx
    /page.tsx
    /dashboard/page.tsx
    /cases/[id]/page.tsx
/components
  /dashboard
    CaseTable.tsx
    CaseRow.tsx              ← includes heatmap left border strip
    PriorityBadge.tsx
    DueDateTooltip.tsx
  /case
    CaseProgressStepper.tsx  ← sticky right-side stepper
    StageHeader.tsx
    TimerPanel.tsx
    IllustrationPanel.tsx
    IllustrationVerifyPane.tsx  ← split-pane PDF + fields view
    FeeComparisonPanel.tsx
    OfferPanel.tsx
    SuitabilityPanel.tsx
    ASFPanel.tsx
    AuditSummary.tsx
    LockedPanelState.tsx     ← "locked" empty state with instruction
  /ui
    Button.tsx
    ConfirmModal.tsx          ← stage transitions only
    InlineOverrideField.tsx   ← replaces modal for all field overrides
    CollapsiblePanel.tsx
    FieldConfirmRow.tsx
    StatusBadge.tsx
    SuccessPulse.tsx          ← green pulse animation on confirmed fields
/lib
  /db
    prisma.ts
  /pdf
    extractor.ts
    parser-regex.ts
    parser-vision.ts
    field-mappings.ts
  /documents
    suitability-generator.ts
    asf-generator.ts
    docx-utils.ts
  /stage-engine
    timer.ts
    transitions.ts
    priority.ts
  /audit
    logger.ts
/types
  index.ts
```

---

## 3. DATABASE SCHEMA (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Case {
  id                        String         @id @default(uuid())
  clientName                String
  caseType                  CaseType       @default(Remortgage)
  status                    CaseStatus     @default(Active)
  stage                     Stage          @default(Research)
  stageVariant              StageVariant?
  stageStartedAt            DateTime       @default(now())
  stageDueAt                DateTime
  lastActionAt              DateTime       @default(now())
  researchCompletedAt       DateTime?
  dipCompletedAt            DateTime?
  applicationSubmittedAt    DateTime?
  nbDueAt                   DateTime?
  nbSubmittedAt             DateTime?
  rateExpiryAt              DateTime?
  offerExpiryAt             DateTime?
  sharedCase                Boolean        @default(false)
  createdAt                 DateTime       @default(now())
  updatedAt                 DateTime       @updatedAt

  illustrations             IllustrationSnapshot[]
  offer                     OfferSnapshot?
  suitabilityDraft          SuitabilityDraft?
  asfDraft                  ASFDraft?
  commission                Commission?
  auditLog                  AuditLogEvent[]
  documents                 Document[]
}

model Document {
  id               String              @id @default(uuid())
  caseId           String
  case             Case                @relation(fields: [caseId], references: [id])
  documentType     DocumentType
  variant          IllustrationVariant?
  uploadedAt       DateTime            @default(now())
  originalFilename String
  storagePath      String
  parseStatus      ParseStatus         @default(Parsed)
  parseVersion     String              @default("1.0")
  extractedFields  ExtractedField[]
}

model ExtractedField {
  id              String      @id @default(uuid())
  documentId      String
  document        Document    @relation(fields: [documentId], references: [id])
  fieldKey        String
  valueRaw        String
  valueNormalized String
  valueType       FieldType
  source          FieldSource @default(Extracted)
  sourcePage      Int?        // used for PDF viewer page-jump navigation
  confidence      Float?
  confirmed       Boolean     @default(false)
  confirmedAt     DateTime?
  overridden      Boolean     @default(false)
  overrideReason  String?
  overriddenAt    DateTime?
}

model IllustrationSnapshot {
  id                        String              @id @default(uuid())
  caseId                    String
  case                      Case                @relation(fields: [caseId], references: [id])
  documentId                String              @unique
  variant                   IllustrationVariant @default(None)
  lenderName                String
  productName               String
  productCode               String?
  loanPurpose               String?
  repaymentMethod           RepaymentMethod     @default(Repayment)
  loanAmount                Decimal
  termYears                 Int
  propertyValue             Decimal
  ltvPercent                Decimal?
  initialRatePercent        Decimal
  initialRateEndDate        DateTime
  reversionRatePercent      Decimal
  monthlyPaymentInitial     Decimal
  monthlyPaymentReversion   Decimal
  aprcPercent               Decimal
  totalAmountRepayable      Decimal
  arrangementFeeAmount      Decimal             @default(0)
  arrangementFeeAddedToLoan Boolean             @default(false)
  brokerFeeAmount           Decimal             @default(0)
  procFeeAmount             Decimal?
  cashbackAmount            Decimal?
  ercSummaryText            String?
  portability               Boolean             @default(false)
  overpaymentPercent        Decimal?
  rateExpiryAt              DateTime?
  confirmed                 Boolean             @default(false)
  createdAt                 DateTime            @default(now())
}

model FeeDisclosureCalculation {
  id                       String   @id @default(uuid())
  caseId                   String   @unique
  feeAddedAmount           Decimal
  totalRepayableFeeAdded   Decimal
  totalRepayableFeeUpfront Decimal
  interestChargedOnFee     Decimal
  calculatedAt             DateTime @default(now())
}

model OfferSnapshot {
  id                       String          @id @default(uuid())
  caseId                   String          @unique
  case                     Case            @relation(fields: [caseId], references: [id])
  documentId               String          @unique
  offerExpiryAt            DateTime?
  confirmedRatePercent     Decimal
  confirmedLoanAmount      Decimal
  confirmedTermYears       Int
  confirmedRepaymentMethod RepaymentMethod
  matchesIllustration      Boolean         @default(true)
  mismatchFields           String[]
  acknowledgedByUser       Boolean         @default(false)
  acknowledgedAt           DateTime?
  createdAt                DateTime        @default(now())
}

model SuitabilityDraft {
  id                         String            @id @default(uuid())
  caseId                     String            @unique
  case                       Case              @relation(fields: [caseId], references: [id])
  generatedAt                DateTime          @default(now())
  templateVersion            String            @default("1.1")
  objectiveCategory          ObjectiveCategory
  objectiveNotes             String?
  justificationMode          JustificationMode @default(Preset)
  presetJustificationKey     String?
  manualJustificationText    String?
  affordabilitySummary       String
  riskSummary                String
  includeFeeAddedSection     Boolean           @default(false)
  includeErcSection          Boolean           @default(true)
  includePortabilitySection  Boolean           @default(false)
  includeOverpaymentSection  Boolean           @default(false)
  includeAlternativeProducts Boolean           @default(false)
  inputHash                  String
  staleDueToInputChange      Boolean           @default(false)
  approvedByUser             Boolean           @default(false)
  approvedAt                 DateTime?
  generatedDocPath           String?
}

model ASFDraft {
  id              String   @id @default(uuid())
  caseId          String   @unique
  case            Case     @relation(fields: [caseId], references: [id])
  generatedAt     DateTime @default(now())
  templateVersion String   @default("1.0")
  vulnerableClient Boolean @default(false)
  sourceOfBusiness String?
  purposeOfLoan   String?
  borrowerType    String?
  accountNumber   String?
  approvedByUser  Boolean  @default(false)
  approvedAt      DateTime?
  generatedDocPath String?
}

model Commission {
  id                String         @id @default(uuid())
  caseId            String         @unique
  case              Case           @relation(fields: [caseId], references: [id])
  grossCommission   Decimal?
  helenSplitPercent Decimal        @default(100)
  eileenSplitPercent Decimal       @default(0)
  brokerFeeAmount   Decimal        @default(0)
  feeWaived         Boolean        @default(false)
  splitRuleApplied  CommissionRule @default(DefaultHelen100)
}

model AuditLogEvent {
  id         String         @id @default(uuid())
  caseId     String
  case       Case           @relation(fields: [caseId], references: [id])
  eventType  AuditEventType
  entityType String?
  entityId   String?
  fieldKey   String?
  oldValue   String?
  newValue   String?
  reason     String?
  createdAt  DateTime       @default(now())
}

// ─── Enums ───────────────────────────────────────────────────

enum CaseType { FTB HomeMover Remortgage BTL ProductSwitch Other }
enum CaseStatus { Active Closed Completed }
enum Stage { Research ChaseClient DIP PostDIPChase AwaitingNB NBSubmitted Closed Completed }
enum StageVariant { PostDIPChase }
enum DocumentType { Illustration Offer Application Other }
enum IllustrationVariant { FeeAdded FeeUpfront None }
enum ParseStatus { Parsed Partial Failed }
enum FieldType { String Number Date Boolean }
enum FieldSource { Extracted Manual }
enum RepaymentMethod { Repayment InterestOnly PartAndPart }
enum ObjectiveCategory { RateSecurity ReducePayment RaiseCapital ShortenTerm DebtConsolidation ProductSwitch Other }
enum JustificationMode { Preset Manual }
enum CommissionRule { DefaultHelen100 Shared7030 ManualOverride }
enum AuditEventType { StageChanged FieldConfirmed FieldOverridden DateOverridden DraftGenerated DraftRegenerated OfferMismatchAcknowledged CaseClosed CaseReopened CommissionOverridden }
```

---

## 4. ENVIRONMENT VARIABLES

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
NEXTAUTH_SECRET="[openssl rand -base64 32]"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_USERNAME="helen"
ADMIN_PASSWORD_HASH="[bcrypt hash]"
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
SUPABASE_SERVICE_KEY="[service role key]"
SUPABASE_STORAGE_BUCKET="mortgage-docs"
ANTHROPIC_API_KEY="[key]"
ANTHROPIC_VISION_MODEL="claude-opus-4-6"
```

---

## 5. AUTHENTICATION

```typescript
// lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials.username === process.env.ADMIN_USERNAME &&
          await bcrypt.compare(credentials.password as string, process.env.ADMIN_PASSWORD_HASH!)
        ) {
          return { id: "1", name: "Helen Kelly", email: "hkelly@hansonwealth.co.uk" }
        }
        return null
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 60 },
})

// middleware.ts
export { auth as middleware } from "@/lib/auth"
export const config = { matcher: ["/((?!login|api/auth).*)"] }
```

---

## 6. STAGE TIMER ENGINE

```typescript
// lib/stage-engine/timer.ts

export const STAGE_RULES = {
  research_due_days_from_created: 2,
  chase_due_days_from_research_complete: 2,
  chase_no_response_reset_days: 2,
  dip_due_days_from_case_started: 1,
  post_dip_chase_due_days: 5,
  nb_due_days_from_application_submitted: 20,
}

export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function calculatePriorityScore(stageDueAt: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(stageDueAt)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  // negative = overdue (sorts first), positive = days remaining
}

export function getDaysRemaining(stageDueAt: Date): number {
  const s = calculatePriorityScore(stageDueAt)
  return s > 0 ? s : 0
}

export function getDaysOverdue(stageDueAt: Date): number {
  const s = calculatePriorityScore(stageDueAt)
  return s < 0 ? Math.abs(s) : 0
}
```

Stage transitions in `lib/stage-engine/transitions.ts` — one function per transition, each must:
1. Update `Case.stage` + `Case.stageDueAt`
2. Set the relevant date field (e.g. `researchCompletedAt`, `dipCompletedAt`)
3. Write an `AuditLogEvent` with `eventType: StageChanged`

---

## 7. PDF EXTRACTION — HYBRID STRATEGY

### 7.1 Flow

```
Upload → pdf-parse (raw text) → regex patterns → confidence score per field
→ if any required field < 0.7 confidence: Claude vision API for missing fields only
→ store ExtractedField records (with sourcePage) → user confirms via split-pane UI
```

Required fields (vision fallback triggered if any missing):
`lenderName, loanAmount, termYears, initialRatePercent, initialRateEndDate,
reversionRatePercent, monthlyPaymentInitial, monthlyPaymentReversion, aprcPercent, totalAmountRepayable`

### 7.2 Regex Patterns

```typescript
// lib/pdf/field-mappings.ts

export const ESIS_PATTERNS = {
  lenderName: [
    /Lender:\s+([^\n]+)/i,
    /^Lender\s*\n\s*([^\n]+)/m,
  ],
  loanAmount: [
    /Amount and currency of the loan to be (?:granted|switched):\s*£([\d,]+(?:\.\d{2})?)/i,
    /Loan Amount:\s*£?([\d,]+(?:\.\d{2})?)/i,
  ],
  loanAmountWithFeeAdded: [
    // "£177,374.88 plus a fee of £999.00 which will be added to your loan"
    /loan to be (?:granted|switched):\s*£([\d,]+(?:\.\d{2})?)\s+plus a fee of\s*£([\d,]+(?:\.\d{2})?)\s+which will be added/i,
  ],
  arrangementFeeAddedToLoan: [
    /which will be added to your loan/i,
    /adding it to the loan/i,
    /added to the loan/i,
  ],
  termYears: [
    /Duration of the loan:\s+(\d+)\s+years?/i,
    /a term of (\d+) years?/i,
  ],
  productDescription: [
    /Product Description:\s+([^\n]+?)\s+Product Code:/i,
    /Product description:\s+([^\n]+)/i,
  ],
  productCode: [/Product Code:\s+([A-Z0-9]+)/i],
  initialRatePercent: [
    /fixed rate of ([\d.]+)%\s+until/i,
    /initial (?:fixed )?interest rate of ([\d.]+)%/i,
    /Initial Rate:\s+([\d.]+)%/i,
  ],
  initialRateEndDate: [
    /fixed (?:rate )?(?:until|to|till)\s+(\d{1,2}[\s-]\w+[\s-]\d{4}|\d{2}[/-]\d{2}[/-]\d{4})/i,
    /until\s+(\d{2}[/-]\d{2}[/-]\d{4})/i,
    /till\s+(\d{2}-\d{2}-\d{2,4})/i,
  ],
  reversionRatePercent: [
    /currently\s+([\d.]+)%(?:,\s+for the remaining)/i,
    /Standard Mortgage Rate.*?currently\s+([\d.]+)%/i,
    /SVR.*?currently\s+([\d.]+)%/i,
    /variable rate.*?currently\s+([\d.]+)%/i,
  ],
  aprcPercent: [
    /APRC (?:applicable to your loan )?is\s+([\d.]+)%/i,
    /APRC:\s+([\d.]+)%/i,
  ],
  totalAmountRepayable: [
    /Total amount to be repaid:\s*£([\d,]+)/i,
    /Total amount repayable:\s*£([\d,]+)/i,
  ],
  arrangementFeeAmount: [
    /Account Fee\s+£([\d,]+(?:\.\d{2})?)/i,
    /product fee of\s*£([\d,]+(?:\.\d{2})?)/i,
    /arrangement fee.*?£([\d,]+(?:\.\d{2})?)/i,
  ],
  brokerFeeAmount: [
    /Broker Fee\s+£([\d,]+(?:\.\d{2})?)/i,
    /broker.*?fee.*?£([\d,]+(?:\.\d{2})?)/i,
  ],
  procFeeAmount: [
    /will pay\s+[^\n]+?(?:a total of|an amount of)\s*£([\d,]+(?:\.\d{2})?)/i,
  ],
  cashbackAmount: [
    /cashback of\s*£([\d,]+(?:\.\d{2})?)/i,
  ],
  propertyValue: [
    /Value of the property assumed.*?:\s*£([\d,]+)/i,
    /Property (?:Price|Value):\s*£?([\d,]+)/i,
  ],
  monthlyPaymentInitial: [
    /(\d+)\s+payments at a fixed rate.*?£([\d,]+\.\d{2})/i,
    /(\d+) payments of\s*£([\d,]+\.\d{2})/i,
    /Initial Monthly Payment:\s*£?([\d,]+\.\d{2})/i,
  ],
  monthlyPaymentReversion: [
    /(\d+)\s+payments at a variable rate.*?£([\d,]+\.\d{2})/i,
    /Followed by\s+\d+\s+payments of\s*£([\d,]+\.\d{2})/i,
  ],
  portability: [
    /You have the right to transfer this product/i,
    /Portability/i,
  ],
  overpaymentPercent: [
    /overpayments.*?up to\s+(\d+)%/i,
    /additional capital repayments of up to\s+(\d+)%/i,
  ],
}
```

### 7.3 Vision Fallback

```typescript
// lib/pdf/parser-vision.ts
// Called only for fields where regex confidence < 0.7

const prompt = `Extract these fields from this UK mortgage illustration (ESIS format) 
and return ONLY valid JSON:
${missingFields.map(f => `- ${f}`).join('\n')}

Format:
{ "fieldName": { "value": <extracted>, "confidence": 0.95, "sourcePage": 2 } }

Rules:
- monetary: number without £/commas (148000)
- percentages: number (3.92)  
- dates: ISO YYYY-MM-DD
- booleans: true/false
- sourcePage: 1-based page number where found
- not found: null with confidence 0`
```

---

## 8. SUITABILITY LETTER GENERATOR

### 8.1 Template Structure

**Mandatory sections:**
1. Header (client name, address, date)
2. Salutation
3. Standard intro
4. Objectives paragraph (from `objectiveNotes`)
5. Recommendation paragraph (§8.2)
6. Justification paragraph (§8.3 preset or manual)
7. ERC disclosure (§8.5 — always present)
8. Affordability confirmation
9. Cost/charges reference
10. Illustration reference + date
11. Sign-off (Helen Kelly, Mortgage & Protection Adviser)

**Conditional sections** (flag-controlled):
- Fee Added (§8.4) — `includeFeeAddedSection`
- Portability (§8.6) — `includePortabilitySection`
- Overpayments (§8.7) — `includeOverpaymentSection`
- Alternative Products — `includeAlternativeProducts` (manual trigger only)

### 8.2 Recommendation Paragraph

```
A {{termYears}} year {{rateType}} rate mortgage with {{lenderName}}, on a {{repaymentMethod}} basis.

The initial interest rate of {{initialRatePercent}}% will be applied until {{initialRateEndDate}}, 
resulting in monthly payments of £{{monthlyPaymentInitial}}. The monthly payments, after the end 
of this rate would be £{{monthlyPaymentReversion}}, this is based on the lender's current variable 
rate of {{reversionRatePercent}}%, which is subject to change and could go up, therefore you may 
have to pay more than the figure quoted.
```

### 8.3 Justification Presets

```typescript
export const JUSTIFICATION_PRESETS: Record<string, string> = {
  rate_security_5yr:
    "A Fixed Rate is being recommended because you prefer the security of knowing your monthly payments will not fluctuate during the initial term. I have recommended a Fixed Rate period of 5 years because {{custom_reason}}.",
  rate_security_2yr:
    "A Fixed Rate is being recommended because you prefer the security of knowing your monthly payments will not fluctuate during the initial term. I have recommended a Fixed Rate period of 2 years because {{custom_reason}}.",
  reduce_payment:
    "In order to ensure that your monthly payments remain within your budget, you wanted to reduce your monthly mortgage costs. {{custom_reason}}.",
  product_switch:
    "Your existing mortgage rate is due to expire and to avoid being moved onto the lender's standard variable rate, I have recommended this product switch. {{custom_reason}}.",
  remortgage_better_rate:
    "Your existing mortgage rate is due to expire and following a whole of market review I have identified a more competitive rate with {{lenderName}}. {{custom_reason}}.",
  flexibility_review:
    "I have recommended a {{term}} year Fixed Rate because you wanted the flexibility to review your mortgage at the end of the term, at which point you feel that interest rates may have changed. {{custom_reason}}.",
}
```

### 8.4 Fee Added Section

```
You have agreed and given permission for fees of £{{arrangementFeeAmount}} to be added to the 
loan to cover the lender's arrangement fee. Interest of £{{interestChargedOnFee}} will be 
charged on this amount over the whole term of the mortgage.
```

### 8.5 ERC Section

```
Early redemption penalties apply to the mortgage I have recommended. This means if you repay 
the mortgage within the initial rate period you will have to repay the amount outstanding, and 
an additional amount based on a percentage of your mortgage balance. The exact charge will 
depend on the date at which you make the repayment. Full details are included in your mortgage 
illustration dated {{illustrationDate}}.
```

### 8.6 Portability Section

```
This mortgage is portable, meaning you have the right to transfer this product to a new mortgage 
on another property, subject to meeting the lender's criteria at that time.
```

### 8.7 Overpayments Section

```
This mortgage allows overpayments of up to {{overpaymentPercent}}% of the outstanding balance 
per year without incurring early repayment charges. Overpayments in excess of this may attract 
early repayment charges on the excess amount.
```

### 8.8 Closing Paragraphs

```
My recommendation is in keeping with your mortgage objectives, based on your current income and 
expenditure the repayments are affordable, and my research indicates you will meet the lender's 
lending criteria. Based on current interest rates the loan will continue to be affordable at the 
end of the {{rateType}} rate period.

There will be other costs and charges associated with arranging your new mortgage. These have 
been detailed in the documentation presented to you.

I have provided you with a Mortgage Illustration dated {{illustrationDate}}.

Should you require further information please do not hesitate to contact me.

Yours sincerely,

Helen Kelly
Mortgage & Protection Adviser
```

### 8.9 Input Hash

```typescript
import crypto from 'crypto'
export function computeInputHash(snapshot: IllustrationSnapshot): string {
  const fields = [
    snapshot.loanAmount, snapshot.termYears, snapshot.initialRatePercent,
    snapshot.initialRateEndDate, snapshot.reversionRatePercent,
    snapshot.monthlyPaymentInitial, snapshot.monthlyPaymentReversion,
    snapshot.aprcPercent, snapshot.totalAmountRepayable,
    snapshot.arrangementFeeAmount, snapshot.arrangementFeeAddedToLoan
  ]
  return crypto.createHash('sha256').update(JSON.stringify(fields)).digest('hex')
}
```

---

## 9. ASF GENERATOR

### 9.1 Field Map

| ASF Field | Source |
|---|---|
| Client name | `case.clientName` |
| Adviser name | Static: "Helen Kelly" |
| Vulnerable client | `asfDraft.vulnerableClient` (manual toggle) |
| Date | Today |
| Source of business | `asfDraft.sourceOfBusiness` (dropdown) |
| Lender | `illustration.lenderName` |
| Product type | Derived: "Fixed Rate" if `initialRateEndDate` present |
| Purpose of loan | `asfDraft.purposeOfLoan` (dropdown, from case type) |
| Type of borrower | `asfDraft.borrowerType` (manual dropdown) |
| Repayment method | `illustration.repaymentMethod` |
| Application date | `case.applicationSubmittedAt` |
| Account number | `asfDraft.accountNumber` (manual — post-application) |
| Loan amount | `illustration.loanAmount` |
| Mortgage term | `illustration.termYears` |
| Property value | `illustration.propertyValue` |
| Monthly repayment | `illustration.monthlyPaymentInitial` |
| Interest rate | `illustration.initialRatePercent` |
| Feature expires | `illustration.initialRateEndDate` |
| Proc fee | `illustration.procFeeAmount` |
| Fee requested | `commission.feeWaived ? "No" : "Yes"` |
| Client fee | `illustration.brokerFeeAmount` |
| Commission split (Helen) | `commission.helenSplitPercent` |
| Commission split (Eileen) | `commission.eileenSplitPercent` |

### 9.2 Commission Logic

```typescript
export function calculateCommission(sharedCase: boolean, override?: CommissionOverride) {
  if (override) return { helen: override.helenPercent, eileen: override.eileenPercent, rule: 'ManualOverride' }
  if (sharedCase) return { helen: 70, eileen: 30, rule: 'Shared7030' }
  return { helen: 100, eileen: 0, rule: 'DefaultHelen100' }
}
```

---

## 10. API ROUTES

```
GET    /api/cases                           → List active cases with priority scores
POST   /api/cases                           → Create case
GET    /api/cases/[id]                      → Full case with all relations
PATCH  /api/cases/[id]                      → Update case fields
DELETE /api/cases/[id]                      → Soft delete (status = Closed)
POST   /api/cases/[id]/stage                → Stage transition { action: string }

POST   /api/documents                       → Upload PDF { caseId, documentType, variant }
GET    /api/documents/[id]                  → Document + extracted fields

POST   /api/illustrations/[id]/confirm      → Confirm all fields
PATCH  /api/illustrations/[id]/field        → Override single field { fieldKey, newValue, reason }

POST   /api/offer/[caseId]                  → Upload + extract + compare offer
POST   /api/offer/[caseId]/acknowledge      → Acknowledge mismatch

POST   /api/suitability/[caseId]            → Generate SL draft
POST   /api/suitability/[caseId]/approve    → Approve SL
GET    /api/suitability/[caseId]/download   → Download .docx

POST   /api/asf/[caseId]                    → Generate ASF draft
POST   /api/asf/[caseId]/approve            → Approve ASF
GET    /api/asf/[caseId]/download           → Download .docx

GET    /api/audit/[caseId]                  → Full audit log
```

---

## 11. DASHBOARD

### Priority Sort
Sort all active cases by `calculatePriorityScore(stageDueAt)` ascending. Negative (overdue) cases sort first.

### Heatmap Left Border Strip

Each row in `CaseRow.tsx` has a `border-l-4` strip:

```typescript
export function getHeatmapBorder(stageDueAt: Date, status: CaseStatus): string {
  if (status === 'Closed' || status === 'Completed') return 'border-l-4 border-[#A0AEC0]'
  const score = calculatePriorityScore(stageDueAt)
  if (score < 0)  return 'border-l-4 border-[#E53E3E]'  // overdue — red
  if (score <= 1) return 'border-l-4 border-[#DD6B20]'  // due today/tomorrow — amber
  return 'border-l-4 border-[#38A169]'                   // on track — green
}
```

Row backgrounds: `bg-red-50` for overdue, `bg-orange-50` for due soon, `bg-[#FAFAF8]` neutral.

### Due Date Tooltip

On hover over the Due Date cell, `DueDateTooltip.tsx` renders contextual text:
- "Overdue by 2 days — Research SLA missed"
- "Due today — DIP must be completed"
- "3 days remaining — Application submission"

### Primary Action Button

```typescript
export function getPrimaryAction(stage: Stage): PrimaryAction {
  switch(stage) {
    case 'Research':     return { label: 'Complete Research', action: 'research_complete' }
    case 'ChaseClient':  return { label: 'Chase Client',      action: 'open_chase_modal' }
    case 'DIP':          return { label: 'Complete DIP',      action: 'dip_complete' }
    case 'PostDIPChase': return { label: 'Chase Client',      action: 'open_chase_modal' }
    case 'AwaitingNB':   return { label: 'Submit to NB',      action: 'nb_submitted' }
    case 'NBSubmitted':  return { label: 'View Case',         action: 'open_case' }
    default:             return { label: 'View Case',         action: 'open_case' }
  }
}
```

---

## 12. CASE VIEW

### Layout

The case view uses a two-column grid:
- **Left (main):** vertical stack of collapsible panels
- **Right (sticky):** `CaseProgressStepper` — `position: sticky; top: 1.5rem`

### Sticky Progress Stepper

`CaseProgressStepper.tsx` shows the full case journey with per-step state:

| State | Visual |
|---|---|
| Completed | ✅ Green check, muted label, clickable (scrolls to panel) |
| Active | 🔵 Blue filled circle, bold label |
| Locked | 🔒 Padlock icon, muted label, hover tooltip explains prerequisite |
| Future | ○ Empty circle, muted label |

Steps shown: Research → Chase Client → DIP → Awaiting NB → Submitted

Clicking a completed or active step calls `document.getElementById(panelId).scrollIntoView({ behavior: 'smooth' })`.

Locked step tooltips:
- Suitability: "Confirm Illustration data to unlock"
- ASF: "Confirm Illustration data to unlock"
- Submit NB: "Set Application Submitted date first"

### Panel Visibility & Defaults

All panels are **always present in the DOM**. Locked panels show `LockedPanelState` instead of their content.

| Panel | Default state | Locked when |
|---|---|---|
| Stage Header | Expanded, sticky | Never |
| Timer Panel | Expanded | Never |
| Illustration Panel | Expanded | Never |
| Fee Comparison Panel | Hidden until fee detected | No fee-added illustration |
| Offer Panel | Collapsed | Never |
| Suitability Panel | Collapsed | Illustration not confirmed |
| ASF Panel | Collapsed | Illustration not confirmed |
| Audit Summary | Collapsed | Never |

### Locked Panel State

```tsx
// LockedPanelState.tsx
// Background: bg-[#F5F0E8], border: border-[#E2E8F0], no action buttons
<div className="bg-[#F5F0E8] border border-[#E2E8F0] rounded-lg p-6 text-center">
  <span className="text-2xl">🔒</span>
  <p className="mt-2 text-[#A0AEC0] font-medium">{message}</p>
</div>
```

### Active Panel Highlight

The panel the user is currently interacting with receives:
- `border-l-4 border-[#4A90D9]` (left accent)
- `bg-white` background (vs `bg-[#FAFAF8]` surrounding)

Track via React context `ActivePanelContext` — set on any user interaction within a panel.
No opacity changes on other panels.

### Stale Suitability Banner

When `suitabilityDraft.staleDueToInputChange = true`, show inside the Suitability panel:

```tsx
// Full-width banner, background #F5F0E8, border 1px #DD6B20
// "⚠️ Illustration data has changed since this letter was generated.
//  Regenerate before exporting."
// Button: "Regenerate Now" (primary action)
// Export button disabled while stale
```

### Suitability Gate Logic

```typescript
export function isSuitabilityEnabled(illustrations: IllustrationSnapshot[]): boolean {
  const primary = illustrations.find(i => i.variant === 'None' || i.variant === 'FeeAdded')
  if (!primary?.confirmed) return false
  if (primary.arrangementFeeAddedToLoan) {
    const feeUpfront = illustrations.find(i => i.variant === 'FeeUpfront')
    return !!feeUpfront?.confirmed
  }
  return true
}
```

---

## 13. INLINE OVERRIDE FIELDS

**All field-level edits use `InlineOverrideField.tsx` — not a modal.**

Stage transition confirmations (e.g. "Complete DIP?") still use `ConfirmModal.tsx`.

### Behaviour

1. User edits a confirmed field → input border turns amber `border-[#DD6B20]`
2. A `<textarea>` appears directly beneath: `placeholder="Reason for change..."`
3. Save fires **on blur from the reason textarea** (no separate Save button)
4. Audit log entry written immediately on save
5. Brief success pulse (§15) on the field row, then returns to normal state

```tsx
// InlineOverrideField.tsx
// States:
//   idle     → normal confirmed display (value + confirm badge)
//   editing  → amber-bordered input + reason textarea below
//   saving   → spinner
//   saved    → green success pulse, back to idle

// Validation:
//   Cannot blur reason textarea while empty — shows inline "Please enter a reason"
//   Cannot save without reason
```

Applies to: all confirmed illustration fields, timer/due date fields, submission dates, commission splits.

---

## 14. SPLIT-PANE PDF VERIFICATION

### Layout

When "Verify Fields" is clicked on an uploaded illustration:

```
┌──────────────────────────┬──────────────────────────┐
│  PDF Viewer (left 50%)   │  Field Confirmation       │
│  @react-pdf-viewer/core  │  (right 50%)              │
│                          │                           │
│  [Page nav controls]     │  Field | Value | Confirm  │
│                          │  ...                      │
└──────────────────────────┴──────────────────────────┘
```

### Page-Level Navigation

Each `ExtractedField` has `sourcePage`. When the user clicks/focuses a field in the right pane, the PDF viewer jumps to that page.

```typescript
// IllustrationVerifyPane.tsx
const [activePage, setActivePage] = useState(1)

const handleFieldFocus = (field: ExtractedField) => {
  if (field.sourcePage) setActivePage(field.sourcePage)
}
// Pass activePage to react-pdf-viewer's initialPage / pageIndex prop
```

This gives page-level navigation (e.g. "Total Amount Repayable" → jumps to page 2 where Section 3 lives). Pixel-level highlighting is out of scope.

### Setup

```bash
npm install @react-pdf-viewer/core @react-pdf-viewer/default-layout pdfjs-dist
```

```js
// next.config.js
webpack: (config) => {
  config.resolve.alias.canvas = false
  return config
}
```

PDF files are fetched via Supabase signed URLs and passed to the viewer's `fileUrl` prop.

---

## 15. UI PATTERNS

### Numeric Inputs

All monetary and percentage inputs:
```tsx
<input
  type="text"
  inputMode="decimal"
  className="font-tabular"
  onBlur={formatWithCommas}    // 148000 → 148,000
  onFocus={stripFormatting}    // 148,000 → 148000 for clean editing
/>
```

### Success Pulse Animation

```css
/* globals.css */
@keyframes successPulse {
  0%   { background-color: #C6F6D5; }
  100% { background-color: transparent; }
}
.success-pulse {
  animation: successPulse 600ms ease-out forwards;
}
```

Apply to a field row when confirmed or after an override save. One-shot, no repeat.

### Modals (Stage Transitions Only)

```tsx
<div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center">
  <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-lg p-6 max-w-md w-full">
    {/* content */}
  </div>
</div>
```

### Borders vs Shadows

- Panels, cards, table rows: `border border-[#E2E8F0] rounded-lg` — no shadows
- Modals only: `shadow-lg`
- Never `shadow-md` or `shadow-xl` on standard UI elements

### CollapsiblePanel

```tsx
// Smooth height transition: transition-all duration-200
// Header always shows: panel name + status badge + chevron (rotates on open/close)
// Default: collapsed except the active stage panel
```

---

## 16. SECURITY

- All routes protected by NextAuth session middleware
- PDF files via Supabase signed URLs only — never direct public bucket URLs
- All storage operations through API routes (service key never client-side)
- `AuditLogEvent`: Prisma middleware blocks any DELETE or UPDATE at the ORM layer
- `NEXTAUTH_SECRET` minimum 32 chars

---

## 17. NON-FUNCTIONAL REQUIREMENTS

- Dashboard load < 2 seconds (≤ 50 cases)
- PDF regex extraction < 5 seconds; vision fallback < 15 seconds
- Priority score recalculates on every dashboard load (not cached)
- Generated `.docx` written to `/tmp`, streamed to client, deleted immediately
- No persistent server-side storage of generated documents

---

## 18. DELIVERY SLICES

### Slice 1 — Foundation + Auth + Dashboard + Case View Scaffold
Next.js 14 scaffold, Supabase setup, NextAuth credentials login, Prisma schema + migrations, Inter font, global CSS (tabular figures, success pulse, font hierarchy), Case CRUD API, stage engine, priority engine, dashboard (heatmap borders, due date tooltips, action buttons), case view scaffold (sticky stepper, collapsible panels, locked states, active panel highlight), ConfirmModal with backdrop-blur, create case modal.

### Slice 2 — PDF Upload + Illustration Extraction
Supabase Storage integration, document upload API, hybrid extraction (regex + vision), ExtractedField persistence with sourcePage, IllustrationSnapshot creation, split-pane verification UI with page-jump navigation, InlineOverrideField component, success pulse animations, audit logging.

### Slice 3 — Dual Illustration Fee Logic
Multi-variant illustration support, fee detection, fee disclosure calculation, fee comparison panel, suitability gate update.

### Slice 4 — Suitability Letter Generator
Suitability form, justification presets, .docx generation with all conditional sections, input hash + stale detection, stale banner (warm accent, non-alarming), approval gate, download endpoint.

### Slice 5 — ASF Generator
ASF form, commission logic (100% default, 70/30 shared, manual override with audit), .docx generation, approval gate, download.

### Slice 6 — Offer Upload + Comparison
Offer upload, extraction, mismatch comparison, mismatch display, non-blocking acknowledgment + audit.

### Slice 7 — Audit & Compliance Hardening
Audit panel, Prisma middleware blocking AuditLogEvent deletes, NB late flag, submission date protection, error states (parse failure, partial extraction), end-to-end gate verification.

---

## 19. TESTING REQUIREMENTS

**Slice 1:** Priority sort correct. Heatmap borders correct. Stepper shows right state per stage. Locked panels show instruction text. Active panel highlight applies. Stage transitions logged.

**Slice 2:** Santander illustration — all fields extracted via regex. Nationwide fee-added — detected correctly. Split-pane: clicking "Total Amount Repayable" jumps to page 2. InlineOverrideField: cannot save without reason. Override logged to audit.

**Slice 3:** Fee detection triggers dual upload. Interest = £316,933.06 − £316,156.60 = £776.46. Suitability locked until both confirmed.

**Slice 4:** SL disabled until illustration confirmed. Fee section conditional. Stale banner on field change. Export blocked while stale. Download produces valid .docx.

**Slice 5:** Default = 100% Helen. sharedCase = true → 70/30. Commission override logged.

**Slice 6:** Mismatch flagged. Does NOT block stage progression. Acknowledgment logged.

**Slice 7:** No AuditLog deletes possible. All overrides have reasons stored. Late NB flagged. All gates verified end-to-end.
