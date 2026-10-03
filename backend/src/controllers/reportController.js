const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const { computeClassResults, publishClassReports } = require('../services/reportService');

const publishReports = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { classId, termId } = req.body;
  const { published } = await publishClassReports(schoolId, classId, termId);
  res.json({ message: `Published ${published} report cards`, published });
};

const getStudentReport = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const studentId = Number(req.params.studentId);
  const termId = Number(req.query.termId);
  if (!termId) return res.status(400).json({ message: 'termId is required' });

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      currentClass: { include: { level: true } },
      guardians: { select: { name: true, relationship: true, phone: true } },
    },
  });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const term = await prisma.term.findFirst({
    where: { id: termId, schoolId },
    include: { academicYear: { select: { name: true } } },
  });

  const reportCard = await prisma.reportCard.findUnique({
    where: { studentId_termId: { studentId, termId } },
  });

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      name: true,
      shortName: true,
      logoUrl: true,
      motto: true,
      address: true,
      city: true,
      region: true,
      phone: true,
      gesRegNumber: true,
    },
  });

  let computed = null;
  if (!reportCard || !reportCard.published) {
    computed = await computeClassResults(schoolId, student.currentClassId || 0, termId);
  }

  res.json({
    school,
    term: term ? { ...term, academicYear: term.academicYear?.name } : null,
    student,
    reportCard,
    preview: computed
      ? computed.students.find((s) => s.studentId === studentId) || null
      : null,
  });
};

const getClassReports = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const classId = Number(req.query.classId);
  const termId = Number(req.query.termId);
  if (!classId || !termId) {
    return res.status(400).json({ message: 'classId and termId are required' });
  }

  const reportCards = await prisma.reportCard.findMany({
    where: { schoolId, classId, termId },
    include: {
      student: {
        select: { id: true, admissionNo: true, firstName: true, lastName: true, otherNames: true },
      },
    },
    orderBy: { classPosition: 'asc' },
  });

  res.json({ reportCards });
};

const getBroadsheet = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const classId = Number(req.query.classId);
  const termId = Number(req.query.termId);
  if (!classId || !termId) {
    return res.status(400).json({ message: 'classId and termId are required' });
  }
  const results = await computeClassResults(schoolId, classId, termId);

  const subjects = results.students[0]?.subjects.map((s) => ({
    subjectId: s.subjectId,
    subject: s.subject,
    code: s.code,
  })) || [];

  res.json({
    class: results.class,
    term: results.term,
    subjects,
    rows: results.students.map((student) => ({
      studentId: student.studentId,
      name: student.name,
      admissionNo: student.admissionNo,
      scores: Object.fromEntries(
        student.subjects.map((s) => [s.subjectId, s.total])
      ),
      total: student.totalScore,
      average: student.average,
      position: student.position,
      positionLabel: student.positionLabel,
    })),
  });
};

const updateRemarks = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const reportCard = await prisma.reportCard.findFirst({
    where: { id: Number(req.params.id), schoolId },
  });
  if (!reportCard) return res.status(404).json({ message: 'Report card not found' });

  const updated = await prisma.reportCard.update({
    where: { id: reportCard.id },
    data: {
      ...(req.body.teacherRemark !== undefined ? { teacherRemark: req.body.teacherRemark } : {}),
      ...(req.body.headRemark !== undefined ? { headRemark: req.body.headRemark } : {}),
      ...(req.body.conduct !== undefined ? { conduct: req.body.conduct } : {}),
      ...(req.body.interest !== undefined ? { interest: req.body.interest } : {}),
      ...(req.body.talent !== undefined ? { talent: req.body.talent } : {}),
      ...(req.body.promoted !== undefined ? { promoted: req.body.promoted } : {}),
      ...(req.body.promotedTo !== undefined ? { promotedTo: req.body.promotedTo } : {}),
    },
  });
  res.json({ reportCard: updated });
};

module.exports = { publishReports, getStudentReport, getClassReports, getBroadsheet, updateRemarks };
