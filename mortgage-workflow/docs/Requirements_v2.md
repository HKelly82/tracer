# Mortgage Adviser Workflow Tool — Requirements Document v2.0

**Date:** 20 February 2026
**Prepared for:** Helen Kelly, Hanson Mortgage Brokers (trading as Police Federation Mortgages)

---

## 1. Purpose & Scope

This document defines the complete requirements for a mortgage adviser workflow automation tool. It replaces Helen's current pipeline spreadsheet and manual document preparation process with a unified case management system.

**Single user:** Helen Kelly only. No roles, permissions, or multi-user features required.

**Core principle:** Never re-key data that exists somewhere else. Data flows from its source (Eileen's email, illustration PDF, Intelligent Office) into the tool.

**Relationship with IO:** The tool works alongside Intelligent Office. IO holds factfind data, client details, and addresses. For now, manual input is used but structured to map to IO fields for future API integration.

---

## 2. The Advice Flow

### 2.1 Lead Arrival

Two paths:

**Path A — Eileen-sourced (70/30 commission split)**
Eileen speaks to the client, sends a summary email (CC'd to Helen) with: client name(s), case type, property address, property value (Zoopla), current mortgage details (if remortgage), employment/salary, deposit info (if FTB/purchase), preferred rate type, debts, special circumstances, fee arrangement. Eileen sets up IO and PFP.

**Path B — Direct to Helen (100/0 commission split)**
Typically a returning client already on IO. Helen updates their factfind directly.

**At lead creation, the tool captures:** Client name(s), case type, lead source (Eileen/direct), free-text summary of client needs (from Eileen's email or Helen's notes), fee arrangement.

### 2.2 Admin Setup (Parallel — Eileen-driven)

Eileen handles: sending Client Agreement + Authority to Proceed, IO setup, PFP setup, CVI links, Comentis links, gathering documents (ID, payslips, bank statements, etc.).

The tool tracks completion status of each item but does not manage IO/PFP directly.

### 2.3 Initial Research

Helen uses Sourcing Brain for initial options. Uses the tool's email agent (§10) to draft an options email. This is not a firm recommendation — it narrows preferences.

### 2.4 Client Response & Document Gathering

Client responds with preferences. Documents arrive in parallel. Helen does not wait for all documents to start research, but all required documents must be in hand before DIP.

### 2.5 Full Research & Recommendation

Re-run Sourcing Brain with firm criteria. Check Affordability Brain. If complex: Criteria Brain + individual lender calculators. Generate illustration(s). Email agent drafts recommendation email with illustrations + calendar link.

### 2.6 Client Confirmation

Client agrees (usually email, sometimes phone, sometimes back-and-forth).

### 2.7 DIP Readiness Check

Before running a DIP, Helen must have:

- Signed Client Agreement
- Signed Authority to Proceed
- CVI completed (per person)
- Comentis completed (per person)
- Illustration confirmed in the tool
- Research saved
- Payslips — 3 months, current (per person)
- Bank statements — 3 months, current (per person)
- SA302/tax returns (self-employed only)
- Proof of deposit (FTB/purchase only)

The tool surfaces a DIP readiness checklist showing complete vs outstanding items.

### 2.8 Application Submission

Helen submits on lender portal. Tool records application date.

### 2.9 Suitability Letter & ASF Generation

Generated **after** application submission (confirmed details now known). See §7 and §8.

### 2.10 NB Submission

Helen emails the submission pack to New Business: SL, ASF, illustration, all client documents. NB is compliance-only — they don't submit to the lender. NB sends the SL to the client.

### 2.11 Lender Processing

Valuation (lender-handled), underwriting, possible queries. Most cases sail through. Some require extra documents or answers to underwriter questions. Tool tracks chase activity and outstanding queries.

### 2.12 Offer Received

Lender sends offer to Helen, client, and solicitor. Helen checks and sends confirmation email to client.

### 2.13 Completion Monitoring

Remortgages: Helen knows when previous deal ends. Checks in by email the month before.
Purchases: Asks for estimated completion date, checks in that month.
Lenders often send completion notifications by email.

### 2.14 Post-Completion

Mark complete. Email NB. NB updates IO, requests commission, Eileen sends fee invoice. Helen reconciles commission against monthly network pay statement.

---

## 3. Dashboard — Kanban Board

### 3.1 Primary View

Kanban board with stage columns representing the case lifecycle.

### 3.2 Stage Columns

| Column | Description |
|--------|-------------|
| Lead | New leads not yet actioned |
| Research | Initial or full research in progress |
| Client Response | Waiting for client reply (to options or recommendation) |
| DIP / Application | DIP readiness check, application prep and submission |
| NB Submission | Generating SL/ASF, gathering docs, submitting to NB |
| Lender Processing | Awaiting valuation, underwriting, offer |
| Offered | Offer received, awaiting completion |
| Completed | Case complete, awaiting/tracking commission |
| Closed | Lead did not proceed / case abandoned |

### 3.3 Two Visual Zones

**Active zone** (top or prominent): cases where "waiting on" = 🟢 ME, or anything overdue.

**Monitoring zone** (below or secondary): cases where "waiting on" = 🟡 CLIENT / 🔵 LENDER / ⚪ PASSIVE.

### 3.4 Case Card

Each card shows:

- **"Waiting on" indicator** (most prominent): 🟢 ME / 🟡 CLIENT / 🔵 LENDER / ⚪ PASSIVE
- Client name(s)
- Case type (Remortgage, FTB, Purchase, Product Switch, BTL, Other)
- Next task text
- Time in current stage
- Overdue indicator

### 3.5 Free Text Notes

Every case supports free-text notes at any time. Most recent note visible on the card. Full history in case detail view.

---

## 4. Task System

### 4.1 Waterfall Dependencies

Completing a task auto-creates the next with an SLA-based due date. Some chain immediately, others wait for external triggers.

### 4.2 Manual Override Always

Helen can skip tasks, reorder, add custom tasks, change the path. The tool informs and suggests — it never blocks progress.

### 4.3 Task Properties

- Title
- Due date (SLA-calculated or manual)
- Status: pending / in progress / complete / skipped
- Waiting on: ME / CLIENT / LENDER / PASSIVE
- Notes (free text)
- Completion date

### 4.4 Default Tasks by Stage

**Lead:**

- Contact client / acknowledge lead
- Send Client Agreement + Authority to Proceed (new client)
- Set up on IO (new client)
- Send PFP invite
- Send CVI + Comentis links

**Research:**

- Complete initial research (Sourcing Brain)
- Send initial options email
- Chase client response (configurable timer)

**Client Response:**

- Client confirms preferences
- Gather outstanding documents
- Complete full factfind

**DIP / Application:**

- DIP readiness check (see §2.7)
- Submit application on lender portal
- Record application date

**NB Submission:**

- Upload/confirm illustration
- Generate Suitability Letter
- Generate ASF
- Verify all NB docs on file
- Submit pack to NB
- Record NB submission date

**Lender Processing:**

- Monitor lender progress
- Respond to underwriter queries (as they arise)
- Chase lender (configurable timer per case)

**Offered:**

- Check offer against illustration
- Send offer confirmation email
- Monitor for completion (monthly check-in)

**Completed:**

- Mark complete
- Email NB to confirm
- Track commission received
- Track fee invoice sent

---

## 5. Document Checklist

### 5.1 Purpose

Tracks whether required documents exist (in shared drive / IO). Does not store most documents. Exceptions: illustration and offer PDFs are uploaded for data extraction.

### 5.2 Checklist Items

| Document | Required For | Per Person? | When Needed | Notes |
|----------|-------------|-------------|-------------|-------|
| Client Agreement (signed) | All | No | Before DIP | Eileen sends, client returns |
| Authority to Proceed (signed) | All | No | Before DIP | Varies with fee arrangement |
| CVI (electronic ID) | All | Yes | Before DIP | Eileen does once ID docs received |
| CVI Alert — Dilisense check | If CVI alert | Yes | Before DIP | Only if CVI flagged |
| Comentis assessment | All | Yes | Before DIP | Client completes via IO link |
| Factfind (final) | All | No | Before recommendation | On IO |
| ID document | All | Yes | Before CVI | Passport or driving licence |
| Proof of address | All | Yes | Before DIP | Utility bill |
| Payslips (3 months) | All | Yes | Before DIP | Track which months + freshness |
| Bank statements (3 months) | All | Yes | Before DIP | Track which months + freshness |
| P60 | Some cases | Yes | When required | Not always needed |
| SA302 / tax returns | Self-employed | Yes | Before DIP | Last 2 years |
| Credit report | If adverse credit | Yes | Before research | Client provides |
| Proof of deposit | FTB / purchase | Yes | Before application | Source documented |
| Research (Sourcing Brain) | All | No | Before DIP | Helen saves to folder |
| Illustration (confirmed) | All | No | Before NB submission | Uploaded + extracted in tool |
| Fee upfront illustration | If fee added | No | Before SL generation | For fee comparison |
| Suitability Letter | All | No | Before NB submission | Generated by tool |
| ASF | All | No | Before NB submission | Generated by tool |

### 5.3 Payslip & Bank Statement Freshness

The lender requires the last 3 months at the point of underwriting. If the earliest document would be >3 months old at the expected application date, flag for renewal.

The tool tracks: which months each document covers, and for which person.

### 5.4 Joint Applicants

The checklist tracks per person. Each applicant needs: CVI, Comentis, ID, proof of address, payslips, bank statements, employment evidence.

---

## 6. Illustration Handling

### 6.1 Upload & Extraction

Helen uploads illustration PDFs. The tool extracts fields using the existing hybrid regex + Claude vision engine.

### 6.2 Extracted Fields

Lender name, product description/code, loan amount (with fee detection), term, property value, initial rate %, initial rate end date, reversion rate %, monthly payment (initial), monthly payment (reversion), APRC %, total amount repayable, arrangement fee amount, fee added to loan flag, broker fee, proc fee, cashback, ERC summary, portability, overpayment %.

### 6.3 Verification UX (Redesigned)

Split-pane PDF viewer retained. Key changes:

- **Formatted values:** `£188,599.00` not `188599`. `4.08%` not `4.08`. `30 years` not `30`.
- **✓ Accept** — one click, no reason required
- **✎ Edit** — inline edit, reason required to save
- **"Accept All"** — one click, confirms all fields immediately. No requirement to individually confirm each field first.

### 6.4 Fee Detection & Second Illustration

If fee added to loan → second illustration required (fee upfront version). Applies to all mortgage types including product switches.

For product switches: the lender sends an offer (not illustration) as the primary document, but a fee-upfront illustration is still needed for the comparison.

Labels: "Illustration A — Fee Added" / "Illustration B — Fee Upfront".

### 6.5 Fee Comparison Calculation

Once both confirmed:

- Total repayable (fee added)
- Total repayable (fee upfront)
- Interest charged on fee = difference

Displayed to Helen. Auto-inserted into SL fee section.

### 6.6 Simple Fee Input

For cases where the fee section is needed but a full second illustration isn't yet available, provide a simple field to enter total amount repayable directly. Triggered by the uploaded illustration having a fee.

---

## 7. Suitability Letter Generation

### 7.1 Approach: Template Fill

Uses Helen's actual .docx template (SL - Mortgage Template v1.1.docx). Black text = sacred boilerplate. Red text / bracketed placeholders = variable fields. Entire red paragraphs = optional sections toggled on/off.

### 7.2 Variable Fields

| Placeholder | Source |
|-------------|--------|
| Client name | Case |
| Address | Manual input (IO integration later) |
| Date of issue | Today |
| Dear [name] | Client first name |
| Rate term (e.g. "2 year") | Derived from illustration |
| Rate type (e.g. "fixed rate") | Derived from product description |
| Lender name | Illustration |
| Repayment basis | Illustration ("capital repayment" not "repayment") |
| Mortgage term + "years" | Illustration |
| Initial rate % | Illustration |
| Rate end date | Illustration |
| Monthly payment (initial) | Illustration |
| Monthly payment (reversion) | Illustration |
| Reversion rate % | Illustration |
| Illustration date | Upload/generation date |
| Arrangement fee amount | Illustration |
| Interest charged on fee | Fee comparison calculation |
| Overpayment % | Illustration |
| Client objectives | Manual: free text |
| Justification | Manual: preset or free text |
| Affordability summary | Manual: from factfind (IO integration later) |

### 7.3 Optional Sections

| Section | When to Include |
|---------|----------------|
| Fee added to loan | Fee added to loan |
| Cheapest not recommended | Recommending non-cheapest product |
| Debt consolidation | Consolidating debts |
| Additional borrowing | Extra borrowing included |
| Mortgage into retirement | Term extends past retirement |
| Interest only | Interest-only recommendation |
| Portability | Product is portable |
| Overpayments | Overpayment allowance exists |

### 7.4 Generation Flow

1. Helen fills manual fields (objectives, justification, affordability)
2. Toggles optional sections on/off
3. Tool generates .docx
4. **Download immediately** — no approval gate
5. Helen reviews in Word, edits if needed
6. Marks SL as "complete" in the tool (simple checkbox)

### 7.5 ERC Section

Always included. References the illustration date. Does NOT insert specific ERC percentages — directs client to the illustration for full details.

---

## 8. ASF Generation

### 8.1 Approach: Template Fill

Same as SL — fill Helen's actual .docx template.

### 8.2 Fields

| Field | Source | Notes |
|-------|--------|-------|
| Client name | Case | |
| Adviser name | Static: "Helen Kelly" | |
| Vulnerable client | Manual: Yes/No | |
| Vulnerability comments | Manual free text | Only if Yes |
| Date | Today | |
| Current address | Manual (IO later) | |
| Mortgage property address | Manual (IO later) | |
| Source of business | Dropdown: Existing Client / New Enquiry / Referral / Other | |
| Lender | Illustration | |
| Product type | Derived: "Fixed Rate" etc. | |
| Purpose of loan | Dropdown: Purchase / Remortgage / Product Switch / Further Advance | |
| Type of borrower | Dropdown: FTB / Homeowner / BTL / Other. **Default: Homeowner** | Not "Sole" |
| Repayment method | Illustration. **Label: "Capital Repayment"** | Not "Repayment" |
| I/O Vehicle | Manual. Default: "n/a" | For interest-only cases |
| Application date | Case | |
| Account number | Manual (post-application) | |
| Loan amount | Illustration | |
| Mortgage term | Illustration | |
| Property value | Illustration | **Must actually populate** (currently shows £0.00) |
| Monthly repayment | Illustration | |
| Rate type | Derived | |
| Interest rate | Illustration | |
| Feature expires | Illustration: initial rate end date | |
| Proc fee | Illustration | |
| Fee already requested? | Manual: Yes/No | |
| Client fee | Illustration: broker fee | |
| Request fee from Solicitor? | Manual: Yes/No | |
| Request fee from Client? | Manual: Yes/No | |
| Porting loan amount | Manual (if applicable) | |
| Commission split — Helen % | Calculated (see §8.3) | |
| Commission split — Eileen % | Calculated (see §8.3) | |

### 8.3 Commission Logic

| Condition | Helen | Eileen | Rule |
|-----------|-------|--------|------|
| Eileen-sourced lead | 70% | 30% | Default for Eileen leads |
| Direct to Helen | 100% | 0% | Default for direct leads |
| Manual override | Custom | Custom | Requires reason, audited |

The default is determined by lead source, not a global setting.

### 8.4 Generation Flow

Same as SL: fill → download immediately → review in Word → mark complete.

---

## 9. Offer Handling

### 9.1 Upload & Extraction

When the mortgage offer PDF arrives, Helen uploads it. The tool extracts key fields using the same extraction engine.

### 9.2 Comparison

The tool compares offer values against the confirmed illustration:

- Rate: flag if difference > 0.001%
- Loan amount: flag if difference > £0.01 (account for fee-added variant)
- Term: exact match
- Repayment method: exact match

### 9.3 Display

- **Match:** Green confirmation with key matched figures
- **Mismatch:** Amber warning with comparison table (illustration vs offer)

### 9.4 Non-Blocking

Offer upload is optional. Mismatches do not block any stage progression. Helen acknowledges any mismatches (recorded in audit log).

---

## 10. Email Agent

### 10.1 Purpose

Replaces Helen's current ChatGPT agent for drafting client emails. Built into the tool so it can pull case data automatically.

### 10.2 Template Emails (Presets)

**Initial Options Email:**

- Pulls: client name, case type, property details, current mortgage info
- Helen provides: product options from Sourcing Brain, any caveats
- Template includes: caveat that this is not a firm recommendation, invitation to discuss

**Recommendation Email:**

- Pulls: client name, lender, product details, rate, term, monthly payments from illustration
- Helen provides: additional context, justification notes
- Template includes: illustration attachment reference, calendar link, next steps, case-type-specific content (FTB process info, purchase cost breakdowns, stamp duty estimates)

### 10.3 General Drafting

Beyond presets, the agent can draft any client email with full case context. Drafts in Helen's professional tone.

### 10.4 MVP Scope

Template emails (initial options + recommendation) are MVP. General drafting assistant is a fast follow.

---

## 11. Post-Completion & Commission

### 11.1 Commission Tracking

Each case records expected commission (proc fee from illustration). After completion, Helen marks commission as received.

### 11.2 Reconciliation

Shows: expected commission, received status, any discrepancy with notes.

### 11.3 Fee Invoice

Eileen creates the invoice. Tool tracks whether sent (checkbox).

---

## 12. Audit & Compliance

### 12.1 What's Logged

Stage changes, field confirmations, field overrides (with reason), document generation, commission overrides (with reason), offer acknowledgements, date changes.

### 12.2 Visibility

Accessible via expandable panel in case view. Collapsed by default. Field-level confirmations NOT shown on main view. Filterable by event type.

### 12.3 Immutable

Entries cannot be deleted or modified.

---

## 13. What to Keep from Current Implementation

- PDF extraction engine (regex + vision fallback)
- Illustration data model (ESIS fields)
- Fee comparison calculation
- Audit logging infrastructure
- Split-pane PDF viewer
- Stage timer / SLA concepts (apply at task level)
- Prisma schema foundations (extend, don't replace)

---

## 14. What Must Change

| Current | Required |
|---------|----------|
| Table dashboard | Kanban board |
| No "waiting on" indicator | Most prominent card info |
| No task system | Waterfall tasks with SLAs |
| No lead stage | Lead as first stage |
| All panels visible regardless of stage | Stage-relevant content only |
| Unformatted values (188599) | Formatted (£188,599.00) |
| Must individually confirm before Accept All | Accept All works immediately |
| SL generated from scratch | Template-fill from actual .docx |
| ASF missing fields | All physical template fields |
| Property value £0.00 | Populate from illustration |
| "Repayment" | "Capital Repayment" |
| "Sole" default | "Homeowner" default |
| Commission 100/0 default | Based on lead source (70/30 or 100/0) |
| Approve before download | Download immediately |
| No document checklist | Full per-person checklist with freshness |
| No free text notes | Notes on every case |
| Audit log dominates | Collapsed, filterable |
| SL affordability "?????" | Manual input field |
| No email drafting | Email agent with presets |
| Rigid stage model | Flexible — skip, reorder, override |

---

## 15. Data Model Changes Summary

Key additions to existing schema:

- **Case:** lead source, waiting-on indicator, expected completion date
- **Task (new):** per-case tasks with title, due date, status, waiting-on, notes, dependencies
- **Note (new):** free text notes per case, timestamped
- **Person (new):** joint applicants — name, role, linked to document checklist
- **DocumentChecklist (new):** per-case, per-person document tracking with month coverage
- **Commission:** default based on lead source
- **ASFDraft:** add addresses, vulnerability comments, I/O vehicle, porting amount, fee request fields
- **SuitabilityDraft:** remove approval gate, add "complete" checkbox

---

## 16. Implementation Priority

### Phase 1 — Core Workflow (MVP)

1. Kanban dashboard with waiting-on indicators
2. Task system with waterfall dependencies
3. Document checklist (per-person, freshness tracking)
4. Redesigned illustration verification UX
5. Template-fill SL generation (from Helen's actual template)
6. Template-fill ASF generation (all fields)
7. Commission logic fix (lead-source default)
8. Free text notes on cases
9. DIP readiness checklist

### Phase 2 — Communication & Monitoring

10. Email agent — template emails
11. Lender chase tracking
12. Offer upload + comparison
13. Completion monitoring
14. Commission reconciliation

### Phase 3 — Integration & Enhancement

15. Email agent — general drafting
16. IO integration
17. PFP awareness (future)

---

## 17. Eileen's Email — Reference Data

### 17.1 Structure

1. Greeting
2. **Client summary** (variable, 3–15 lines free text)
3. "About us" boilerplate
4. Fees (£200 advice + £150 admin, often waived for police/existing)
5. Client Agreement + Authority to Proceed (new: attached; existing: on file)
6. Document requirements (new clients)
7. Sign-off: Eileen Kelly Certs CII

### 17.2 Data Available at Lead Creation

| Data | Consistency |
|------|-------------|
| Client name(s) | Always |
| Case type | Always (from context) |
| Property address | Almost always |
| Property value (Zoopla) | Almost always |
| Current lender + rate + expiry | Always (remortgage) |
| Current mortgage balance | Usually (approximate) |
| Deposit amount + source | Present (FTB/purchase) |
| Employment (employer, salary) | Always, sometimes approximate |
| Preferred rate type | Sometimes |
| Outstanding debts | When mentioned |
| Special circumstances | Varies |
| Fee arrangement | Always |
| Existing/new client | Always |
| Joint applicants | Clear when applicable |

Capture as free text — too variable to parse into structured fields.

---

## 18. Admin Checklist — Network Requirements

### Helen/Eileen's Responsibility (track in tool)

- Application Form (on lender portal)
- Illustration (uploaded + confirmed)
- Key Features (track exists)
- Research (Sourcing Brain saved)
- Client Agreement (signed)
- Authority to Proceed (signed)
- CVI Certificate (per person)
- CVI Result / Dilisense (if alert)
- Factfind (final on IO)
- Suitability Letter (generated)

### NB's Responsibility (do NOT track)

- iO Checks Completed
- Service Status / Details
- Campaign Description
- Service Case — Link Plans & Fees
- Make Fact Find Final
- Upload Folder to Service Case
- No Duplicate Plan Numbers
- SL Issued (NB sends)
- Submit to Provider
- Add Review Date
- Add New Address
- Factfind has Expenditure Breakdown
- Update Log
