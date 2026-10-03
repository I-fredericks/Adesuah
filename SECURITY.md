# Adesuah Security Assessment

Internal bug-bounty pass against the running system (local, October 2026).
Method: manual attack simulation with live probes — auth bypass, JWT attacks,
cross-tenant enumeration, IDOR, privilege escalation, mass assignment, rate
limiting, input abuse — plus a code review of every route's authorization.

**Verdict: 1 critical, 2 high, 5 medium findings. All critical/high items fixed
and re-verified in the same pass; mediums tracked below.**

---

## Findings

### 🔴 C1 — JWT secret equals the public example value — **FIXED**
**Was:** `.env` shipped with `JWT_SECRET=change-me-to-a-long-random-string` — the
exact value published in `.env.example` in the public repo. **Verified live:** a
hand-forged token signed with that secret authenticated as an OWNER (HTTP 200 on
staff-only endpoints). Any reader of the repo could mint super-admin tokens
whenever a deployment used the default.
**Fix:** boot guard added — production refuses to start (and dev warns) when the
secret matches the example list or is under 24 chars; local `.env` regenerated
with a 96-char random secret.
**Deployment rule:** production secret must be generated, never copied from the
repo, and rotated if it ever leaked.

### 🟠 H1 — Class roster endpoint crashed for everyone + leaked server paths — **FIXED**
**Was:** `GET /api/academic/classes/:id/roster` filtered on status `SUSPENDED`,
which doesn't exist in the student enum → Prisma exception → HTTP 500 with a stack
trace including filesystem paths (in dev) for **any staff member**.
**Fix:** valid status filter; error path returns clean JSON.

### 🟠 H2 — Class roster had no assignment scoping — **FIXED**
**Was:** once H1 was fixed, **any** staff account (e.g. librarian) could list any
class's pupils — children's names, DOB, admission numbers — regardless of role.
**Fix:** roster now honours teacher assignment scoping. Verified: librarian → 0
pupils; a JHS 2 subject teacher → their own class only; proprietor → all.

### 🟠 H3 — Head/owner could not see pending correction requests — **FIXED (functional bug)**
**Was:** the corrections list only ever showed the requester's own items because
permissions were never loaded on that route — the approval workflow shipped
broken (head sees an empty queue).
**Fix:** permissions resolved in the controller; verified the head now sees the
seeded pending request.

### 🟡 M1 — Assignments list readable across classes for scoped teachers — **FIXED**
Teachers with no `grades.view_all` could read other classes' homework titles
(minor info leak). Now scoped to assigned classes; verified.

### 🟡 M2 — Avatars accepted non-image data URIs — **FIXED**
`data:text/html;base64,…` was accepted for user avatars and pupil photos.
All three upload paths now whitelist `data:image/(png|jpeg|webp);base64` and
reject anything else (verified: HTML payload → 400).

### 🟡 M3 — Login rate limit keyed on client IP behind proxies — **OPEN (accepted, hardened)**
`trust proxy 1` means a client may rotate `X-Forwarded-For` values to dodge the
50/15-min auth limiter. Ceiling verified working per-IP (40 attempts → 429).
**Recommended next:** per-identifier throttle (lock an account for 15 min after
~10 failures) + failed-login audit rows. Not urgent while the API is private.

### 🟡 M4 — Weak password policy — **OPEN (accepted)**
Minimum 8 characters, no complexity/breach checks (`lookatme` passes). Suitable
for a small-school product today; add zxcvbn-style scoring or breach-list checks
later, and consider 2FA for OWNER/HEADTEACHER.

### 🟡 M5 — Self-service registration is open — **OPEN (product decision)**
Anyone can create a school workspace. When commercialising: email verification +
manual activation (or invite-only onboarding) so the platform can't be spammed
with fake schools.

### ⚪ Low / notes (no action required now)
- Tokens live in `localStorage` (standard SPA tradeoff) — CSP header is disabled
  (`helmet({ contentSecurityPolicy: false })`); add a strict CSP at deployment.
- Dev mode returns stack traces with filesystem paths; production hides them.
- `register-school` reveals whether an email already exists (409) — enumeration
  oracles on registration are hard to avoid entirely; acceptable.
- No login-failure audit rows yet (pairs with M3).
- Pupil photos/avatars are stored as data URIs in Postgres (1.5 MB cap each) —
  move to object storage (R2) if usage grows.
- Salary/fee endpoints rely on the permission matrix — matrix edits are audited ✓.

### ✅ Attacks that FAILED (verified live)
| Attack | Result |
|---|---|
| Unauthenticated sweep of 8 sensitive endpoints | all 401 |
| JWT `alg: none` forgery | 401 |
| Cross-school reads (school A token → school B data) | scoped, no leak |
| Platform endpoints with school token | 403 |
| Teacher reading an unassigned pupil | 404 |
| Teacher editing any pupil (permission + scope) | 403, data unchanged |
| Teacher marking attendance / entering scores outside assignment | 403 / 423-style blocks |
| Parent hitting staff endpoints or another child's record | 403 / 404 |
| Role escalation to SUPER_ADMIN via staff API | rejected by validation |
| Brute-force ceiling | 429 after ~40–50 attempts/window |

---

## Deployment security checklist (before going live)
1. Strong, unique `JWT_SECRET` (enforced by the boot guard now).
2. `NODE_ENV=production` (hides stack traces, enforces the secret guard).
3. Set `FRONTEND_URL` to the real domain(s) for the CORS allowlist.
4. Configure the SMS gateway key (reminders otherwise log instead of send).
5. Add a strict CSP header at the proxy (helmet CSP is disabled for inline styles).
6. Postgres: strong password, SSL required, backups on (Supabase handles this).
7. Consider per-account login throttling (M3) once the API is public.
