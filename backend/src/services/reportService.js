const prisma = require('../config/db');
const {
  weightedSubjectTotal,
  gradeFrom,
  competitionRanks,
  ordinalSuffix,
  round2,
  teacherRemarkFromAverage,
  headRemarkFromAverage,
} = require('../utils/grading');

const computeClassResults = async (schoolId, classId, termId) => {
  const [klass, term, classSubjects, assessmentTypes, students] = await Promise.all([
    prisma.schoolClass.findFirst({
      where: { id: classId, schoolId },
      include: { level: true },
    }),
    prisma.term.findFirst({ where: { id: termId, schoolId } }),
    prisma.classSubject.findMany({
      where: { classId, schoolId },
      include: { subject: true },
      orderBy: { id: 'asc' },
    }),
    prisma.assessmentType.findMany({ where: { schoolId }, orderBy: { order: 'asc' } }),
    prisma.student.findMany({
      where: { schoolId, currentClassId: classId, status: 'ACTIVE' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, otherNames: true, admissionNo: true },
    }),
  ]);

  if (!klass) {
    const err = new Error('Class not found');
    err.status = 404;
    throw err;
  }
  if (!term) {
    const err = new Error('Term not found');
    err.status = 404;
    throw err;
  }

  const [scores, gradingScales, levelScales, attendance] = await Promise.all([
    prisma.score.findMany({
      where: { schoolId, classId, termId },
      select: {
        studentId: true,
        subjectId: true,
        assessmentTypeId: true,
        rawScore: true,
      },
    }),
    prisma.gradingScale.findMany({ where: { schoolId, levelId: null } }),
    prisma.gradingScale.findMany({ where: { schoolId, levelId: klass.levelId } }),
    prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        classId,
        date: { gte: term.startDate, lte: term.endDate },
      },
      select: { studentId: true, date: true, status: true },
    }),
  ]);

  const scales = levelScales.length > 0 ? levelScales : gradingScales;

  const scoresByStudentSubject = new Map();
  for (const s of scores) {
    const key = `${s.studentId}:${s.subjectId}`;
    if (!scoresByStudentSubject.has(key)) scoresByStudentSubject.set(key, []);
    scoresByStudentSubject.get(key).push(s);
  }

  const attendanceByStudent = new Map();
  const openDates = new Set();
  for (const a of attendance) {
    openDates.add(new Date(a.date).toISOString().slice(0, 10));
    if (!attendanceByStudent.has(a.studentId)) attendanceByStudent.set(a.studentId, { present: 0, absent: 0, late: 0, excused: 0 });
    const bucket = attendanceByStudent.get(a.studentId);
    if (a.status === 'PRESENT' || a.status === 'LATE') bucket.present += 1;
    else if (a.status === 'ABSENT') bucket.absent += 1;
    else if (a.status === 'EXCUSED') bucket.excused += 1;
    if (a.status === 'LATE') bucket.late += 1;
  }

  const subjectMeta = classSubjects.map((cs) => ({
    subjectId: cs.subjectId,
    name: cs.subject.name,
    code: cs.subject.code,
  }));

  const studentResults = students.map((student) => {
    const subjects = subjectMeta.map((meta) => {
      const entries = scoresByStudentSubject.get(`${student.id}:${meta.subjectId}`) || [];
      const total = weightedSubjectTotal(entries, assessmentTypes);
      const gradeInfo = total !== null ? gradeFrom(total, scales) : null;
      return {
        subjectId: meta.subjectId,
        subject: meta.name,
        code: meta.code,
        total,
        grade: gradeInfo?.grade || null,
        descriptor: gradeInfo?.descriptor || null,
        remark: gradeInfo?.remark || null,
        position: null,
      };
    });

    const examined = subjects.filter((s) => s.total !== null);
    const totalScore = round2(examined.reduce((sum, s) => sum + s.total, 0));
    const average = examined.length > 0 ? round2(totalScore / examined.length) : null;
    const att = attendanceByStudent.get(student.id) || { present: 0, absent: 0, late: 0, excused: 0 };

    return {
      studentId: student.id,
      name: `${student.lastName} ${student.firstName}${student.otherNames ? ' ' + student.otherNames : ''}`,
      admissionNo: student.admissionNo,
      subjects,
      subjectsExamined: examined.length,
      totalScore,
      average,
      position: null,
      positionLabel: '',
      daysPresent: att.present,
      daysAbsent: att.absent,
      daysLate: att.late,
      daysExcused: att.excused,
      daysOpened: openDates.size,
      teacherRemark: teacherRemarkFromAverage(average),
      headRemark: headRemarkFromAverage(average),
    };
  });

  const classRanks = competitionRanks(studentResults.map((r) => (r.subjectsExamined > 0 ? r.totalScore : null)));
  classRanks.forEach((rank, i) => {
    if (rank !== null) {
      studentResults[i].position = rank;
      studentResults[i].positionLabel = ordinalSuffix(rank);
    }
  });

  for (const meta of subjectMeta) {
    const subjectRanks = competitionRanks(
      studentResults.map((r) => r.subjects.find((s) => s.subjectId === meta.subjectId)?.total ?? null)
    );
    subjectRanks.forEach((rank, i) => {
      if (rank !== null) {
        studentResults[i].subjects.find((s) => s.subjectId === meta.subjectId).position = rank;
      }
    });
  }

  studentResults.sort((a, b) => (a.position || 99999) - (b.position || 99999));

  return {
    class: { id: klass.id, name: klass.name, level: klass.level.name },
    term: {
      id: term.id,
      name: term.name,
      startDate: term.startDate,
      endDate: term.endDate,
      vacationDate: term.vacationDate,
      nextTermBegins: term.nextTermBegins,
    },
    students: studentResults,
  };
};

const publishClassReports = async (schoolId, classId, termId, overrides = new Map()) => {
  const results = await computeClassResults(schoolId, classId, termId);
  let published = 0;

  for (const student of results.students) {
    if (student.subjectsExamined === 0) continue;
    const ov = overrides.get(student.studentId) || {};
    const existing = await prisma.reportCard.findUnique({
      where: { studentId_termId: { studentId: student.studentId, termId } },
      select: { teacherRemark: true, headRemark: true, conduct: true, interest: true, talent: true },
    });

    await prisma.reportCard.upsert({
      where: { studentId_termId: { studentId: student.studentId, termId } },
      create: {
        schoolId,
        studentId: student.studentId,
        classId,
        termId,
        totalScore: student.totalScore,
        average: student.average,
        classPosition: student.position,
        subjectsCount: student.subjectsExamined,
        daysPresent: student.daysPresent,
        daysOpened: student.daysOpened,
        subjects: student.subjects,
        teacherRemark: ov.teacherRemark ?? existing?.teacherRemark ?? student.teacherRemark,
        headRemark: ov.headRemark ?? existing?.headRemark ?? student.headRemark,
        conduct: ov.conduct ?? existing?.conduct ?? null,
        interest: ov.interest ?? existing?.interest ?? null,
        talent: ov.talent ?? existing?.talent ?? null,
        published: true,
        publishedAt: new Date(),
      },
      update: {
        classId,
        totalScore: student.totalScore,
        average: student.average,
        classPosition: student.position,
        subjectsCount: student.subjectsExamined,
        daysPresent: student.daysPresent,
        daysOpened: student.daysOpened,
        subjects: student.subjects,
        teacherRemark: ov.teacherRemark ?? existing?.teacherRemark ?? student.teacherRemark,
        headRemark: ov.headRemark ?? existing?.headRemark ?? student.headRemark,
        conduct: ov.conduct ?? existing?.conduct ?? null,
        interest: ov.interest ?? existing?.interest ?? null,
        talent: ov.talent ?? existing?.talent ?? null,
        published: true,
        publishedAt: new Date(),
      },
    });
    published += 1;
  }

  return { published, results };
};

module.exports = { computeClassResults, publishClassReports };
