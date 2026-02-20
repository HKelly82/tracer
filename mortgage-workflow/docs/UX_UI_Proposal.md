# UX/UI Proposal — Mortgage Adviser Workflow Tool v2.0

**Date:** 20 February 2026
**Status:** Proposal for review
**Accompanies:** Interactive Kanban prototype (`kanban-dashboard.jsx`)

---

## 1. Design Philosophy

Helen has ADHD. Every design decision filters through one question: **does this reduce cognitive load, or add to it?**

Three rules govern every screen:

1. **Stage-aware content.** The case view shows only what's relevant to the current stage. Lead stage hides illustration panels entirely. DIP stage surfaces the readiness checklist as the hero element. NB Submission stage foregrounds document generation. Nothing is "collapsed and available" if it's not relevant yet — it's absent from the DOM.

2. **The daily question.** Helen opens the tool and needs to know: "What do I do next?" The dashboard answers this with the "waiting on" system as the primary visual signal on every card, and active cases sorted above monitoring cases within each column.

3. **Suggest, never block.** The tool guides optimal sequencing (SL before ASF, illustration before SL) but never prevents Helen from acting out of order. Gates become warnings. Approval checkboxes become simple "mark complete" toggles. Download is one click, not gate → approve → download.

---

## 2. Design System

### 2.1 Changes from v1

The v1 colour palette is largely retained. The v1 design used an earthy warm cream (`#F5F0E8`) as a background accent — this continues for informational/read-only panels (fee comparison, locked states, client summary blocks).

**What changes:**

| Area | v1 | v2 | Rationale |
|------|----|----|-----------|
| Dashboard layout | Table sorted by priority score | Kanban board with stage columns | Matches Helen's mental model of the pipeline |
| Primary information | Heatmap border strip (days overdue) | "Waiting on" icon indicator | "Who am I waiting for?" is more actionable than "how overdue is this?" |
| Card interaction | Click row → case view | Drag card between columns OR click → case view | Drag = quick stage change; click = full detail |
| Monitoring zone | All cases equal visual weight | Monitoring cases dimmed to 68% opacity | Reduces visual noise for cases Helen can't action right now |
| Shadows | None on cards (borders only) | None on cards (borders only). Shadows on modals only. | Retained from v1 — correct decision |

### 2.2 Typography

**Font:** Inter via `next/font/google`. This is retained from v1 — the skill doc recommends against Inter, but for a financial services tool where numeric legibility and professional tone matter more than visual distinctiveness, Inter is the right choice. Its tabular figures are excellent.

**Hierarchy:**
- Page title: 16–18px, weight 800, letter-spacing -0.02em
- Column headers: 12px, weight 700
- Card client name: 12.5–13px, weight 700
- Card body text: 11.5–12px, weight 400/500
- Labels/meta: 10–11px, weight 500–600, uppercase where indicating status

**Tabular figures** (`font-variant-numeric: tabular-nums`) on all: monetary values, percentages, dates, day counts, commission splits.

### 2.3 Colour Application

| Token | Hex | Used for |
|-------|-----|----------|
| Surface | `#FAFAF8` | Page backgrounds, card backgrounds |
| Dashboard Neutral | `#EEF1F6` | Kanban board background (slightly cooler than v1's `#E8EDF5` to give cards more contrast) |
| Warm Cream | `#F5F0E8` | Client summary blocks, fee comparison panel, locked panel states |
| Primary | `#4A90D9` | Action buttons, active states, next-task text on cards, text links |
| Text | `#2D3748` | Headings, client names, primary body text |
| Text Muted | `#A0AEC0` | Timestamps, note previews, passive labels, empty states |
| Success | `#38A169` | Completed stage checks, confirmed fields, offer match banner |
| Warning | `#DD6B20` | Document freshness alerts, offer mismatches, "due soon" indicators |
| Alert | `#E53E3E` | Overdue badges, missing/blocking documents, critical items only |
| Border | `#E2E8F0` | All panel borders (1px solid), card borders, input borders |

### 2.4 Borders & Shadows

**Strict rule retained from v1:** No drop shadows on cards, panels, or standard UI elements. Cards use `border: 1px solid #E2E8F0` with `border-radius: 8px`. On hover, cards get a very subtle `box-shadow: 0 2px 8px rgba(0,0,0,0.06)` — this is subtle enough to function as a hover state without violating the "no shadows" aesthetic.

**Modals only:** `box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)` with `backdrop-filter: blur(2px)`.

---

## 3. Icon System — Design Review

The junior's Lucide icon proposal is a good starting point. Here is the reviewed mapping with amendments:

### 3.1 "Waiting On" Indicators — Approved with Amendments

| Status | Icon | Colour | Rationale |
|--------|------|--------|-----------|
| ME | `MousePointerClick` | `#3182CE` (blue-600) | **Approved.** Signals Helen needs to click/act. More specific than `Flag`. |
| CLIENT | `UserClock` | `#D69E2E` (yellow-600) | **Approved.** Time-passing + person is the right metaphor. |
| LENDER | `Landmark` | `#667EEA` (indigo-500) | **Approved.** Institutional/bank connotation is correct. |
| PASSIVE | `Eye` | `#A0AEC0` (slate-400) | **Approved.** Observation mode. Muted colour communicates low priority. |

**Amendment:** Icons should be `strokeWidth={2.2}` at 12px size for crispness. The junior suggested `strokeWidth={2}` for small icons — 2.2 renders slightly better at these tiny sizes where anti-aliasing can make 2.0 look thin.

**Rejected alternative:** The junior mentioned `Flag` as an option for ME. Flags suggest urgency/priority, not "your turn to act." `MousePointerClick` is more semantically accurate.

### 3.2 Checklists & Stepper — Approved with Amendment

| State | Icon | Colour | Notes |
|-------|------|--------|-------|
| Completed | `CheckCircle2` | `#38A169` | Filled check circle — correct |
| Current/Active | `ArrowRightCircle` | `#4A90D9` | **Amended:** Use primary blue, not `blue-500` |
| Future/Pending | `Circle` | `#CBD5E0` | **Amended:** Slightly darker than `slate-300` for visibility |
| Warning/Expiring | `AlertTriangle` | `#DD6B20` | Uses the warning token — correct |
| Missing/Blocker | `XCircle` | `#E53E3E` | Uses the alert token — correct |

**Amendment to stroke width:** Stepper icons at `strokeWidth={1.5}` is correct — these are slightly larger (16–18px) decorative icons, not tiny action indicators.

### 3.3 Core Actions — Approved with Additions

| Action | Icon | Notes |
|--------|------|-------|
| Accept All | `CheckSquare` | Inside primary button — correct |
| Inline Edit | `SquarePen` | `text-slate-400 hover:text-blue-500` — correct |
| Generate & Download | `FileDown` | Inside primary button — correct |
| Add Note | `MessageSquarePlus` | Correct metaphor |
| Copy Summary | `Copy` | Correct |
| **New — Mark Complete** | `CircleCheck` | For SL/ASF "mark as complete" action |
| **New — Upload** | `Upload` | For illustration/offer upload zones |
| **New — Drag Handle** | `GripVertical` | For card drag affordance (show on hover) |

### 3.4 Case Type Badges — Approved

| Case Type | Icon | Notes |
|-----------|------|-------|
| Remortgage | `RefreshCcw` | Cycle/renewal metaphor — correct |
| FTB / Purchase | `Home` | Both use the same icon with different badge colours |
| Product Switch | `ArrowRightLeft` | Switching/swapping metaphor — correct |
| BTL | `Key` | Landlord/property management — correct |

**Sizing:** 9–10px at `strokeWidth={2}` inside the pill badge. The junior's suggestion of `w-3 h-3` (12px) is slightly too large when combined with text at 9.5px — 9–10px integrates better.

### 3.5 What to Avoid

Do NOT use emoji (🟢, 🟡, 🔵, ⚪) as status indicators in production. The design prompt used emoji for readability, but the implementation must use Lucide icons with controlled colour and sizing. Emoji render inconsistently across platforms and break the professional tone.

---

## 4. Screen 1: Kanban Dashboard

### 4.1 Layout

Full-viewport height. Three layers from top to bottom:

1. **Top bar** (fixed, ~44px): Title "Cases" + summary badges (action count, overdue count) on left. Search, Refresh, "New Case" button on right.
2. **Legend bar** (fixed, ~28px): Horizontal row showing all four waiting-on indicators with their icons and labels. This is a legend/key, always visible.
3. **Board area** (fills remaining height): Horizontally scrolling container with 8 stage columns.

### 4.2 Columns

Each column is 256px wide with 6px gap between columns. Column structure:

- **Header:** Stage label (bold, 12px) + case count badge (pill, muted)
- **Card area:** Scrollable vertical stack with two zones

**Active zone** (top): Cases where `waitingOn === "me"` OR `overdue === true`. Full opacity. These are the cases Helen can action right now.

**Monitoring zone** (below, separated by a thin labelled divider): Cases where `waitingOn !== "me"` AND `!overdue`. Rendered at 68% opacity. The divider reads "MONITORING" in 9px uppercase muted text between two horizontal rules.

**Zone collapsing:** If a zone is empty, it doesn't render (no placeholder, no empty divider). If all cases in a column are active, no divider appears. If all are monitoring, no divider appears — just the dimmed cards.

### 4.3 Case Card Component

The card is the most important UI element. It must communicate five things at a glance, in this priority order:

1. **Who is this waiting on?** — Top-left icon + label, coloured
2. **Is it overdue?** — Red "OVERDUE" badge, top-right (only if true)
3. **Who is the client?** — Name in bold, second row
4. **What type of case?** — Small coloured pill with icon
5. **What's the next action?** — Single line in primary blue

Secondary info (time in stage, latest note snippet) sits at the bottom in muted text.

**Card dimensions:** ~256px wide (column width minus padding), variable height based on content. Padding: 11px horizontal, 10px vertical. Border-radius: 8px.

**Drag behaviour:** Cards are `draggable`. On drag start, the card ID is set in `dataTransfer`. The target column shows a blue dashed border (`2px dashed rgba(74,144,217,0.3)`) with a light blue background tint. On drop, the case's stage updates.

**Overdue cards:** Get `border: 1px solid #FEB2B2` (soft red) instead of the standard border. This is subtle enough to not alarm, but visible enough to draw attention.

### 4.4 Top Bar Summary Badges

Two badges sit next to the page title:

- **Action needed:** `{count} action needed` — Blue background pill with `MousePointerClick` icon
- **Overdue:** `{count} overdue` — Red background pill with `AlertTriangle` icon (only shown if count > 0)

These give Helen an instant read of her workload without scanning the board.

### 4.5 New Case Modal

Triggered by the "New Case" button. Modal with backdrop blur. Fields:

1. **Client name(s)** — Text input, required
2. **Case type** — Select dropdown (Remortgage, FTB, Purchase, Product Switch, BTL, Other)
3. **Lead source** — Toggle button pair: "Eileen referral (70/30)" / "Direct to Helen (100/0)". This is NOT a dropdown — it's a prominent binary choice because it determines commission default
4. **Client summary** — Large textarea (4–5 rows). Placeholder text guides Helen to paste Eileen's email
5. **Fee arrangement** — Text input, pre-populated with "£200 advice + £150 admin"

The lead source toggle uses the primary colour for the selected option and white for the unselected one. The commission split is shown below each label in small text to reinforce the consequence of the choice.

---

## 5. Screen 2: Case Detail View

### 5.1 Architecture

Two-column layout. Left column scrollable (main content). Right column sticky (persistent controls).

**Right sidebar** (280px wide, sticky top: 1.5rem):

1. **Case Progress Stepper** — Vertical stage list with `CheckCircle2` (completed), `ArrowRightCircle` (current), `Circle` (future). Clicking a completed/current stage scrolls the left column to the relevant section.

2. **"Waiting On" Selector** — Prominent dropdown/toggle group to change the case's waiting-on status. This is the most-used control in the sidebar. Uses the same icon set as the dashboard cards.

3. **Quick Notes** — Always-visible textarea at the bottom. Cmd/Ctrl+Enter to save. New notes appear immediately in the notes history. No page reload.

**Left column** (fills remaining width): Stage-specific panels. Content adapts based on `case.stage`.

### 5.2 Stage-Aware Panel Rendering

This is the most significant UX change from v1. In v1, all panels were always in the DOM (some locked, some collapsed). In v2, panels are only rendered when relevant.

| Stage | Visible Panels |
|-------|---------------|
| Lead | Case header, Client summary (editable), Fee arrangement, Task list, Notes |
| Research | Case header, Task list, Notes, Client summary (read-only) |
| Client Response | Case header, Task list, Notes, Client summary (read-only) |
| DIP / Application | Case header, **DIP Readiness Checklist** (hero), Task list, Document checklist, Illustration section (collapsed), Notes |
| NB Submission | Case header, **NB Readiness** (hero), SL Generator, ASF Generator, Task list, Notes |
| Lender Processing | Case header, Task list, Notes, Offer panel |
| Offered | Case header, Offer comparison, Task list, Notes |
| Completed | Case header, Commission tracking, Task list, Notes |

**What's NOT shown at Lead stage:** Illustration panels, document checklist, SL/ASF generators, offer panel, audit log, fee comparison. These are invisible, not locked.

### 5.3 The "Suggest, Never Block" Principle in Practice

v1 enforced hard gates: illustration must be confirmed before SL can be generated. v2 changes these to soft warnings:

| Gate (v1) | Behaviour (v2) |
|-----------|----------------|
| SL generation blocked without confirmed illustration | SL form available. Warning banner: "Illustration not yet confirmed — generated letter may contain placeholder values." Helen can proceed. |
| ASF blocked without approved SL | ASF form available. Warning: "Suitability Letter not yet marked complete." |
| Approval checkbox required before download | **Removed.** Download is one click. "Mark complete" is a separate action after review. |
| Stale banner blocks export | Stale banner warns. Download still available. "Data may have changed since generation." |

This is a philosophical shift. The tool informs Helen; it doesn't control her. She's a qualified mortgage adviser — the tool serves her workflow, not the other way around.

---

## 6. Screen 3: DIP / Application Stage View

### 6.1 DIP Readiness Checklist — Hero Panel

This is the centrepiece of the DIP stage. It answers: "Can I submit this application?"

**Visual design:** Full-width panel, prominent positioning. Each line item shows:
- Icon: `CheckCircle2` (green), `AlertTriangle` (amber), or `XCircle` (red)
- Item name
- Status detail (e.g., "Applicant 1 ✅, Applicant 2 ⚠️ March missing")
- Date completed (if applicable)

**Joint applicant tracking:** Items that are per-person (CVI, Comentis, payslips, bank statements) show a sub-row per applicant with individual status.

**Document freshness:** Payslips and bank statements track which months are covered. If the earliest document would be >3 months old at the expected application date, the icon switches from green to amber with the text "(Jan expiring — chase updated payslip)".

### 6.2 Illustration Section

At DIP stage, the illustration section appears in collapsed form. It shows a one-line summary: "Santander 5yr Fix — £188,599 — Confirmed ✅" or "Not yet uploaded". Expanding reveals the full summary card with a "Verify Fields" button that opens the split-pane overlay.

---

## 7. Screen 4: NB Submission Stage View

### 7.1 NB Readiness Panel

Similar checklist structure to DIP Readiness, but for the NB submission pack:

- ✅ Illustration confirmed
- ⬜ Suitability Letter — [Generate & Download] button
- ⬜ ASF — [Generate & Download] button
- ✅ All documents on file
- ⬜ Pack submitted to NB

### 7.2 Suitability Letter Generator

**Key UX change from v1:** No approval gate. No preview pane. The flow is:

1. Helen fills manual fields (objectives, justification, affordability, risk, optional section toggles)
2. Pre-populated fields from illustration shown as read-only summary
3. One button: **[Generate & Download]** — immediately downloads `.docx`
4. Helen reviews in Word, makes any final edits there
5. Returns to tool and clicks **"Mark SL Complete"** checkbox

This matches Helen's actual workflow. She always reviews in Word. The in-app preview was wasted effort.

### 7.3 ASF Generator

Same pattern: fill manual fields → Generate & Download → Mark Complete.

**Commission split:** Auto-populated based on lead source. If Eileen referral: 70/30. If direct: 100/0. Override available via an "Override" link that expands an inline form requiring reason text.

---

## 8. Screen 5: Illustration Verification (Split Pane)

### 8.1 Key UX Changes from v1

| v1 Behaviour | v2 Behaviour |
|-------------|-------------|
| Must individually confirm fields before "Confirm All" works | **"Accept All" works immediately** — one click confirms every field |
| Values shown unformatted (188599) | Values formatted (£188,599.00, 4.08%, 30 years) |
| Override requires saving + separate reason step | Override is inline: click ✎, type new value, type reason, blur to save |

### 8.2 Layout

50/50 split-pane overlay. Left: PDF viewer with page navigation. Right: field list with Accept/Edit controls.

**Top bar:** Field count ("14 of 18 confirmed"). **[Accept All]** button — always enabled, always one click. Close button.

**Field rows:** Required fields sorted to top. Each row: field label, formatted value (tabular figures), `CheckCircle2` if confirmed, `SquarePen` to edit.

**Page jumping:** Clicking a field row jumps the PDF viewer to `field.sourcePage`. This is retained from v1 — it works well.

---

## 9. Screen 6: Offer Comparison + Fee Comparison

### 9.1 Offer Comparison

Embedded in the case detail view when an offer has been uploaded.

**Match state:** Green banner with `CheckCircle2`: "Offer matches illustration" + key matched figures.

**Mismatch state:** Amber banner with `AlertTriangle`: "Offer differs from illustration" + comparison table. [Acknowledge & Continue] button. **Does NOT block anything.**

### 9.2 Fee Comparison Panel

Warm cream background (`#F5F0E8`). Read-only. Appears when two illustrations exist (fee added + fee upfront).

Three lines:
- Total repayable (fee added): £316,933.06
- Total repayable (fee upfront): £316,156.60
- **Interest charged on arrangement fee: £776.46** — in `#DD6B20` (warning colour), bold

All values in tabular figures.

---

## 10. Audit Log

**Position:** Collapsed accordion at the very bottom of the case detail view. Not a panel that competes with active content.

**Content:** Meaningful events only. Stage changes, document generation, commission overrides, offer acknowledgements, field overrides (with reason). NOT individual field confirmations — those create noise.

**Filterable:** By event type dropdown. Default: show all.

**Immutable:** No edit/delete controls visible. Read-only.

---

## 11. Empty States

Every view must have a helpful empty state. These are opportunities to guide Helen, not blank spaces.

| Context | Empty State Text |
|---------|-----------------|
| Empty Kanban column | "No cases at this stage" (italic, muted) |
| No illustration | "Upload illustration to extract mortgage details" |
| No notes | "Add a note to track this case" |
| No tasks completed | "Complete your first task to get started" |
| No offer uploaded | "Upload offer PDF when received (optional)" |
| SL not generated | "Generate Suitability Letter when ready" |

---

## 12. Implementation Notes

### 12.1 Component Hierarchy

```
KanbanDashboard
├── TopBar (title, summary badges, search, refresh, new case button)
├── LegendBar (waiting-on icon key)
├── BoardArea (horizontal scroll container)
│   └── KanbanColumn × 8
│       ├── ColumnHeader (stage label + count)
│       ├── ActiveZone
│       │   └── CaseCard × n
│       ├── ZoneDivider (conditional)
│       └── MonitoringZone
│           └── CaseCard × n (dimmed)
└── NewCaseModal (conditional)

CaseDetailView
├── LeftColumn (scrollable)
│   └── [Stage-specific panels — rendered conditionally]
└── RightSidebar (sticky)
    ├── CaseProgressStepper
    ├── WaitingOnSelector
    └── QuickNotes
```

### 12.2 State Management

The Kanban board is a client component fetching from `GET /api/cases`. Cases are sorted into columns client-side by `case.stage`. The "waiting on" field is a new addition to the Case model (not in v1 schema).

Drag-and-drop triggers `POST /api/cases/[id]/stage` with the appropriate action. If the transition requires confirmation (e.g., closing a case), a `ConfirmModal` intercepts before the API call.

### 12.3 New Data Model Fields

Required additions to the Prisma schema for v2:

- `Case.waitingOn`: Enum `WaitingOn { Me Client Lender Passive }` — defaults to `Me` on creation
- `Case.leadSource`: Enum `LeadSource { Eileen Direct }` — determines commission default
- `Case.clientSummary`: String (nullable) — free text from Eileen's email
- `Case.feeArrangement`: String (nullable) — defaults to "£200 advice + £150 admin"
- `Note` model: `{ id, caseId, content, createdAt }` — free text notes per case
- `Task` model: `{ id, caseId, title, dueDate, status, waitingOn, notes, sortOrder }` — per-case tasks with dependencies

### 12.4 Stroke Width Convention

Standardise across the codebase:

| Context | Stroke Width | Icon Size |
|---------|-------------|-----------|
| Tiny status indicators (card waiting-on, badges) | 2.2 | 10–12px |
| Standard action icons (buttons, inline actions) | 2.0 | 14–16px |
| Decorative/stepper icons | 1.5 | 16–20px |

---

## 13. What This Proposal Does NOT Cover

These items are referenced in Requirements_v2 but are out of scope for this UI proposal:

- **Email agent** (§10) — Separate feature, separate design pass
- **IO integration** — Backend concern, no UI impact yet
- **Mobile responsiveness** — Desktop only, minimum 1200px
- **Task dependency engine** — Backend logic; UI shows tasks in a flat list with checkboxes
- **Commission reconciliation** — Post-completion feature, deferred

---

## 14. Open Questions for Helen

1. **Notes ordering:** Newest at top (reverse chronological like a feed) or newest at bottom (like a chat)? The prototype uses newest-at-top.

2. **Stage transitions:** Should dragging a card backward (e.g., from DIP back to Research) require confirmation? Forward movement doesn't. But regression might indicate an error.

3. **Closed cases toggle:** The prototype hides closed cases entirely. Should there be a "Closed" column at the far right, or is a separate filtered view better?

4. **Accept All behaviour:** Requirements_v2 specifies Accept All confirms everything immediately with one click, no individual confirmation needed first. This is implemented. Confirm this is correct — v1 required individual confirmation before Accept All was enabled.
