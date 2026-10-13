# Developer Guide: Malda UG Cable Project Utility

## 1. Project Overview

The **Malda UG Cable Project Utility** is a mission-critical web application built for the **West Bengal State Electricity Distribution Company Limited (WBSEDCL)** and turnkey executing agencies (e.g., **M/s Tarun Enterprise**) for underground cabling works in Malda.

It tracks the end-to-end lifecycle of cable execution across 7 core phases:
1. **BOQ & Survey**: LOA baseline quantities, survey validation, and rates.
2. **GTP & Vendor Approval**: Guaranteed Technical Particulars (GTP) documentation and manufacturer approvals.
3. **Inspection & Dispatch (DI)**: Factory inspection offers, clearance, and dispatch instructions.
4. **Material Receipt**: On-site store verification and delivery tracking against DIs.
5. **Vendor Billing**: Supply and erection invoices, statutory deductions, and payment status.
6. **Daily Progress**: Feeder-wise daily site execution logs and site engineer verification.
7. **User & Identity Governance**: Role-based access, manual User ID and PIN credentialing.

---

## 2. Technical Stack & Architecture

- **Frontend**: Vanilla ES6+ JavaScript modules (`src/app.js`, `src/remote.js`).
- **Styling**: Curated responsive CSS design system with custom properties (`src/style.css`).
- **Build Tool**: Vite (`vite.config.js`).
- **PWA**: Service Worker (`sw.js`) and Web App Manifest (`manifest.json`) for offline capability and mobile installability.
- **Backend / Database**: Supabase (PostgreSQL 15+) with Row-Level Security (RLS) and PL/pgSQL stored procedures/triggers (`supabase/schema.sql`).

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser / PWA                   │
│   src/app.js (UI & State)  ◄──►  src/remote.js (Supabase)   │
└───────────────────────────────┬─────────────────────────────┘
                                │ Supabase JS Client (v2)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL 15+                     │
│  ├── Row Level Security (RLS) (Role-based policies)        │
│  ├── PL/pgSQL Business Triggers (guard_approval, etc.)      │
│  └── Security Definer RPCs (admin_rectify_approval)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Role-Based Access Control (RBAC) Architecture

The application enforces a dual-layer security model: **Frontend UI Visibility** and **PostgreSQL Database Triggers / RLS**.

### 3.1 The 7 System Roles

| Role Key | Real-World Identity | Core Responsibility |
| :--- | :--- | :--- |
| **`Admin`** | System Administrator / Project Head | Full system control, user credentialing, BOQ master edits, tagging rectification, unapproved record cleanup. |
| **`Region`** / **`WBSEDCL`** | Divisional Engineer (DE) / Assistant Engineer (AE) | Official WBSEDCL approver: approves/rejects GTP & Vendor letters, enters survey quantities, clears inspection offers, verifies daily logs, marks bills paid. |
| **`Vendor`** / **`Turnkey`** | Turnkey Contractor (e.g., M/s Tarun Enterprise) | Submits GTP/Vendor approval letters, offers materials for inspection, raises invoices, enters daily site progress. |
| **`Store`** | Store Keeper | Records physical receipt of materials against Dispatch Instructions (DI). |
| **`Viewer`** | Departmental Auditor / Senior Executive | Read-only observation across all dashboards, BOQ, approvals, and progress metrics. |

### 3.2 Permission Matrix

| Capability | Vendor | Region | Admin | Store | Viewer | Enforcement Layer |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **View Dashboard & Registers** | ✅ | ✅ | ✅ | ⚠️ Partial | ✅ | UI + RLS (`SELECT`) |
| **Edit BOQ Rates / LOA Quantities** | ❌ | ❌ | ✅ | ❌ | ❌ | Trigger `guard_item` + RLS |
| **Enter BOQ Survey Quantities** | ❌ | ✅ | ✅ | ❌ | ❌ | Trigger `guard_item` + RLS |
| **Submit GTP / Vendor Letter** | ✅ | ❌ | ✅ | ❌ | ❌ | Trigger `guard_approval` |
| **Approve / Reject / Hold Letters** | ❌ | ✅ | ✅ | ❌ | ❌ | Trigger `guard_approval` |
| **Rectify Letter Tagging** | ❌ | ❌ | ✅ | ❌ | ❌ | RPC `admin_rectify_approval` |
| **Delete Letters / Approvals** | ❌ | ❌ | ⚠️ Safe Admin | ❌ | ❌ | RLS (`approvals_delete`) + UI Guard |
| **Offer Material for Inspection** | ✅ | ❌ | ✅ | ❌ | ❌ | Trigger `guard_offer` |
| **Issue DI / Clear Inspection** | ❌ | ✅ | ✅ | ❌ | ❌ | Trigger `guard_offer` + RLS |
| **Record Material Store Receipts** | ❌ | ❌ | ✅ | ✅ | ❌ | RLS (`receipts_insert`) |
| **Raise Invoices (Claim Bills)** | ✅ | ❌ | ✅ | ❌ | ❌ | Stored Proc `save_invoice` |
| **Mark Invoices as Paid** | ❌ | ✅ | ✅ | ❌ | ❌ | Trigger `guard_invoice` |
| **Log Site Activities (Site Diary)** | ✅ | ❌ | ✅ | ❌ | ❌ | RLS (`site_activities_insert`) |
| **Manage Contract Overview & Milestones** | ❌ | ✅ | ✅ | ❌ | ❌ | RLS (`project_contract_update`) |
| **Manage BGs & Time Extensions (EOT)** | ❌ | ✅ | ✅ | ❌ | ❌ | RLS (`project_contract_update`) |
| **Reset Decisions to Submitted** | ❌ | ❌ | ✅ | ❌ | ❌ | RLS / Trigger + UI Guard |
| **Create Users & Reset PINs** | ❌ | ❌ | ✅ | ❌ | ❌ | RLS on `profiles` |

---

## 4. Frontend Architecture & Role Simulation

### 4.1 Role Helper Functions (`src/app.js`)

Do **not** inspect `user.role` directly for UI privileges. Always use the standard helper functions:

```javascript
// Resolves the active simulated role if Admin is using the test switcher
function effectiveRole() {
  if (sessionUser && user.role === 'Admin' && simulatedRole) return simulatedRole;
  return user.role || '';
}

function isAdmin() { return roleKey() === 'admin'; }
function isRegion() { return ['region', 'wbsedcl'].includes(roleKey()); }
function isVendor() { return ['vendor', 'turnkey'].includes(roleKey()); }
function isStore()  { return roleKey() === 'store'; }
function isViewer() { return roleKey() === 'viewer'; }
```

### 4.2 Role Simulation ("Simulate View")

Admins have a **Simulate View** dropdown in the sidebar to view the app through the eyes of any role (`Region`, `Vendor`, `Store`, `Viewer`). When active:
- `simulatedRole` updates state and recalculates `effectiveRole()`.
- Navigation pages filter according to `ROLE_PAGES[effectiveRole()]`.
- Unauthorized action buttons (e.g. Delete, Rectify, Add Item, Edit Milestones, Add BG/EOT) are completely removed from DOM.

### 4.3 Safe Deletion Principles

1. **No Inline Deletes on Tables**: The main approval and letter tables do **not** carry inline delete buttons. This eliminates accidental deletions during browsing.
2. **Detail Modal Placement**: Deletion is only accessible inside the letter or item inspection modal under Admin actions.
3. **Status-Guarded Deletion**:
   - Approvals or letters that are already **Approved** cannot be deleted via the UI (`record.status !== 'Approved'`).
   - If metadata needs correction on an approved letter, the Admin must use **"✏️ Rectify Letter Tagging"**.

---

## 5. Database Architecture & Business Triggers

### 5.1 Schema (`supabase/schema.sql`)

The database consists of the following core tables:
- `public.profiles`: User ID, PIN hash, role, active status, region/vendor mapping.
- `public.items`: BOQ items (Part-A Material, Part-B Erection), LOA qty, survey qty, rates.
- `public.approvals`: GTP and Vendor approval records keyed by `(item_sl, kind, letter_no)`.
- `public.offers`: Inspection offers submitted by turnkey vendor.
- `public.di`: Dispatch instructions cleared by Region.
- `public.receipts`: Store receipts entered by Store Keeper.
- `public.invoices` & `public.invoice_lines`: Billing claims and payment status.
- `public.logs`: Daily BOQ execution logs per feeder.
- `public.site_activities`: Random site activities and site diary events (Joint measurements, site visits, route inspections, feeder shutdowns, RoW clearances). Contains date, activity type, agency rep, WBSEDCL rep, other rep, optional qty, and description.
- `public.project_contract`: Contract baseline milestones (LOA date, date of acceptance, L1/L2 schedule submission & approval status, base target date) along with multi-entry `jsonb` arrays for Bank Guarantees (`bg_entries`) and Time Extension revisions (`eot_entries`).

### 5.2 Key Triggers & Procedures

#### `guard_approval()`
- **On INSERT**: Validates that only `Vendor`, `Turnkey`, or `Admin` can submit; forces initial status to `'Submitted'` and clears any approval memo/qty fields.
- **On UPDATE**: Validates that only `Region`, `WBSEDCL`, or `Admin` can decide; requires `memo_no`, `action_date`, and `remarks`. Prevents non-admins from changing `kind` or `item_sl`.

#### `admin_rectify_approval(p_old_kind, p_old_letter_no, p_new_kind, p_new_letter_no, p_new_vendor, p_new_sub_date, p_item_sl)`
- Runs as `SECURITY DEFINER`.
- Restricts execution strictly to `Admin` role.
- Updates approval tagging (switching between GTP and Vendor Approval, updating letter reference numbers or vendor names) across all covered materials in one atomic transaction.

---

## 6. GTP & Vendor Approval Architecture

### 6.1 Unified Single-Tab Experience
Rather than maintaining split tabs for "Vendor approval" and "GTP", all material items are presented in a unified table on the same tab. Each row provides:
- **Scope Badges**: Visual tagging indicating whether the approval covers `GTP + Vendor` (`kind = 'gtp_vendor'`), `GTP` (`kind = 'gtp'`), or `Vendor` (`kind = 'vendor'`).
- **Vendor / Manufacturer**: Approved or proposed vendor names.
- **Letter Reference**: Direct deep link to view or review all materials grouped under that letter.
- **Quantities**: LOA qty, survey qty, and WBSEDCL approved qty.
- **Decision Status**: Detailed status with approval memo reference, date, or rejection remarks.

### 6.2 The Three Submission Scopes (`kind`)
When submitting a letter, turnkey agencies choose between:
1. **`GTP + Vendor (Combined)` (`gtp_vendor`)**: Preferred turnkey workflow. Both GTP parameters and manufacturer credentials are submitted and evaluated in a single atomic record.
2. **`GTP only` (`gtp`)**: Technical parameters document only.
3. **`Vendor only` (`vendor`)**: Manufacturer approval document only.

### 6.3 Status-Segregated Tab Bar
The GTP/Vendor page features dedicated status filter tabs:
- **`All materials`**: Complete list of BOQ material items.
- **`Not-Submitted`**: Materials with no submitted letter reference.
- **`Pending Approval`**: Materials submitted by vendor awaiting WBSEDCL decision (`status = 'Submitted'`).
- **`Approved`**: Approved materials (`status = 'Approved'`).
- **`Rejected`**: Materials on hold or rejected (`status = 'Rejected'` / `'Hold'`).
- **`By letter`**: Letter-grouped view for batch review and bulk decisioning.

The top 4 KPI metric cards reflect the active counts across these 4 status categories and are clickable to immediately switch views.

**Multi-Submission & Replacement Logic**:
A BOQ material can have multiple approval submissions across different letters (for instance, an initial vendor submission was rejected due to debarment or technical non-compliance, followed by a subsequent letter proposing an alternative vendor).
- The **Rejected** tab filters materials that have any record with `status = 'Rejected'` or `'Hold'`. Such materials are always visible here and counted in the *Rejected / Hold* KPI card so rejection history and debarment memos remain accessible.
- If the material also has an active replacement letter awaiting decision (`status = 'Submitted'`), it will simultaneously appear on the **Pending Approval** tab so WBSEDCL engineers can review and decide on the new proposal without losing sight of the rejection.

### 6.4 Decision Lifecycle & Safe Reset Tools
- **Approving / Rejecting**: Region and Admin users enter WBSEDCL memo reference number, decision date, and remarks.
- **Admin Reset Tool**:
  - In the item modal or letter view, Admins have access to **"↺ Reset decision to Submitted"**.
  - This immediately clears the test approval/rejection fields (`memo_no`, `appr_date`, `approved_qty`, `remarks`, `action_by`) and returns the item to `'Submitted'` (Pending Approval).
- **Inspection Offer Eligibility**:
  - `approvedBoqQty(item)` checks `gtp_vendor` approvals first.
  - Materials approved under `gtp_vendor` (or both `vendor` and `gtp`) are cleared for turnkey inspection offers up to the approved quantity.
  - PostgreSQL trigger `guard_offer()` automatically validates `gtp_vendor` approved quantities before allowing inspection offers to be raised.

### 6.5 Database Schema & Triggers
```sql
-- Allowed approval kinds
ALTER TABLE public.approvals ADD CONSTRAINT approvals_kind_check 
  CHECK (kind IN ('vendor', 'gtp', 'gtp_vendor'));

-- Primary Key
PRIMARY KEY (item_sl, kind, letter_no);
```
- **`guard_approval()`**: Enforces mandatory vendor/manufacturer name for both `vendor` and `gtp_vendor`.
- **`guard_offer()`**: Resolves available offer headroom using `gtp_vendor` (`combo_qty`) or individual `vendor` and `gtp` approved records.

---

## 7. Contract Overview & Milestones System

### 7.1 BOQ Default Tab
- When opening the **BOQ** page, the **"Overview & Milestones"** tab is loaded by **default**.
- The tab bar allows seamlessly toggling between:
  1. `Overview & Milestones` (LOA, schedule approvals, BGs, EOTs)
  2. `Material (Part-A)`
  3. `Erection (Part-B)`

### 7.2 Executive Home Page Banner
- An executive contract milestone banner card is featured on the **Home page** (above the navigation grid).
- Clicking this banner or clicking the **Target KPI** navigates directly to the Contract Overview tab on the BOQ page.

### 7.3 Authorization Rules (Region User & Admin)
- **Authorized Roles**: Only **Region User** (`Region` / `WBSEDCL`) and **Admin** are authorized to:
  - Edit Contract Baseline & Schedule Milestones
  - Add, edit, or delete Bank Guarantees (`bg_entries`)
  - Add, edit, or delete Time Extension (EOT) revisions (`eot_entries`)
- **Read-Only Roles**: Vendors and Viewers can see all milestone data and status badges in real-time, but modification actions are hidden and blocked by RLS policies (`project_contract_update`).

### 7.4 BOQ Material & Erection Schedules: Total Cost & LOA Summary
- **Total Cost Column**: Both Material (Part-A) and Erection (Part-B) schedule tables display a dedicated **`Total Cost (₹)`** column (`LOA Qty × Quoted Rate`), formatted using Indian currency delimiters via `formatInr()`.
- **In-Table Subtotal Footer (`<tfoot>`)**: A sticky bottom row within the table displaying the active schedule subtotal (`Total of Part-A` or `Total of Part-B`) and executed value.
- **Two Distinct Material Groups in Part-A**:
  1. **Group 1: Part-A LOA Baseline Material Schedule (Supply & Delivery Items)**: The 15 official BOQ material items with quoted contract rates, totalling **₹20,22,46,617.70** baseline.
  2. **Group 2: Items Part of Erection Schedule (Supplied within Erection Charges / Extra Items)**: Materials added by Admin with **₹0 cost** (e.g. HDPE pipes, cable markers, or earthing accessories). These items are tracked for vendor approval, inspection, and site delivery, but carry ₹0 direct material supply charges because their supply costs are paid under the Erection Schedule (Part-B). They are presented in a dedicated table under a clean, distinct amber header with badge indicators (`₹0.00 LOA Material Cost`, `Supplied within Erection Charges`).
- **Official LOA Summary Section (at the bottom)**: Below the items table, a comprehensive contract breakdown renders the baseline financial figures as per the WBSEDCL Letter of Award (LOA No. 5301083425 / `SOW Malda UG.xlsx`):
  - **Part-A (Material Schedule Baseline)**: 15 line items, ₹20,22,46,617.70 (64.94% share of baseline).
  - **Part-A (Erection-Supplied Items)**: Tracked items with ₹0.00 direct material charge.
  - **Part-B (Erection Schedule)**: 21 line items, ₹10,91,71,572.82 (35.06% share of baseline).
  - **Total Amount Excluding GST (Total in Figures)**: ₹31,14,18,190.52 (31.14 Cr).
  - **Statutory Taxes (GST @ 18%)**: ₹5,60,55,274.29 (5.61 Cr).
  - **Total Contract Order Value (Including 18% GST)**: ₹36,74,73,464.81 (36.75 Cr).
  - **Amount in Words Transcription**: Exact LOA contractual transcription dynamically generated via `numberToIndianWords()` (*Rupees Thirty One Crore Fourteen Lakh Eighteen Thousand One Hundred Ninety and Fifty Two Paise Only* excluding GST, and with 18% GST).

### 7.5 Tabulated Overview Page & Post-Survey Variation Architecture
- **Compact & Tabulated Executive Dashboard**: The BOQ Overview page (`renderBoqOverview`) is organized into high-density, tabulated cards:
  1. **Executive Cost Summary & Survey Variation Tracking**: Cost-focused tabulated breakdown structured directly as per the LOA baseline:
     - **LOA Baseline Columns**: `Schedule Component (as per LOA)`, `Items`, `LOA Share (%)`, and `LOA Baseline Cost (₹)`.
     - **Post-Survey & Variation Columns**: `Post-Survey Cost (₹)`, `Cost Variation (₹)`, and `Variation (%)`.
     - **Pending Survey Status**: Because the WBSEDCL joint route survey is currently in progress, the post-survey cost and variation columns are structured with dedicated styling (`.survey-col`, `.survey-col-start`) and kept **blank / "Yet to finalize"** as per the official LOA baseline. Once joint survey measurements are approved, the post-survey quantities and resulting cost deviations will populate directly into these columns.
     - **Full Contract Reconciliation**: Tabulates Part-A Material (₹20,22,46,617.70), Part-B Erection (₹10,91,71,572.82), Total Amount Excluding GST (₹31,14,18,190.52), Statutory 18% GST (₹5,60,55,274.29), and Total Order Value Including GST (₹36,74,73,464.81), complete with official In-Words contractual transcriptions. (Note: Zero-cost erection-supplied materials remain grouped in the detailed Material Part-A tab for GTP/delivery tracking and are kept out of this executive overview table).
  2. **Contract Baseline & Implementation Milestones**: Tabulated parameter-by-parameter matrix displaying LOA/PO details, acceptance reference, L1/L2 schedule approval memos, and completion target timelines with countdown badges.
  3. **Bank Guarantees (Security & Performance BGs)**: Tabulated register of BG records with issuing banks, amounts, validity, and action buttons.
  4. **Target Completion & Time Extensions (EOT)**: Tabulated register of approval memos, revised targets, and extension days.

### 7.6 Feeder-wise Joint Route Survey Summary
- **Dedicated BOQ Tab**: Accessible via the **"Feeder Survey"** tab on the BOQ page.
- **Divisional User Authority**: Exclusively editable and certified by **Divisional User** (`Division` / `Divisional` / `Region` / `WBSEDCL` / `Admin`). Turnkey Vendors and Viewers have read-only access.
- **Required Survey Parameters**:
  1. `Name of Substation (SS)` (e.g., *English Bazar 33/11kV Substation*, *KPS 33/11kV Substation*)
  2. `Name of Feeder` (e.g., *English Bazar Feeder-1 (Rabindra Avenue)*)
  3. `Total Route Length (R/L)` (meters)
  4. `Cable 400 sq.mm` (length of 33kV/11kV 3C×400 sq.mm XLPE cable in meters)
  5. `Length of Cable 185 sq.mm` (length of 11kV 3C×185 sq.mm XLPE cable in meters)
  6. `3-Way RMU` (quantity of 3-Way SCADA RMU - Nos)
  7. `4-Way RMU` (quantity of 4-Way SCADA RMU - Nos)
  8. `Capacity-wise DTR` (Distribution Transformer capacities and counts, e.g. *250 kVA (2 Nos), 100 kVA (1 No)*)
  9. `No of Termination Kits size-wise (400 / 185)` (400 sq.mm sets & 185 sq.mm sets)
  10. `Micro-tunneling / HDD` (trenchless micro-tunneling length in meters)
  11. `Open-Cut` (open trenching length in meters)
  12. `JackPush lengths` (jack-pushing length in meters)
  13. `HDPE Pipes` (length of protective HDPE pipe in meters)
- **Compact & Tabulated Architecture**:
  - **Grouped Two-Tier Superheaders**: *Feeder Identification*, *Route & HT Cables (Laying Lengths)*, *RMUs & Transformers*, *Termination Kits*, *Trenching & Protection Lengths*, and *Survey Status & Actions*.
  - **Sticky `<tfoot>` Total Summary Row**: Automatically sums all route lengths, cable quantities, equipment counts, and trenching lengths across all feeders.
  - **Multi-Entry Modal**: Clean modal dialog with categorized field groups, datalists for substations & feeders, and validation.
  - **Persistence**: Saved to `public.project_contract.feeder_surveys` (JSONB) with automatic graceful fallback to encoded `remarks` for backward-compatible deployments.

---

## 8. Local Development, Build & Deployment

### 8.1 Prerequisites
- Node.js (v18.0.0 or higher, recommended v22+)
- npm (v9.0.0 or higher)

### 8.2 Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start development server
npm run dev

# 4. Production build
npm run build

# 5. Preview production build
npm run preview
```

### 8.3 Safe Build & Verification
Always ensure the production bundle builds without errors before pushing:
```bash
npm run build
```
Vite will compile modules, bundle CSS, and copy PWA assets (`sw.js`, `manifest.json`, icons) into `dist/`.

### 8.4 Automated Deployment via GitHub Pages
The repository includes automated CI/CD via GitHub Actions (`.github/workflows/deploy.yml`):
- Pushing commits to branch `main` automatically triggers the `Deploy to GitHub Pages` workflow.
- GitHub Actions installs dependencies, builds Vite using repository secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), and deploys `./dist` to GitHub Pages.

---

## 9. Developer Conventions & Rules

1. **Aesthetics & UI**: Use modern typography, curated CSS tokens (`var(--surface)`, `var(--text)`, `var(--line)`), clean micro-interactions, and badges (`badge ok`, `badge wait`, `badge hold`, `badge bad`, `badge kind-gtp-vendor`).
2. **Preserve Comments & Rationale**: Retain explanatory comments and error handlers across database and frontend interactions.
3. **No Unauthenticated Deletions**: Never remove foreign key safety checks or trigger validations without documented rationale.
4. **Trigger Integrity**: When writing bulk database updates or migrations in SQL, always ensure triggers like `guard_approvals` and `guard_offer` are accounted for or temporarily toggled.
