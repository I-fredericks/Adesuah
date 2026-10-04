/**
 * Permission × feature matrix test — hits every endpoint as every role and
 * asserts the exact access the defaults grant.
 *
 * Requires the demo seed (npm run seed) and the API running on :5000.
 * Run: node scripts/permission-matrix.mjs
 */
import puppeteer from 'puppeteer-core';
const BASE = process.env.API_BASE || 'http://localhost:5000';
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-gpu'],
  defaultViewport: { width: 1280, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 80)));

const login = async (id) => {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: id, password: 'lookatme' }),
  });
  return (await r.json()).token;
};
const auth = (t) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });
const call = async (t, method, path, body) => {
  const r = await fetch(BASE + path, {
    method,
    headers: auth(t),
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch {}
  return { status: r.status, j };
};

// tokens
const ROLES = {
  owner: 'proprietor@adesuah.demo',
  head: 'head@adesuah.demo',
  deputy: 'deputy@adesuah.demo',
  coord: 'coordinator@adesuah.demo',
  teacher1: 'teacher1@adesuah.demo',
  teacher3: 'teacher3@adesuah.demo',
  bursar: 'bursar@adesuah.demo',
  secretary: 'secretary@adesuah.demo',
  librarian: 'librarian@adesuah.demo',
  parent: 'parent@adesuah.demo',
  admin: 'admin@adesuah.demo',
};
const T = {};
for (const [k, id] of Object.entries(ROLES)) T[k] = await login(id);

// fixtures via owner
const O = T.owner;
const ids = {};
const classes = (await call(O, 'GET', '/api/academic/classes')).j.classes;
ids.jhs1 = classes.find((c) => c.name === 'JHS 1').id;
ids.jhs2 = classes.find((c) => c.name === 'JHS 2').id;
ids.p4 = classes.find((c) => c.name === 'Primary 4').id;
const terms = (await call(O, 'GET', '/api/academic/terms')).j.terms;
ids.term = terms.find((t) => t.isCurrent).id;
const subs = (await call(O, 'GET', '/api/academic/subjects')).j.subjects;
ids.math = subs.find((s) => s.code === 'MATH').id;
ids.eng = subs.find((s) => s.code === 'ENG').id;
const roster = (await call(O, 'GET', `/api/academic/classes/${ids.jhs1}/roster`)).j.students;
ids.pupil1 = roster[0].id;
const invoices = (await call(O, 'GET', '/api/fees/invoices')).j.invoices;
ids.invoice = invoices[0].id;
const staff = (await call(O, 'GET', '/api/staff')).j.staff;
ids.bursarUser = staff.find((s) => s.name === 'Abena Owusuaa').id;
ids.teacher1User = staff.find((s) => s.email === 'teacher1@adesuah.demo').id;
const corrections = (await call(O, 'GET', '/api/operations/corrections?status=PENDING')).j.corrections;
ids.correction = corrections[0]?.id;
const structures = (await call(O, 'GET', '/api/fees/structures?termId=' + ids.term)).j.structures;
ids.structure = structures[0]?.id ?? null;

// matrix: [role, method, path, body, expectAnyOf]
const M = [];
const add = (feature, role, method, path, body, expect) => M.push({ feature, role, method, path, body, expect });

// STUDENTS
for (const r of ['owner','head','deputy','coord','teacher1','teacher3','bursar','secretary','librarian']) add('students.list', r, 'GET', '/api/students', null, [200]);
for (const r of ['parent']) add('students.list', r, 'GET', '/api/students', null, [403]);
add('students.create', 'owner', 'POST', '/api/students', { firstName:'Test', lastName:'Matrix', gender:'MALE', classId: ids.p4, guardians:[{name:'G Matrix', phone:'0209990001'}] }, [201]);
add('students.create', 'head', 'POST', '/api/students', { firstName:'Test', lastName:'Matrix2', gender:'FEMALE', classId: ids.p4, guardians:[{name:'G2', phone:'0209990002'}] }, [201]);
add('students.create', 'secretary', 'POST', '/api/students', { firstName:'Test', lastName:'Matrix3', gender:'MALE', classId: ids.p4, guardians:[{name:'G3', phone:'0209990003'}] }, [201]);
add('students.create', 'teacher1', 'POST', '/api/students', { firstName:'X', lastName:'Y', gender:'MALE', classId: ids.jhs1, guardians:[{name:'G', phone:'0209990004'}] }, [403]);
add('students.create', 'bursar', 'POST', '/api/students', { firstName:'X', lastName:'Z', gender:'MALE', classId: ids.jhs1, guardians:[{name:'G', phone:'0209990005'}] }, [403]);
add('students.edit', 'secretary', 'PUT', `/api/students/${ids.pupil1}`, { address:'Updated by secretary' }, [200]);
add('students.edit', 'teacher1', 'PUT', `/api/students/${ids.pupil1}`, { address:'hacked' }, [403]);
add('students.status', 'head', 'PUT', `/api/students/${ids.pupil1}/status`, { status:'ACTIVE' }, [200]);
add('students.status', 'secretary', 'PUT', `/api/students/${ids.pupil1}/status`, { status:'WITHDRAWN' }, [403]);
add('students.promote', 'teacher1', 'POST', '/api/students/promote', { classId: ids.jhs1, toClassId: ids.jhs2 }, [403]);
add('students.transfer', 'deputy', 'PUT', `/api/students/${ids.pupil1}/transfer`, { classId: ids.jhs2 }, [200]);
// move back
add('students.transfer-back', 'owner', 'PUT', `/api/students/${ids.pupil1}/transfer`, { classId: ids.jhs1 }, [200]);

// ACADEMICS
for (const r of ['owner','head','deputy','coord','teacher1','bursar','secretary','librarian']) add('academics.view', r, 'GET', '/api/academic/classes', null, [200]);
add('academics.manage', 'owner', 'POST', '/api/academic/subjects', { name:'Matrix Subject', code:'MTX' }, [201, 409]);
add('academics.manage', 'head', 'PUT', `/api/academic/terms/${ids.term}`, { vacationDate: '2026-12-19' }, [200]);
add('academics.manage', 'coord', 'POST', '/api/academic/subjects', { name:'Matrix Subject 2', code:'MTX2' }, [201, 409]);
add('academics.manage', 'teacher1', 'POST', '/api/academic/subjects', { name:'Nope', code:'NP' }, [403]);
add('academics.manage', 'bursar', 'POST', '/api/academic/subjects', { name:'Nope2', code:'NP2' }, [403]);

// ATTENDANCE
const today = '2026-10-04';
add('attendance.mark', 'teacher1', 'POST', '/api/attendance/mark', { classId: ids.jhs1, date: today, records: [{ studentId: ids.pupil1, status: 'PRESENT' }] }, [200]);
add('attendance.mark', 'bursar', 'POST', '/api/attendance/mark', { classId: ids.jhs1, date: today, records: [{ studentId: ids.pupil1, status: 'PRESENT' }] }, [403]);
add('attendance.mark', 'secretary', 'POST', '/api/attendance/mark', { classId: ids.jhs1, date: today, records: [{ studentId: ids.pupil1, status: 'PRESENT' }] }, [403]);
add('attendance.mark', 'coord', 'POST', '/api/attendance/mark', { classId: ids.jhs2, date: today, records: [{ studentId: ids.pupil1, status: 'PRESENT' }] }, [403]);
add('attendance.view-scoped', 'teacher1', 'GET', `/api/attendance/register?classId=${ids.jhs2}&date=${today}`, null, [200]);
add('attendance.view', 'bursar', 'GET', `/api/attendance/register?classId=${ids.jhs1}&date=${today}`, null, [403]);

// SCORES
const sheet = async (t, c, s2) => (await call(t, 'GET', `/api/assessments/sheet?classId=${c}&subjectId=${s2}&termId=${ids.term}`)).j;
const atypes = (await call(O, 'GET', '/api/academic/assessment-types')).j.assessmentTypes;
add('scores.sheet', 'teacher1', 'GET', `/api/assessments/sheet?classId=${ids.jhs1}&subjectId=${ids.math}&termId=${ids.term}`, null, [200]);
add('scores.sheet', 'bursar', 'GET', `/api/assessments/sheet?classId=${ids.jhs1}&subjectId=${ids.math}&termId=${ids.term}`, null, [403]);
add('scores.save-own', 'teacher1', 'POST', '/api/assessments/scores', { classId: ids.jhs1, subjectId: ids.math, termId: ids.term, entries: [{ studentId: ids.pupil1, assessmentTypeId: atypes[0].id, rawScore: 75 }] }, [200]);
add('scores.save-foreign', 'teacher1', 'POST', '/api/assessments/scores', { classId: ids.jhs1, subjectId: ids.eng, termId: ids.term, entries: [{ studentId: ids.pupil1, assessmentTypeId: atypes[0].id, rawScore: 75 }] }, [403]);
add('scores.results', 'teacher1', 'GET', `/api/assessments/results?classId=${ids.jhs2}&termId=${ids.term}`, null, [200]);

// CORRECTIONS
add('corrections.request', 'teacher1', 'POST', '/api/operations/corrections', { studentId: ids.pupil1, subjectId: ids.math, termId: ids.term, assessmentTypeId: atypes[0].id, newScore: 88, reason: 'Matrix test correction' }, [201, 409]);
add('corrections.decide', 'teacher1', 'POST', `/api/operations/corrections/${ids.correction}/decide`, { approve: true }, [403]);
add('corrections.decide', 'head', 'POST', `/api/operations/corrections/${ids.correction}/decide`, { approve: true, note: 'ok' }, [200]);
add('corrections.decide-deputy', 'deputy', 'POST', '/api/operations/corrections/999999/decide', { approve: true }, [404]);
add('corrections.list-approver', 'head', 'GET', '/api/operations/corrections?status=PENDING', null, [200]);
add('audit.logs', 'teacher1', 'GET', '/api/operations/audit-logs', null, [403]);

// REPORTS
add('reports.publish', 'head', 'POST', '/api/reports/publish', { classId: ids.p4, termId: ids.term }, [200]);
add('reports.publish', 'teacher1', 'POST', '/api/reports/publish', { classId: ids.jhs1, termId: ids.term }, [403]);
add('reports.publish', 'coord', 'POST', '/api/reports/publish', { classId: ids.jhs1, termId: ids.term }, [403]);
add('reports.remarks', 'deputy', 'PUT', '/api/reports/1/remarks', { conduct: 'Good' }, [403, 404]);
add('reports.view', 'bursar', 'GET', `/api/reports/broadsheet?classId=${ids.jhs1}&termId=${ids.term}`, null, [403]);
add('reports.view', 'librarian', 'GET', `/api/reports/broadsheet?classId=${ids.jhs1}&termId=${ids.term}`, null, [403]);
add('reports.lock', 'owner', 'POST', '/api/reports/lock', { classId: ids.jhs1, termId: ids.term, locked: true }, [200]);
add('reports.locked-blocks-entry', 'teacher1', 'POST', '/api/assessments/scores', { classId: ids.jhs1, subjectId: ids.math, termId: ids.term, entries: [{ studentId: ids.pupil1, assessmentTypeId: atypes[0].id, rawScore: 99 }] }, [423]);
add('reports.lock', 'owner', 'POST', '/api/reports/lock', { classId: ids.jhs1, termId: ids.term, locked: false }, [200]);

// FEES
for (const r of ['owner','head','bursar','secretary']) add('fees.view', r, 'GET', '/api/fees/summary', null, [200]);
for (const r of ['teacher1','librarian','coord']) add('fees.view', r, 'GET', '/api/fees/summary', null, [403]);
add('fees.structure', 'bursar', 'POST', '/api/fees/structures', { termId: ids.term, classId: ids.jhs2, name: 'Matrix fees', items: [{ name:'Tuition', amount: 1 }] }, [409]);
add('fees.structure', 'head', 'POST', '/api/fees/structures', { termId: ids.term, classId: ids.jhs2, name: 'Matrix fees 2', items: [{ name:'Tuition', amount: 1 }] }, [403]);
add('fees.payments', 'secretary', 'POST', '/api/fees/payments', { invoiceId: ids.invoice, amount: 5, method: 'CASH' }, [201]);
add('fees.payments', 'teacher1', 'POST', '/api/fees/payments', { invoiceId: ids.invoice, amount: 5 }, [403]);
add('fees.discount', 'bursar', 'PUT', `/api/fees/invoices/${ids.invoice}/discount`, { discountAmount: 10 }, [200]);
add('fees.remind', 'secretary', 'POST', '/api/fees/reminders/run?dryRun=1', null, [403]);
add('fees.remind', 'bursar', 'POST', '/api/fees/reminders/run?dryRun=1', null, [200]);
add('fees.debtors', 'secretary', 'GET', '/api/fees/debtors', null, [403]);

// PAYROLL
for (const r of ['owner','head','bursar','teacher1','secretary']) add('payroll.mine', r, 'GET', '/api/salary/mine', null, [200]);
add('payroll.view_all', 'head', 'GET', '/api/salary', null, [200]);
add('payroll.view_all', 'teacher1', 'GET', '/api/salary', null, [403]);
add('payroll.record', 'bursar', 'POST', '/api/salary', { userId: ids.teacher1User, period: '2026-08', amount: 1800, method: 'MOMO' }, [201, 409]);
add('payroll.record', 'head', 'POST', '/api/salary', { userId: ids.teacher1User, period: '2026-07', amount: 1800 }, [403]);

// EXTRA CLASSES
for (const r of ['owner','head','teacher1','bursar','librarian']) add('extraclasses.list', r, 'GET', '/api/extra-classes', null, [200]);
add('extraclasses.manage', 'head', 'POST', '/api/extra-classes', { title:'Matrix Extra', classId: ids.jhs1, days:'Fri', startTime:'06:30', endTime:'07:30' }, [201]);
add('extraclasses.manage', 'teacher1', 'POST', '/api/extra-classes', { title:'Nope', classId: ids.jhs1, days:'Fri', startTime:'06:30', endTime:'07:30' }, [403]);

// ASSIGNMENTS
for (const r of ['owner','head','teacher1','secretary','librarian']) add('assignments.list', r, 'GET', `/api/assignments?classId=${ids.jhs1}&termId=${ids.term}`, null, [200]);
add('assignments.create', 'teacher1', 'POST', '/api/assignments', { classId: ids.jhs1, subjectId: ids.math, termId: ids.term, title: 'Matrix homework', dueDate: '2026-10-30' }, [201]);
add('assignments.create', 'teacher1', 'POST', '/api/assignments', { classId: ids.jhs1, subjectId: ids.eng, termId: ids.term, title: 'Nope' }, [403]);
add('assignments.create', 'bursar', 'POST', '/api/assignments', { classId: ids.jhs1, termId: ids.term, title: 'Nope' }, [403]);

// STAFF OPERATIONS
add('staff.list', 'owner', 'GET', '/api/staff', null, [200]);
add('staff.list', 'secretary', 'GET', '/api/staff', null, [200]);
add('staff.list', 'teacher1', 'GET', '/api/staff', null, [403]);
add('staff.list', 'bursar', 'GET', '/api/staff', null, [403]);
add('staff.create', 'head', 'POST', '/api/staff', { name:'Matrix Teacher', role:'TEACHER', email:'matrix-t@adesuah.demo', password:'lookatme' }, [201, 409]);
const mt = (await call(O, 'GET', '/api/staff')).j.staff.find((s) => s.email === 'matrix-t@adesuah.demo');
ids.matrixTeacher = mt ? mt.id : ids.teacher1User;
add('staff.create', 'secretary', 'POST', '/api/staff', { name:'Nope', role:'TEACHER', email:'nope@adesuah.demo', password:'lookatme' }, [403]);
add('staff.reset', 'secretary', 'POST', `/api/staff/${ids.teacher1User}/reset-password`, null, [403]);

// OPERATIONS GATES
add('staffattendance.view', 'secretary', 'GET', '/api/operations/staff-attendance?date=2026-10-04', null, [200]);
add('staffattendance.view', 'teacher1', 'GET', '/api/operations/staff-attendance?date=2026-10-04', null, [403]);
add('staffattendance.mark', 'deputy', 'POST', '/api/operations/staff-attendance', { date: today, records: [{ userId: ids.bursarUser, status: 'PRESENT' }] }, [200]);
add('staffattendance.mark', 'head', 'POST', '/api/operations/staff-attendance', { date: today, records: [{ userId: ids.bursarUser, status: 'PRESENT' }] }, [200]);

// MESSAGES + SETTINGS + PLATFORM + PORTAL
for (const r of ['owner','head','teacher1','bursar','librarian']) add('messages.log', r, 'GET', '/api/messages', null, [200]);
add('school.get', 'librarian', 'GET', '/api/school/mine', null, [200]);
add('school.update', 'head', 'PUT', '/api/school/mine', { motto: 'Updated motto' }, [403]);
add('school.update', 'owner', 'PUT', '/api/school/mine', { motto: 'Knowledge, Discipline, Success' }, [200]);
add('roles.manage', 'head', 'PUT', '/api/academic/roles/TEACHER/permissions', { permissions: [] }, [403]);
add('platform.denied', 'owner', 'GET', '/api/platform/schools', null, [403]);
add('platform.ok', 'admin', 'GET', '/api/platform/schools', null, [200]);
add('portal.parent', 'parent', 'GET', '/api/portal/children', null, [200]);
add('portal.staff-denied', 'owner', 'GET', '/api/portal/children', null, [403]);
add('staff.reset', 'head', 'POST', `/api/staff/${ids.matrixTeacher}/reset-password`, null, [200]);
add('announcements.create', 'secretary', 'POST', '/api/announcements', { title: 'Matrix notice', body: 'Matrix body text for testing', audience: 'STAFF' }, [201]);
add('announcements.create', 'teacher1', 'POST', '/api/announcements', { title: 'Nope', body: 'Nope body', audience: 'ALL' }, [403]);

// RUN
let pass = 0, fail = 0;
const failures = [];
for (const t of M) {
  const token = T[t.role];
  const r = await call(token, t.method, t.path, t.body);
  if (t.feature === 'corrections.request') {
    const pending = (await call(T.head, 'GET', '/api/operations/corrections?status=PENDING')).j.corrections;
    ids.correction = pending[0]?.id;
  }
  const ok = t.expect.includes(r.status);
  if (ok) pass += 1;
  else {
    fail += 1;
    failures.push(`✗ [${t.feature}] ${t.role} ${t.method} ${t.path} → got ${r.status}, expected ${t.expect.join('/')} | ${r.j?.message || ''}`);
  }
}
console.log(`\nMATRIX: ${pass} passed, ${fail} failed of ${M.length}`);
failures.forEach((f) => console.log(f));
await browser.close();
