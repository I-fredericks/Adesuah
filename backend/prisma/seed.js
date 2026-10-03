/* eslint-disable no-console */
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { seedSchoolDefaults } = require('../src/services/onboardingService');
const { publishClassReports } = require('../src/services/reportService');

const PASSWORD = 'lookatme';
const DEMO_SLUG = 'adesuah-demo-school';

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const daysAgo = (n) => new Date(new Date().setHours(0, 0, 0, 0) - n * 86400000);

const hashAll = async (users) => {
  const hash = await bcrypt.hash(PASSWORD, 10);
  return users.map((u) => ({ ...u, password: hash }));
};

const wipe = async () => {
  const tables = [
    'auditlog', 'resultcorrection', 'staffattendance', 'notification', 'announcement',
    'payment', 'invoiceinstallment', 'invoiceitem', 'invoice', 'feestructure', 'feeitem',
    'reportcard', 'score', 'attendancerecord', 'enrollment', 'guardian', 'student',
    'classsubject', 'gradingscale', 'assessmenttype', 'schoolclass', 'subject', 'level',
    'term', 'academicyear', 'rolepermission', 'staffprofile', 'user', 'school',
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`);
  }
};

const seed = async () => {
  console.log('Wiping existing data…');
  await wipe();

  console.log('Creating school + defaults (levels, subjects, grading, permissions, terms)…');
  const school = await prisma.school.create({
    data: {
      name: 'Adesuah Demonstration School',
      slug: DEMO_SLUG,
      shortName: 'ADS',
      motto: 'Knowledge, Discipline, Success',
      address: '12 Palm Street, Airport Residential',
      city: 'Accra',
      region: 'Greater Accra',
      phone: '0302223344',
      email: 'info@adesuahdemo.edu.gh',
      gesRegNumber: 'GES-GA-0451',
      plan: 'STANDARD',
      subscriptionStatus: 'ACTIVE',
    },
  });
  await seedSchoolDefaults(school.id);

  console.log('Creating users (password: lookatme)…');
  const hash = await bcrypt.hash(PASSWORD, 10);
  const users = {};
  let staffCounter = 0;
  for (const u of [
    { key: 'platform', schoolId: null, name: 'Adesuah Platform Admin', email: 'admin@adesuah.demo', role: 'SUPER_ADMIN' },
    { key: 'owner', name: 'Kwame Mensah', email: 'proprietor@adesuah.demo', phone: '0244000001', role: 'OWNER', position: 'Proprietor' },
    { key: 'head', name: 'Akosua Boateng', email: 'head@adesuah.demo', phone: '0244000002', role: 'HEADTEACHER', position: 'Headteacher' },
    { key: 'deputy', name: 'Yaw Owusu Ansah', email: 'deputy@adesuah.demo', phone: '0244000003', role: 'DEPUTY_HEAD', position: 'Deputy Head (Discipline)' },
    { key: 'coordinator', name: 'Efua Hanson', email: 'coordinator@adesuah.demo', phone: '0244000004', role: 'ACADEMIC_COORDINATOR', position: 'Academic Coordinator' },
    { key: 'teacher1', name: 'Kofi Adjei', email: 'teacher1@adesuah.demo', phone: '0244000005', role: 'TEACHER', position: 'Class Teacher, JHS 1' },
    { key: 'teacher2', name: 'Ama Serwaa', email: 'teacher2@adesuah.demo', phone: '0244000006', role: 'TEACHER', position: 'Class Teacher, Primary 4' },
    { key: 'teacher3', name: 'Daniel Nkrumah', email: 'teacher3@adesuah.demo', phone: '0244000007', role: 'TEACHER', position: 'Subject Teacher (Computing, French)' },
    { key: 'bursar', name: 'Abena Owusuaa', email: 'bursar@adesuah.demo', phone: '0244000008', role: 'ACCOUNTANT', position: 'Bursar' },
    { key: 'secretary', name: 'Joyce Asantewaa', email: 'secretary@adesuah.demo', phone: '0244000009', role: 'SECRETARY', position: 'School Secretary' },
    { key: 'librarian', name: 'Isaac Boadu', email: 'librarian@adesuah.demo', phone: '0244000010', role: 'SUPPORT_STAFF', position: 'Librarian' },
    { key: 'parent', name: 'Madam Felicia Amankwah', email: 'parent@adesuah.demo', phone: '0244000011', role: 'PARENT' },
  ]) {
    users[u.key] = await prisma.user.create({
      data: {
        schoolId: u.schoolId !== undefined ? u.schoolId : school.id,
        name: u.name,
        email: u.email,
        phone: u.phone || null,
        password: hash,
        role: u.role,
        staffProfile: u.position
          ? { create: { schoolId: school.id, staffNo: `STF-${String((staffCounter += 1)).padStart(3, '0')}`, position: u.position } }
          : undefined,
      },
    });
  }

  const levels = await prisma.level.findMany({ where: { schoolId: school.id }, orderBy: { order: 'asc' } });
  const byName = (n) => levels.find((l) => l.name === n);
  const classes = await prisma.schoolClass.findMany({ where: { schoolId: school.id } });
  const classOf = (levelName) => classes.find((c) => c.levelId === byName(levelName).id);
  const [jhs1, jhs2, p4, p6] = [classOf('JHS 1'), classOf('JHS 2'), classOf('Primary 4'), classOf('Primary 6')];
  const year = await prisma.academicYear.findFirst({ where: { schoolId: school.id, isCurrent: true } });
  const term1 = await prisma.term.findFirst({ where: { schoolId: school.id, name: 'TERM_1' } });

  console.log('Assigning class teachers & subject teachers…');
  await prisma.schoolClass.update({ where: { id: jhs1.id }, data: { classTeacherId: users.teacher1.id } });
  await prisma.schoolClass.update({ where: { id: p4.id }, data: { classTeacherId: users.teacher2.id } });
  await prisma.schoolClass.update({ where: { id: jhs2.id }, data: { classTeacherId: users.head.id } });
  await prisma.schoolClass.update({ where: { id: p6.id }, data: { classTeacherId: users.coordinator.id } });

  const allSubjects = await prisma.subject.findMany({ where: { schoolId: school.id } });
  const subjectByCode = Object.fromEntries(allSubjects.map((s) => [s.code, s]));
  const classSubjects = await prisma.classSubject.findMany({
    where: { schoolId: school.id },
    include: { subject: { select: { code: true } } },
  });
  for (const cs of classSubjects) {
    let teacherId = null;
    if (cs.classId === jhs1.id) teacherId = cs.subject.code === 'MATH' ? users.teacher1.id : users.teacher3.id;
    if (cs.classId === p4.id) teacherId = users.teacher2.id;
    if (cs.classId === jhs2.id && cs.subject.code === 'MATH') teacherId = users.teacher1.id;
    await prisma.classSubject.update({
      where: { classId_subjectId: { classId: cs.classId, subjectId: cs.subjectId } },
      data: { teacherId },
    });
  }

  console.log('Enrolling pupils…');
  const firstNames = ['Ama', 'Kofi', 'Abena', 'Kwesi', 'Efua', 'Yaw', 'Adjoa', 'Kwabena', 'Akua', 'Nana', 'Esi', 'Kojo', 'Afia', 'Kweku', 'Abena'];
  const lastNames = ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Darko', 'Appiah', 'Agyeman', 'Osei', 'Tetteh', 'Amankwah'];
  let counter = 1;
  const createStudents = async (classId, count) => {
    const created = [];
    for (let i = 0; i < count; i++) {
      const gender = i % 2 === 0 ? 'FEMALE' : 'MALE';
      const firstName = firstNames[(i * 3 + counter) % firstNames.length];
      const lastName = lastNames[(i * 7 + counter) % lastNames.length];
      const student = await prisma.student.create({
        data: {
          schoolId: school.id,
          admissionNo: `ADM-2026-${String(counter).padStart(4, '0')}`,
          firstName,
          lastName,
          gender,
          dateOfBirth: new Date(2011 + (counter % 5), (counter * 5) % 12, ((counter * 7) % 27) + 1),
          status: 'ACTIVE',
          currentClassId: classId,
          guardians: {
            create: [
              {
                name: `${i % 2 === 0 ? 'Mr.' : 'Mrs.'} ${lastName}`,
                relationship: i % 2 === 0 ? 'FATHER' : 'MOTHER',
                phone: `0244${String(100000 + counter * 137).slice(0, 6)}`,
                isPrimary: true,
              },
            ],
          },
          enrollments: { create: { schoolId: school.id, classId, academicYearId: year.id } },
        },
      });
      created.push(student);
      counter += 1;
    }
    return created;
  };

  const jhs1Students = await createStudents(jhs1.id, 9);
  const p4Students = await createStudents(p4.id, 8);
  const jhs2Students = await createStudents(jhs2.id, 6);
  const p6Students = await createStudents(p6.id, 7);

  // The demo parent's two children (one in JHS 1, one in Primary 6)
  await prisma.guardian.updateMany({
    where: { studentId: jhs1Students[0].id },
    data: { name: 'Madam Felicia Amankwah', relationship: 'MOTHER', phone: '0244000011', userId: users.parent.id },
  });
  const p6Amankwah = await prisma.student.create({
    data: {
      schoolId: school.id,
      admissionNo: `ADM-2026-${String(counter).padStart(4, '0')}`,
      firstName: 'Nhyira',
      lastName: 'Amankwah',
      gender: 'FEMALE',
      dateOfBirth: new Date(2014, 3, 12),
      status: 'ACTIVE',
      currentClassId: p6.id,
      guardians: {
        create: { name: 'Madam Felicia Amankwah', relationship: 'MOTHER', phone: '0244000011', isPrimary: true, userId: users.parent.id },
      },
      enrollments: { create: { schoolId: school.id, classId: p6.id, academicYearId: year.id } },
    },
  });
  p6Students.push(p6Amankwah);
  counter += 1;

  console.log('Recording attendance (last 10 school days)…');
  const attendanceRows = [];
  const allStudents = [...jhs1Students, ...p4Students, ...jhs2Students, ...p6Students];
  for (let d = 1; d <= 12; d++) {
    if ([0, 6].includes(daysAgo(d).getDay())) continue;
    for (const s of allStudents) {
      const roll = rand(1, 100);
      const status = roll > 93 ? 'ABSENT' : roll > 88 ? 'LATE' : roll > 86 ? 'EXCUSED' : 'PRESENT';
      attendanceRows.push({
        schoolId: school.id,
        studentId: s.id,
        classId: s.currentClassId,
        date: daysAgo(d),
        status,
        markedById: users.head.id,
      });
    }
  }
  await prisma.attendanceRecord.createMany({ data: attendanceRows });

  console.log('Recording staff attendance…');
  const staffUsers = [users.owner, users.head, users.deputy, users.coordinator, users.teacher1, users.teacher2, users.teacher3, users.bursar, users.secretary, users.librarian];
  const staffRows = [];
  for (let d = 1; d <= 7; d++) {
    if ([0, 6].includes(daysAgo(d).getDay())) continue;
    for (const u of staffUsers) {
      const status = rand(1, 100) > 92 ? 'ABSENT' : rand(1, 100) > 88 ? 'LATE' : 'PRESENT';
      staffRows.push({ schoolId: school.id, userId: u.id, date: daysAgo(d), status, markedById: users.head.id });
    }
  }
  await prisma.staffAttendance.createMany({ data: staffRows });

  console.log('Entering scores & publishing report cards for JHS 1 and Primary 4…');
  const assessmentTypes = await prisma.assessmentType.findMany({ where: { schoolId: school.id } });
  const enterScores = async (classId, students, partial = false) => {
    const css = await prisma.classSubject.findMany({
      where: { schoolId: school.id, classId },
      include: { subject: true },
    });
    for (const s of students) {
      for (const cs of css) {
        for (const at of assessmentTypes) {
          if (partial && rand(1, 100) > 60) continue;
          const base = rand(45, 95);
          await prisma.score.create({
            data: {
              schoolId: school.id,
              studentId: s.id,
              subjectId: cs.subjectId,
              classId,
              termId: term1.id,
              assessmentTypeId: at.id,
              rawScore: Math.min(100, base + rand(-5, 5)),
              enteredById: users.teacher1.id,
            },
          });
        }
      }
    }
    return css.length;
  };

  await enterScores(jhs1.id, jhs1Students);
  await enterScores(p4.id, p4Students);
  await enterScores(jhs2.id, jhs2Students, true);
  await enterScores(p6.id, p6Students);

  const jhs1Report = await publishClassReports(school.id, jhs1.id, term1.id);
  const p4Report = await publishClassReports(school.id, p4.id, term1.id);
  console.log(`Published reports: JHS1 ${jhs1Report.published}, P4 ${p4Report.published}`);
  await prisma.reportCard.updateMany({
    where: { schoolId: school.id, classId: jhs1.id, termId: term1.id },
    data: { locked: true, lockedAt: new Date(), lockedById: users.head.id },
  });

  console.log('Creating a pending score correction (teacher → head)…');
  const mathCs = classSubjects.find((cs) => cs.classId === jhs1.id && cs.subject.code === 'MATH');
  const correctionStudent = jhs1Students[1];
  const ce = assessmentTypes.find((t) => t.shortCode === 'CE');
  const oldScore = await prisma.score.findFirst({
    where: { studentId: correctionStudent.id, subjectId: mathCs.subjectId, termId: term1.id, assessmentTypeId: ce.id },
  });
  if (oldScore) {
    await prisma.resultCorrection.create({
      data: {
        schoolId: school.id,
        studentId: correctionStudent.id,
        subjectId: mathCs.subjectId,
        termId: term1.id,
        assessmentTypeId: ce.id,
        oldScore: oldScore.rawScore,
        newScore: Math.min(100, oldScore.rawScore + 8),
        reason: 'Totalled the class exercise script wrongly — verified corrected total.',
        requestedById: users.teacher1.id,
      },
    });
  }

  console.log('Setting up fees: structures, invoices, instalments, payments…');
  const feeAmounts = { 'JHS 1': 650, 'JHS 2': 700, 'Primary 4': 500, 'Primary 6': 550 };
  for (const [levelName, classObj, students] of [
    ['JHS 1', jhs1, jhs1Students],
    ['JHS 2', jhs2, jhs2Students],
    ['Primary 4', p4, p4Students],
    ['Primary 6', p6, p6Students],
  ]) {
    const structure = await prisma.feeStructure.create({
      data: {
        schoolId: school.id,
        academicYearId: year.id,
        termId: term1.id,
        classId: classObj.id,
        name: `${levelName} Term 1 fees`,
        totalAmount: feeAmounts[levelName],
        items: {
          create: [
            { name: 'Tuition', amount: feeAmounts[levelName] * 0.7 },
            { name: 'Examination fee', amount: feeAmounts[levelName] * 0.15 },
            { name: 'PTA dues', amount: feeAmounts[levelName] * 0.15 },
          ],
        },
      },
      include: { items: true },
    });

    for (const [idx, s] of students.entries()) {
      const invoice = await prisma.invoice.create({
        data: {
          schoolId: school.id,
          studentId: s.id,
          termId: term1.id,
          structureId: structure.id,
          amountTotal: feeAmounts[levelName],
          dueDate: daysAgo(rand(-14, 20)),
          items: { create: structure.items.map((i) => ({ name: i.name, amount: i.amount })) },
        },
        include: { items: true, term: true },
      });

      if (idx % 4 === 0) {
        await prisma.invoiceInstallment.createMany({
          data: [
            { invoiceId: invoice.id, dueDate: daysAgo(10), amount: Math.round(feeAmounts[levelName] / 2), label: '1st instalment' },
            { invoiceId: invoice.id, dueDate: daysAgo(-20), amount: feeAmounts[levelName] - Math.round(feeAmounts[levelName] / 2), label: '2nd instalment' },
          ],
        });
      }

      const roll = idx % 3;
      if (roll === 0) {
        const created = await prisma.payment.create({
          data: {
            schoolId: school.id,
            invoiceId: invoice.id,
            amount: feeAmounts[levelName],
            method: pick(['CASH', 'MOMO', 'BANK']),
            reference: `PAY-${rand(10000, 99999)}`,
            recordedById: users.bursar.id,
            paidAt: daysAgo(rand(1, 20)),
          },
        });
        await prisma.payment.update({
          where: { id: created.id },
          data: { receiptNo: `RCPT-${String(school.id).padStart(4, '0')}-${String(created.id).padStart(6, '0')}` },
        });
        await prisma.invoice.update({ where: { id: invoice.id }, data: { amountPaid: feeAmounts[levelName], status: 'PAID' } });
      } else if (roll === 1) {
        const part = Math.round(feeAmounts[levelName] * 0.5);
        const created = await prisma.payment.create({
          data: {
            schoolId: school.id,
            invoiceId: invoice.id,
            amount: part,
            method: 'MOMO',
            reference: `MTN-${rand(100000, 999999)}`,
            recordedById: users.bursar.id,
            paidAt: daysAgo(rand(1, 15)),
          },
        });
        await prisma.payment.update({
          where: { id: created.id },
          data: { receiptNo: `RCPT-${String(school.id).padStart(4, '0')}-${String(created.id).padStart(6, '0')}` },
        });
        await prisma.invoice.update({ where: { id: invoice.id }, data: { amountPaid: part, status: 'PARTIAL' } });
      }
    }
  }

  console.log('Posting announcements…');
  await prisma.announcement.createMany({
    data: [
      {
        schoolId: school.id,
        authorId: users.head.id,
        title: 'PTA Meeting — Saturday 10 AM',
        body: 'Dear parents/guardians, our first PTA meeting of the term comes off this Saturday at 10:00 AM in the school hall. Matters arising: term fees, BECE preparation and the school bus project. Your attendance is highly encouraged.',
        audience: 'ALL',
        isPinned: true,
      },
      {
        schoolId: school.id,
        authorId: users.bursar.id,
        title: 'Term 1 fees — second instalment due',
        body: 'Parents are kindly reminded that the second instalment of Term 1 fees is due in two weeks. Kindly settle at the bursar\'s office or via mobile money. Receipts are issued for every payment.',
        audience: 'ALL',
      },
      {
        schoolId: school.id,
        authorId: users.head.id,
        title: 'JHS 2 extra classes begin Monday',
        body: 'Extra classes for JHS 2 pupils run Monday to Thursday, 2:00 PM to 3:30 PM, focusing on Mathematics and Integrated Science ahead of mocks.',
        audience: 'CLASS',
        classId: jhs2.id,
      },
      {
        schoolId: school.id,
        authorId: users.head.id,
        title: 'Staff briefing — Friday 3:30 PM',
        body: 'All staff to meet in the headteacher\'s office on Friday at 3:30 PM to review the mid-term assessment timeline.',
        audience: 'STAFF',
      },
    ],
  });

  console.log('Adding extra classes, assignments and salary records…');
  await prisma.extraClass.createMany({
    data: [
      {
        schoolId: school.id,
        title: 'Morning Extra — Maths & Integrated Science',
        classId: jhs1.id,
        subjectId: subjectByCode.MATH.id,
        teacherId: users.teacher1.id,
        days: 'Mon,Tue,Wed,Thu',
        startTime: '06:30',
        endTime: '07:30',
        venue: 'JHS Block',
        startDate: daysAgo(21),
        createdById: users.head.id,
      },
      {
        schoolId: school.id,
        title: 'Morning Extra — English Language',
        classId: p6.id,
        subjectId: subjectByCode.ENG.id,
        teacherId: users.coordinator.id,
        days: 'Tue,Thu',
        startTime: '06:45',
        endTime: '07:30',
        venue: 'Primary Block',
        startDate: daysAgo(14),
        createdById: users.head.id,
      },
      {
        schoolId: school.id,
        title: 'BECE Mock Revision (JHS 3)',
        classId: classes.find((c) => c.levelId === byName('JHS 3').id).id,
        subjectId: subjectByCode.ENG.id,
        teacherId: users.head.id,
        days: 'Fri',
        startTime: '14:00',
        endTime: '16:00',
        venue: 'JHS Block',
        startDate: daysAgo(30),
        status: 'PAUSED',
        notes: 'Paused until mock fees are settled.',
        createdById: users.head.id,
      },
    ],
  });

  await prisma.assignment.createMany({
    data: [
      {
        schoolId: school.id,
        classId: jhs1.id,
        subjectId: subjectByCode.MATH.id,
        teacherId: users.teacher1.id,
        termId: term1.id,
        title: 'Fractions exercise 4B',
        description: 'Complete exercise 4B, questions 1–15, in your exercise book. Show all working.',
        dueDate: daysAgo(-3),
        createdById: users.teacher1.id,
      },
      {
        schoolId: school.id,
        classId: jhs1.id,
        subjectId: subjectByCode.ENG.id,
        teacherId: users.teacher1.id,
        termId: term1.id,
        title: 'Comprehension: “The Clever Fisherman”',
        description: 'Answer questions 1–8 in your comprehension workbook.',
        dueDate: daysAgo(-5),
        createdById: users.teacher1.id,
      },
      {
        schoolId: school.id,
        classId: p4.id,
        subjectId: subjectByCode.ENG.id,
        teacherId: users.teacher2.id,
        termId: term1.id,
        title: 'Spelling list — Week 6',
        description: 'Learn the 20 spelling words for Friday\'s dictation.',
        dueDate: daysAgo(-2),
        createdById: users.teacher2.id,
      },
    ],
  });

  await prisma.salaryPayment.createMany({
    data: [
      { schoolId: school.id, userId: users.teacher1.id, period: '2026-09', amount: 1800, method: 'MOMO', reference: 'SAL-SEP-005', recordedById: users.bursar.id },
      { schoolId: school.id, userId: users.teacher1.id, period: '2026-10', amount: 1800, method: 'MOMO', reference: 'SAL-OCT-005', recordedById: users.bursar.id },
      { schoolId: school.id, userId: users.teacher2.id, period: '2026-09', amount: 1600, method: 'BANK', reference: 'SAL-SEP-006', recordedById: users.bursar.id },
      { schoolId: school.id, userId: users.teacher2.id, period: '2026-10', amount: 1600, method: 'BANK', reference: 'SAL-OCT-006', recordedById: users.bursar.id },
      { schoolId: school.id, userId: users.head.id, period: '2026-09', amount: 3200, method: 'BANK', reference: 'SAL-SEP-002', recordedById: users.bursar.id },
      { schoolId: school.id, userId: users.bursar.id, period: '2026-09', amount: 2200, method: 'BANK', reference: 'SAL-SEP-008', recordedById: users.owner.id },
    ],
  });

  const counts = {
    students: await prisma.student.count(),
    invoices: await prisma.invoice.count(),
    payments: await prisma.payment.count(),
    scores: await prisma.score.count(),
    attendance: await prisma.attendanceRecord.count(),
  };
  console.log('\nSeed complete — Adesuah Demonstration School ready.');
  console.log(`  Pupils: ${counts.students} · Invoices: ${counts.invoices} · Payments: ${counts.payments} · Scores: ${counts.scores} · Attendance rows: ${counts.attendance}`);
  console.log('\nALL LOGINS (password for every account: lookatme)\n');
  console.log('  PLATFORM SUPER-ADMIN  admin@adesuah.demo');
  console.log('  PROPRIETOR / OWNER    proprietor@adesuah.demo');
  console.log('  HEADTEACHER           head@adesuah.demo');
  console.log('  DEPUTY HEAD           deputy@adesuah.demo');
  console.log('  ACADEMIC COORDINATOR  coordinator@adesuah.demo');
  console.log('  TEACHER (JHS 1)       teacher1@adesuah.demo');
  console.log('  TEACHER (Primary 4)   teacher2@adesuah.demo');
  console.log('  TEACHER (Computing)   teacher3@adesuah.demo');
  console.log('  ACCOUNTANT / BURSAR   bursar@adesuah.demo');
  console.log('  SECRETARY             secretary@adesuah.demo');
  console.log('  LIBRARIAN (support)   librarian@adesuah.demo');
  console.log('  PARENT (2 children)   parent@adesuah.demo  → lands on the parent portal');
  console.log('\n  Phones also work as login identifiers (e.g. 0244000001).');
};

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
