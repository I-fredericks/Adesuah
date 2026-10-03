# Adesuah Roadmap

Product plan derived from combined research on Ghanaian private basic/JHS schools
(Oct 2026): fee-driven cash flow stress, NTC teacher licensing deadlines, teacher
turnover, BECE disputes and evidence demands, curriculum transition to
standards-based assessment, weak governance, parent trust, and the shift of
regulation online (NaSIA SLIMS).

Core thesis: private schools don't mainly lack a place to store records — they
struggle with **cash flow, teacher supply & compliance, academic monitoring, parent
trust, and weak management structures**, and these feed each other. Adesuah's
position: a system that helps a school **run itself and prove it is running well**.

Competitive edge vs Acadia / sERP (who already do payments + SMS/USSD + parent apps):
**simplicity and price for small schools**, plus the Ghana-specific features
competitors skip — **NTC licence tracking, BECE candidate readiness,
evidence-grade academic records, inspection readiness**.

---

## ✅ Already shipped (v1)

| Area | Status |
|---|---|
| Multi-tenant schools + platform super-admin | Done |
| RBAC: 8 staff roles, 36 permissions, per-school editable matrix, teacher assignment scoping | Done |
| Students: enrollment, admission numbers, guardians, status, promotion, transfer, class history | Done |
| Academic structure: years/terms, levels KG1–JHS3, subjects, teacher allocation | Done |
| Assessments: configurable types & weights (SBA-ready), score entry, weighted totals | Done |
| Grading: BECE 9-point + standards-based A–D, configurable scales | Done |
| Report cards: publish/snapshot, remarks, printable A4, broadsheet | Done |
| Fees: structures, itemised invoices, payments + receipts, discounts, debtors, SMS reminders | Done |
| Announcements: audiences, in-app (SSE), SMS gateway hook | Done |
| Attendance: daily class register, stats | Done |
| Dashboards: school-wide stats | Done |
| Staff: profiles, invites, password resets | Done |
| Mobile-responsive UI + single-tunnel ngrok access | Done |

---

## Tier 1 — Launch blockers

Everything here maps to a top research problem. Target: pilot-ready.

### 1. Results integrity: lock, correct, audit 🔴 NEW
*Why:* BECE grading disputes — GNAPS demanded a WAEC audit (Aug 2026); schools need
**timestamped, tamper-evident** records. WAEC wants cumulative assessment records
for transferred pupils.
*Build:*
- `locked` flag on published report cards + term results; score entry blocked after lock
- Correction workflow: request (by teacher, with reason) → approve (head/owner) → applied with audit record
- `AuditLog` model: actor, action, entity, before/after JSON, timestamp — on score edits, result corrections, payment edits, staff changes, permission changes
- Per-pupil cumulative performance history endpoint (tests, mocks, term results) — exportable CSV/JSON as WAEC-style evidence
*Effort:* M · *Depends on:* nothing

### 2. Staff register + NTC licence compliance 🔴 NEW
*Why:* NTC requires regularisation of 30,000+ unqualified basic-school teachers by
end-2026; Act 1023 bars unregistered practitioners; schools fear closures.
*Build:*
- StaffProfile: `qualification`, `ntcLicenceNumber`, `ntcLicenceStatus` (NONE/PENDING/ACTIVE/EXPIRED), `licenseExpiry`, `gtcRegistration?`
- Expiry alert job → notify owner/head 60/30 days before expiry
- **Compliance report**: one click → staff table with licence status, qualifications, missing documents (inspection-ready)
*Effort:* S–M

### 3. Staff attendance 🔴 NEW
*Why:* teacher presence drives results and payroll trust; research recommends
automated staff attendance.
*Build:* daily staff sign-in register (simple marking like pupil attendance), monthly
per-teacher summary feeding the proprietor dashboard and (later) payroll.
*Effort:* S

### 4. Fee cash-flow kit 🟡 EXTEND (base exists)
*Why:* #1 research problem — late fees strain salaries/rent; instalments make
recovery harder; enrolment falling with economic hardship.
*Build (on existing invoices/payments):*
- **Instalment plans**: invoice split into due dates + amounts; arrears computed per instalment
- **Automated reminders**: scheduled job — reminder N days before each due date + overdue escalation (SMS + in-app); reuse existing SMS service
- **At-risk & ageing report**: debtors bucketed by days overdue
- **Receipts as PDF + WhatsApp share link** (print exists; add share)
- Expected-vs-collected trend chart on the proprietor dashboard (summary data exists)
*Effort:* M

### 5. Absence alerts 🟡 NEW (small)
*Why:* attendance → early intervention; parents expect to know same-day.
*Build:* when register is saved, compile absent pupils → one-tap SMS to their
guardians (reuses announcement SMS plumbing).
*Effort:* S

### 6. Timetable 🟡 NEW
*Why:* part of core academic management expectations (Tier 1 in research).
*Build:* per-class weekly period grid (day × period → subject + teacher), conflict
check on teacher double-booking; printable; feeds teacher dashboard "my day".
*Effort:* M

### 7. Role dashboards 🟡 EXTEND
*Why:* research specifies four distinct dashboards; current dashboard is school-wide.
*Build:* dashboard endpoint variants selected by permissions:
- **Proprietor**: collection rate, outstanding, expected-vs-collected, expenses (Tier 2), staff & pupil attendance, enrolment change vs last term
- **Headteacher**: today's attendance, missing-score subjects (who hasn't submitted), pupils needing attention, published/locked results status
- **Teacher**: my classes only — today's timetable, unmarked attendance, pending score entry
- **Parent** (Tier 1.5): one screen per child — attendance, fee balance, latest results, announcements
*Effort:* M

### 8. Parent portal (read-only) 🟡 NEW
*Why:* parent trust + fee transparency; guardians already link to `User` accounts in schema.
*Build:* PARENT role guard → "My children" screen: attendance, fee balance, published
report cards, announcements. Strictly scoped by Guardian links (never another child).
*Effort:* M

### 9. Audit logs & backups 🟡 EXTEND
*Why:* weak governance; children's data; Data Protection Act posture.
*Build:* `AuditLog` (see 1) + nightly automated DB backups note (Supabase managed
backups) + data export (students/fees/results to CSV) so the school's data is theirs.
*Effort:* S after #1

### 10. Performance trends 🟡 NEW
*Why:* "unstable results" drive withdrawals; heads need to see trajectory.
*Build:* class & pupil term-over-term averages chart; subject-level comparison; feeds
early-warning (Tier 2).
*Effort:* S–M

---

## Tier 2 — Shortly after launch

| # | Feature | Why (evidence) | Notes |
|---|---|---|---|
| 1 | **Early-warning view** | Attendance + grade trend + fee status combined per-pupil risk flag | Builds on #1/#4/#10 Tier 1 data |
| 2 | **BECE candidate readiness** (JHS3) | GNAPS/WAEC disputes; ineligible-registration penalties; cumulative CA records for transfers | Candidate list, eligibility checklist, cumulative record export, mock vs school-score analysis, transfer history completeness |
| 3 | **Lesson plans & schemes of learning** | NaCCA monitoring found unprepared/unvetted plans | Submit → head/coordinator approve or return; termly scheme templates; feeds the academic coordinator role we already modelled |
| 4 | **Compliance & inspection dashboard** | NaSIA SLIMS shift; Pre-Tertiary Act supervision | Checklist: staff licences, pupil records completeness, fee receipts, insurance/GES docs; export pack |
| 5 | **MoMo/USSD payments** | Acadia (Moolre) & sERP already offer; match rather than lead | Paystack/MoMo gateway → auto-reconcile invoice payments; USSD via partner |
| 6 | **Discipline & welfare records** | Behaviour feeds early-warning | Strict permissions (separate from students.view), incident + action log |
| 7 | **Class book lists** | Parents complain about yearly prescribed book changes | Per class/term itemised list shown to parents; change history |
| 8 | **Inventory & teaching materials** | Low-fee school resource constraints | Simple register: items, condition, assigned-to |
| 9 | **Offline mode + sync** | Infrastructure/connectivity is a top constraint (NaSIA SLIMS is offline/USSD-aware) | PWA with queued mutations for attendance/scores; SMS fallback |
| 10 | **Parent notice acknowledgement** | Parents skipping meetings; proof of communication | Read receipts / "I acknowledge" button, logged |
| 11 | **Payroll records (light)** | Low pay & turnover; salary trust | Monthly staff payment records, no full accounting |
| 12 | **Certificates & documents** | Correspondence/secretary role duties | Generated transfer letters, testimonies from existing data |

## Tier 3 — Later

- **"Ask Adusauh" AI assistant** over school data (build good data first — Tier 1/2 make this possible)
- Predictive alerts (fee default risk, dropout risk, BECE outcome bands)
- Advanced financial analytics: expenses ledger, P&L, salary-vs-collection ratios
- Biometric staff attendance
- Native mobile apps
- Online exams / CBA with question banks
- Multi-campus schools (one proprietor, several branches, consolidated reports)
- Accounting software integrations

---

## Dashboards by role (spec)

| Role | Sees |
|---|---|
| Proprietor | Collection rate, outstanding fees, expected vs collected, expenses (T2), staff attendance, pupil attendance, enrolment change, compliance status |
| Headteacher | Today's attendance, pending lesson plans (T2), pupils needing attention, open discipline cases (T2), results submission & lock status |
| Academic Coordinator | Syllabus/scheme coverage (T2), score submission status by subject, performance trends by class |
| Teacher | **Assigned classes only**: attendance marking, score entry status, my timetable |
| Accountant | Fees: payments, outstanding, receipts, instalments, ageing |
| Parent | One screen per child: attendance, fee balance, published results, announcements |

Privacy rules across all dashboards: parents see only their own children; discipline &
welfare records behind dedicated permissions; audit log on sensitive reads/edits.

---

## Privacy & trust workstream (from day one)

- [x] Role-based access, parents scoped to own children *(RBAC shipped)*
- [ ] Audit logs on marks, attendance edits, payments, staff & permission changes *(Tier 1.1)*
- [ ] Extra restrictions on discipline/welfare notes *(Tier 2.6)*
- [ ] Data export so schools own their data *(Tier 1.9)*
- [ ] Confirm Ghana Data Protection Act obligations; register with the Data Protection Commission if required — **verify before commercial launch**

## Pre-launch checklist

- [ ] Fee ledger, instalments, receipts, arrears reports end-to-end
- [ ] Configurable SBA weights & report cards tested with a real school's marks
- [ ] Results locking + correction workflow working
- [ ] Staff register with NTC licence tracking
- [ ] Roles, audit logs, backups tested
- [ ] SMS flow tested with real phone numbers
- [ ] Fast on weak connections (phone-first, offline entry planned)
- [ ] Validate with 5–10 real proprietors/heads before scaling (see below)

## Validation plan

Interview 5–10 private JHS proprietors/heads (different towns & sizes): weekly time
sinks, paper records, fee chasing, marks submission flow, teacher attendance &
licence tracking, parent dispute causes, money leaks, parent communication,
last inspection experience, and: *"If Adesuah solved one problem, which should it be?"*
Let answers re-order Tier 1.

---

## Suggested build order (next sprints)

1. **Results integrity** — lock + correction + audit log (evidence-grade records, the differentiator)
2. **Staff compliance** — NTC licence fields + expiry alerts + compliance report
3. **Staff attendance** — quick register, feeds dashboards
4. **Fee cash-flow kit** — instalments + automated reminders + ageing report
5. **Absence alerts** — small, high parent-trust value
6. **Role dashboards + parent portal** — then timetable

Effort key: S ≤ 1 day · M ≤ 1 week · L > 1 week (solo dev estimates)
