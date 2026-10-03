const prisma = require('../config/db');
const { resolveSchoolId, assertClassAccess } = require('../middlewares/authMiddleware');
const { computeClassResults } = require('../services/reportService');
const { hasPermission } = require('../utils/permissions');
const { audit } = require('../services/auditService');

// Locked report cards for a class+term block direct score edits; changes go
// through the correction workflow instead.
const getLockedClassTerm = async (schoolId, classId, termId) => {
  const locked = await prisma.reportCard.findFirst({
    where: { schoolId, classId, termId, locked: true },
    select: { id: true },
  });
  return !!locked;
};

const resolveGradeScope = async (req, schoolId) => {
  if (req.user.role === 'SUPER_ADMIN') return null;
  if (!req._permissions) {
    const permissionService = require('../services/permissionService');
    req._permissions = await permissionService.getUserPermissions(req.user);
  }
  if (hasPermission(req._permissions || [], 'grades.view_all')) return null;
  return require('../services/permissionService').teacherAssignedClassIds(schoolId, req.user.id);
};

const getScoreSheet = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const classId = Number(req.query.classId);
  const subjectId = Number(req.query.subjectId);
  const termId = Number(req.query.termId);
  if (!classId || !subjectId || !termId) {
    return res.status(400).json({ message: 'classId, subjectId and termId are required' });
  }
  await assertClassAccess(req, schoolId, classId);

  const [students, assessmentTypes, existingScores, classSubjects, locked] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, currentClassId: classId, status: 'ACTIVE' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, admissionNo: true, firstName: true, lastName: true },
    }),
    prisma.assessmentType.findMany({ where: { schoolId }, orderBy: { order: 'asc' } }),
    prisma.score.findMany({
      where: { schoolId, classId, subjectId, termId },
      select: { studentId: true, assessmentTypeId: true, rawScore: true },
    }),
    prisma.classSubject.findFirst({
      where: { schoolId, classId, subjectId },
      include: { teacher: { select: { id: true, name: true } } },
    }),
    getLockedClassTerm(schoolId, classId, termId),
  ]);

  const key = (sid, atid) => `${sid}:${atid}`;
  const scoreMap = new Map(existingScores.map((s) => [key(s.studentId, s.assessmentTypeId), s.rawScore]));

  res.json({
    classId,
    subjectId,
    termId,
    locked,
    subject: classSubjects?.subject || null,
    teacher: classSubjects?.teacher || null,
    assessmentTypes,
    students: students.map((s) => ({
      ...s,
      scores: Object.fromEntries(assessmentTypes.map((t) => [t.id, scoreMap.get(key(s.id, t.id)) ?? null])),
    })),
  });
};

const saveScores = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { classId, subjectId, termId, entries } = req.body;

  const [klass, subject, term] = await Promise.all([
    prisma.schoolClass.findFirst({ where: { id: classId, schoolId } }),
    prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
    prisma.term.findFirst({ where: { id: termId, schoolId } }),
  ]);
  if (!klass || !subject || !term) {
    return res.status(404).json({ message: 'Invalid class, subject or term' });
  }

  const validEntries = entries.filter((e) => e.rawScore !== null && e.rawScore !== undefined);

  await assertClassAccess(req, schoolId, classId);

  if (await getLockedClassTerm(schoolId, classId, termId)) {
    const err = new Error(
      'Results for this class and term are locked. Submit a correction request instead.'
    );
    err.status = 423;
    throw err;
  }

  // Subject teachers may only edit marks for subjects actually assigned to them
  // unless they hold grades.edit_any (headteacher, coordinator, proprietor).
  if (!hasPermission(req._permissions || [], 'grades.edit_any') && req.user.role !== 'SUPER_ADMIN') {
    const assignment = await prisma.classSubject.findFirst({
      where: { schoolId, classId, subjectId, teacherId: req.user.id },
    });
    if (!assignment) {
      const err = new Error('This subject is not assigned to you');
      err.status = 403;
      throw err;
    }
  }

  // Audit trail: record every change to an existing score (before → after)
  // with subject/class/student context so heads can see who changed what, when.
  const [subjectRow, classRow] = await Promise.all([
    prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } }),
    prisma.schoolClass.findUnique({ where: { id: classId }, select: { name: true } }),
  ]);
  const changedStudentIds = [
    ...new Set(
      entries
        .filter((e) => e.rawScore !== null && e.rawScore !== undefined)
        .map((e) => e.studentId)
    ),
  ];
  const studentRows = await prisma.student.findMany({
    where: { id: { in: changedStudentIds } },
    select: { id: true, firstName: true, lastName: true, admissionNo: true },
  });
  const studentName = (id) => {
    const s = studentRows.find((x) => x.id === id);
    return s ? `${s.firstName} ${s.lastName} (${s.admissionNo})` : `student #${id}`;
  };

  for (const e of entries) {
    if (e.rawScore === null || e.rawScore === undefined) continue;
    const existing = await prisma.score.findUnique({
      where: {
        studentId_subjectId_termId_assessmentTypeId: {
          studentId: e.studentId,
          subjectId,
          termId,
          assessmentTypeId: e.assessmentTypeId,
        },
      },
      select: { id: true, rawScore: true },
    });
    if (existing && existing.rawScore !== e.rawScore) {
      audit({
        schoolId,
        userId: req.user.id,
        action: 'SCORE_EDIT',
        entity: 'score',
        entityId: existing.id,
        before: { subject: subjectRow?.name, className: classRow?.name, student: studentName(e.studentId), rawScore: existing.rawScore },
        after: { subject: subjectRow?.name, className: classRow?.name, student: studentName(e.studentId), rawScore: e.rawScore },
      });
    }
  }

  await prisma.$transaction(
    entries.map((e) => {
      const where = {
        studentId_subjectId_termId_assessmentTypeId: {
          studentId: e.studentId,
          subjectId,
          termId,
          assessmentTypeId: e.assessmentTypeId,
        },
      };
      if (e.rawScore === null || e.rawScore === undefined) {
        return prisma.score.deleteMany({
          where: {
            studentId: e.studentId,
            subjectId,
            termId,
            assessmentTypeId: e.assessmentTypeId,
          },
        });
      }
      return prisma.score.upsert({
        where,
        create: {
          schoolId,
          studentId: e.studentId,
          subjectId,
          classId,
          termId,
          assessmentTypeId: e.assessmentTypeId,
          rawScore: e.rawScore,
          enteredById: req.user.id,
        },
        update: { rawScore: e.rawScore, enteredById: req.user.id, classId },
      });
    })
  );

  res.json({ message: `Saved ${validEntries.length} scores` });
};

const getComputedResults = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const classId = Number(req.query.classId);
  const termId = Number(req.query.termId);
  if (!classId || !termId) {
    return res.status(400).json({ message: 'classId and termId are required' });
  }
  const scope = await resolveGradeScope(req, schoolId);
  if (scope !== null && !scope.includes(classId)) {
    return res.status(403).json({ message: 'You are not assigned to this class' });
  }
  const results = await computeClassResults(schoolId, classId, termId);
  res.json(results);
};

module.exports = { getScoreSheet, saveScores, getComputedResults };
