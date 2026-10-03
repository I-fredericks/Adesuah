const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const { computeClassResults } = require('../services/reportService');

const getScoreSheet = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const classId = Number(req.query.classId);
  const subjectId = Number(req.query.subjectId);
  const termId = Number(req.query.termId);
  if (!classId || !subjectId || !termId) {
    return res.status(400).json({ message: 'classId, subjectId and termId are required' });
  }

  const [students, assessmentTypes, existingScores, classSubjects] = await Promise.all([
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
  ]);

  const key = (sid, atid) => `${sid}:${atid}`;
  const scoreMap = new Map(existingScores.map((s) => [key(s.studentId, s.assessmentTypeId), s.rawScore]));

  res.json({
    classId,
    subjectId,
    termId,
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
  const results = await computeClassResults(schoolId, classId, termId);
  res.json(results);
};

module.exports = { getScoreSheet, saveScores, getComputedResults };
