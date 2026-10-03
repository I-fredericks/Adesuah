# Adesuah — Multi-School Management System for Private Basic Schools

**Adesuah** is a multi-tenant SaaS platform that lets many private **Primary & JHS schools**
register on one system and manage admissions, academics, attendance, assessments, report cards,
fees and communication — replacing the paper registers, handwritten report cards and cash-receipt
books most local private schools still run on.

Same stack as the car-marketplace project (SikaRide).

---

## 1. Research — Why schools need this (problems observed in local private schools)

| # | Problem today | What the system does |
|---|---|---|
| 1 | **Admissions on paper** — admission registers get lost, no quick lookup of a pupil's record | Digital student records with auto admission numbers, guardians, photos, documents, full class history |
| 2 | **Fee collection chaos** — cash + MoMo paid with no reconciliation; bursar's ledger doesn't match reality; debtors unknown until term end | Per-term invoices from fee structures, payment recording with printable receipts, arrears/defaulter reports, fee reminders to guardians |
| 3 | **Report cards take weeks** — teachers handwrite scores, positions and remarks per subject; photocopying | Score entry per subject/class, automatic totals, grades, subject & class positions, remarks, one-click printable A4 report cards, batch publish |
| 4 | **Attendance registers are never analysed** | One-tap daily class register, per-student attendance stats on the report card, absence analytics |
| 5 | **Parent communication is WhatsApp noise** — fee deadlines & closures get missed | Announcements to whole school / a class / staff only, in-app notifications (SSE), SMS gateway hook for guardians |
| 6 | **Data loss** — cum books and ledgers burn/soak; no backups | Central Postgres (Supabase) with managed backups; records survive staff turnover |
| 7 | **No visibility** — proprietor can't see enrollment, collections or performance without counting by hand | Dashboards: enrollment by level, collection vs expected, attendance rate, class performance |
| 8 | **Ghana-specific compliance** — BECE (WAEC) candidates, GES census returns, term/trimester calendar | JHS3 candidate data export, BECE 9-point or A–D standards-based grading, 3-term calendar with vacation/reopening dates |

### Education context the system is built around
- **Structure:** KG 1–2, Primary 1–6 (Basic 1–6), JHS 1–3 (Basic 7–9) — NaCCA standards-based curriculum.
- **Calendar:** 3 terms (trimesters) per academic year, each with opening/closing and vacation dates.
- **BECE (WAEC Ghana):** written in JHS3; subjects — English, Maths, Integrated Science, Social
  Studies, RME, Career Technology, Computing, Creative Arts & Design, Ghanaian Language, French
  (optional), Arabic (optional); graded on the **9-point scale (1 = best, 9 = fail)**; schools submit
  continuous assessment scores and register candidates ~October–November.
- **Grading:** configurable per school — BECE 9-point (80-100→1 Excellent … 0-44→9 Fail) for
  upper/JHS, or A–D standards-based (Advanced Proficient → Below Proficiency) for lower primary.
- **Assessment mix (configurable weights):** Class Exercise, Homework, Project, Group Work,
  Mid-Term, End-of-Term Exam — continuous assessment + exam weighted to 100%.

---

## 2. Feature List

### Phase 1 — Core (implemented in this scaffold)
**Platform (multi-tenancy)**
- School self-registration + onboarding (auto-seeds levels KG1→JHS3, Ghana subjects, grading scales, assessment types, academic year + 3 terms)
- Platform super-admin: list/create/suspend schools, platform-wide stats
- Per-school subscription plan fields (FREE/STANDARD/PREMIUM) for future billing

**Accounts & access**
- JWT auth, login by email or phone, roles: SUPER_ADMIN, OWNER, ADMIN, TEACHER, ACCOUNTANT, PARENT
- Staff management (invite staff, assign role, activate/deactivate), change/forgot/reset password

**Academic setup**
- Academic years + terms (set current, vacation & next-term dates)
- Levels (KG1…JHS3) & classes (sections A/B…) with class-teacher assignment
- Subjects & class-subject (teacher allocation), assessment types with configurable weights
- Grading scales per stage (BECE 1–9 / A–D standards-based)

**Students**
- Enrollment with auto admission numbers, guardians, status (active/graduated/transferred/withdrawn)
- Class rosters, year-end promotion (promote/graduate/repeat per student), class transfers
- Enrollment history per academic year

**Attendance** — daily per-class register (present/absent/late/excused), monthly stats

**Assessments & report cards**
- Score entry per subject × assessment × class
- Automatic weighted totals, grades, subject positions, class positions
- Printable A4 report cards (school header, attendance, psychomotor/conduct, auto+editable teacher & headteacher remarks), batch publish, class broadsheet

**Fees**
- Fee structures per class/term with itemised components
- Term invoice generation for whole classes, discounts/waivers
- Payments (cash/MoMo/bank/cheque) with auto receipt numbers, printable receipts
- Debtors/arrears report, collection summary

**Communication**
- Announcements (all/staff/class), in-app notifications with SSE realtime, SMS gateway hook for guardians

**Dashboards** — students, staff, today's attendance, fee collection vs expected, enrollment by level

### Phase 2 — Roadmap
Timetables, staff payroll & leave, exams scheduling + BECE candidate export (WAEC registration data), GES census/EMIS returns export, library, inventory/assets, transport, parent portal & student portal (PWA), more analytics.

### Phase 3 — Roadmap
SaaS billing (Paystack per-school subscriptions), document storage (R2), data import/export, multi-campus schools.

---

## 3. Architecture

Same stack & conventions as car-marketplace:

```
Primary&JHS_SchoolManagement_System/
├── backend/                  Node.js + Express 5 (CommonJS) + Prisma 6 + JWT + zod
│   ├── prisma/schema.prisma  Multi-tenant schema (every tenant row carries schoolId)
│   └── src/
│       ├── index.js          App entry: helmet, rate limits, CORS allowlist, routes
│       ├── config/db.js      Prisma client singleton
│       ├── middlewares/      auth (protect/requireRole/tenant scope), zod validation, errors
│       ├── controllers/      auth, platform, school, academic, students, attendance,
│       │                     assessments, reports, fees, announcements, staff, dashboard
│       ├── services/         onboarding seeds, report computation, fee invoicing,
│       │                     promotion, notifications, SSE hub, SMS gateway hook
│       ├── routes/           Express routers mounted under /api
│       └── utils/            pure helpers (grading math, money, ids) — unit-tested
└── frontend/                 React 19 + Vite 8 + TanStack Query + Tailwind v3 + Router 7
    └── src/
        ├── context/AuthContext.jsx
        ├── utils/api.js      axios instance with JWT interceptor
        ├── components/       app shell (sidebar layout), guards, UI primitives
        └── pages/            login, register-school, dashboard, students, academics,
                              attendance, score entry, report cards, fees, announcements,
                              staff, settings, platform admin
```

**Multi-tenancy model:** one shared Postgres database. `School` is the tenant. Every
tenant-scoped table has `schoolId` (+ compound indexes `@@index([schoolId, …])`). The auth
middleware puts the user's school on the request; controllers scope every query by it, so a
school can never read another school's data. The platform super-admin (`schoolId = null`) can
act across schools. Future scale-out path: Postgres row-level security or per-tenant schemas.

**Key domain decisions**
- Money: `Decimal(12,2)` (GHS); scores: weighted percentages per subject, total out of 100.
- Grading scales are data, not code — schools can edit grade bands without a deploy.
- Report cards are snapshotted on publish (score edits afterwards don't rewrite issued reports).
- Receipt & admission numbers are generated server-side per school.
- SMS is a provider hook (Arkesel-compatible) — disabled unless keys are configured.

## 4. Getting started

A local Postgres is already running for development on this machine (user-owned instance,
data dir `/tmp/kilo/schoolhub-pg`, socket `/tmp/kilo`, port 5432, trust auth — started via
`pg_ctl`). `backend/.env` points at it. For production use Supabase Postgres as with the
car-marketplace project.

```bash
# Backend
cd backend
npm install
npx prisma migrate dev      # apply migrations (already applied for the local DB)
npm run seed                # demo school + staff + students (optional)
npm run dev                 # http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api → :5000)
```

Demo/test schools created during development exist in the local DB:
- `owner@test.edu.gh` — Test Model School (Password123)
- `owner@gracehills.edu.gh` — Grace Hills School (Password123)
- `proprietor@demo-school.edu.gh` — Rising Stars Academy via `npm run seed` (Password123)

## 5. Mobile & ngrok access

The whole UI is mobile-responsive (collapsible sidebar, stacked forms, scrollable tables).

**Option A — one tunnel (recommended):** the backend serves the built frontend, so one ngrok
tunnel exposes the entire app on the same origin (no CORS, no second tunnel):

```bash
cd frontend && npm run build      # build the SPA once
ngrok http 5000                   # tunnel the backend
# open the https://….ngrok-free.app URL it prints — full app + API on one origin
```

Ngrok free shows a one-time "Visit Site" interstitial per browser session. For a fixed
address add a static domain: `ngrok http 5000 --domain=your-name.ngrok-free.app`.

**Option B — dev mode over ngrok:** `vite.config.js` sets `host: true` and
`allowedHosts: true`, so you can also tunnel `ngrok http 5173` while `npm run dev` runs
(the Vite proxy forwards `/api` to the backend on :5000).

## 6. Testing

```bash
cd backend  && npm test      # Jest — pure domain logic (grading, positions, fee math)
cd frontend && npm test      # Vitest
```

## 7. API overview (all under `/api`)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register-school`, `/auth/login`, `/auth/me`, `/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password` |
| Platform | `GET/POST /platform/schools`, `PUT /platform/schools/:id/status`, `GET /platform/stats` |
| Academic | `/academic/years`, `/academic/terms`, `/academic/levels`, `/academic/classes`, `/academic/subjects`, `/academic/class-subjects`, `/academic/assessment-types`, `/academic/grading-scales` |
| Students | `/students`, `/students/:id`, `/students/:id/guardians`, `/students/import`, `/enrollments/promote`, `/classes/:id/roster` |
| Attendance | `POST /attendance/mark`, `GET /attendance/class/:classId?date=`, `GET /attendance/stats` |
| Assessments | `POST /assessments/scores`, `GET /assessments/scores`, `GET /assessments/results` |
| Reports | `POST /reports/publish`, `GET /reports/student/:id?termId=`, `GET /reports/broadsheet`, `GET /reports/print/:studentId` |
| Fees | `/fees/structures`, `/fees/invoices/generate`, `/fees/payments`, `/fees/debtors`, `/fees/summary` |
| Announcements | `/announcements`, `/notifications`, `/events` (SSE) |
| Dashboard | `GET /dashboard` |
