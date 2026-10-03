const prisma = require('../config/db');
const { resolveSchoolId, resolveClassScope } = require('../middlewares/authMiddleware');
const permissionService = require('../services/permissionService');
const { CATALOG, ROLE_LABELS, normalizeRole, DEFAULT_ROLE_PERMISSIONS } = require('../utils/permissions');

const setDate = (v) => (v ? new Date(v) : undefined);

// ── Roles & permissions ──

const getPermissionMatrix = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const matrix = await permissionService.getSchoolPermissionMatrix(schoolId);
  res.json({
    catalog: CATALOG,
    matrix,
    roleLabels: ROLE_LABELS,
    defaults: DEFAULT_ROLE_PERMISSIONS,
  });
};

const setRolePerms = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const role = normalizeRole(req.params.role);
  if (!(role in DEFAULT_ROLE_PERMISSIONS)) {
    return res.status(400).json({ message: 'Unknown role' });
  }
  const permissions = await permissionService.setRolePermissions(schoolId, role, req.body.permissions);
  res.json({ role, permissions });
};

const resetRolePerms = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const role = normalizeRole(req.params.role);
  if (!(role in DEFAULT_ROLE_PERMISSIONS)) {
    return res.status(400).json({ message: 'Unknown role' });
  }
  const permissions = await permissionService.resetRolePermissions(schoolId, role);
  res.json({ role, permissions, message: `${ROLE_LABELS[role]} permissions reset to defaults` });
};

// ── Academic years ──

const listYears = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const years = await prisma.academicYear.findMany({
    where: { schoolId },
    orderBy: { startDate: 'desc' },
    include: { terms: { orderBy: { name: 'asc' } } },
  });
  res.json({ years });
};

const createYear = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const year = await prisma.academicYear.create({
    data: {
      schoolId,
      name: req.body.name,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    },
  });
  res.status(201).json({ year });
};

const updateYear = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const year = await prisma.academicYear.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(req.body.name ? { name: req.body.name } : {}),
      ...(req.body.startDate ? { startDate: new Date(req.body.startDate) } : {}),
      ...(req.body.endDate ? { endDate: new Date(req.body.endDate) } : {}),
    },
  });
  res.json({ year });
};

const setCurrentYear = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const id = Number(req.params.id);
  await prisma.$transaction([
    prisma.academicYear.updateMany({ where: { schoolId, isCurrent: true }, data: { isCurrent: false } }),
    prisma.academicYear.update({ where: { id }, data: { isCurrent: true } }),
  ]);
  res.json({ message: 'Current academic year updated' });
};

// ── Terms ──

const listTerms = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const terms = await prisma.term.findMany({
    where: {
      schoolId,
      ...(req.query.academicYearId ? { academicYearId: Number(req.query.academicYearId) } : {}),
    },
    orderBy: { startDate: 'asc' },
  });
  res.json({ terms });
};

const createTerm = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const year = req.body.academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: Number(req.body.academicYearId), schoolId } })
    : await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  if (!year) return res.status(400).json({ message: 'Create an academic year first' });

  const term = await prisma.term.create({
    data: {
      schoolId,
      academicYearId: year.id,
      name: req.body.name,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      vacationDate: setDate(req.body.vacationDate),
      nextTermBegins: setDate(req.body.nextTermBegins),
    },
  });
  res.status(201).json({ term });
};

const updateTerm = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const term = await prisma.term.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(req.body.startDate ? { startDate: new Date(req.body.startDate) } : {}),
      ...(req.body.endDate ? { endDate: new Date(req.body.endDate) } : {}),
      ...(req.body.vacationDate !== undefined ? { vacationDate: setDate(req.body.vacationDate) } : {}),
      ...(req.body.nextTermBegins !== undefined ? { nextTermBegins: setDate(req.body.nextTermBegins) } : {}),
    },
  });
  res.json({ term });
};

const setCurrentTerm = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const id = Number(req.params.id);
  const term = await prisma.term.findFirst({ where: { id, schoolId } });
  if (!term) return res.status(404).json({ message: 'Term not found' });
  await prisma.$transaction([
    prisma.term.updateMany({ where: { schoolId, isCurrent: true }, data: { isCurrent: false } }),
    prisma.term.update({ where: { id }, data: { isCurrent: true } }),
  ]);
  res.json({ message: 'Current term updated' });
};

// ── Levels ──

const listLevels = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const levels = await prisma.level.findMany({
    where: { schoolId },
    orderBy: { order: 'asc' },
    include: { classes: { orderBy: { name: 'asc' } } },
  });
  res.json({ levels });
};

const createLevel = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const level = await prisma.level.create({ data: { ...req.body, schoolId } });
  res.status(201).json({ level });
};

const updateLevel = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const level = await prisma.level.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(req.body.name ? { name: req.body.name } : {}),
      ...(req.body.stage ? { stage: req.body.stage } : {}),
      ...(req.body.order !== undefined ? { order: req.body.order } : {}),
    },
  });
  res.json({ level });
};

// ── Classes ──

const listClasses = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const classes = await prisma.schoolClass.findMany({
    where: {
      schoolId,
      ...(req.query.levelId ? { levelId: Number(req.query.levelId) } : {}),
    },
    orderBy: { id: 'asc' },
    include: {
      level: { select: { id: true, name: true, stage: true, order: true } },
      classTeacher: { select: { id: true, name: true } },
      _count: { select: { students: { where: { status: 'ACTIVE' } } } },
    },
  });
  res.json({ classes });
};

const createClass = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const level = await prisma.level.findFirst({ where: { id: req.body.levelId, schoolId } });
  if (!level) return res.status(400).json({ message: 'Level not found' });
  const klass = await prisma.schoolClass.create({
    data: {
      schoolId,
      levelId: req.body.levelId,
      name: req.body.name,
      capacity: req.body.capacity,
      classTeacherId: req.body.classTeacherId || null,
    },
    include: { level: true, classTeacher: { select: { id: true, name: true } } },
  });
  res.status(201).json({ class: klass });
};

const updateClass = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const klass = await prisma.schoolClass.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(req.body.name ? { name: req.body.name } : {}),
      ...(req.body.capacity !== undefined ? { capacity: req.body.capacity } : {}),
      ...(req.body.classTeacherId !== undefined ? { classTeacherId: req.body.classTeacherId || null } : {}),
    },
    include: { level: true, classTeacher: { select: { id: true, name: true } } },
  });
  res.json({ class: klass });
};

const classRoster = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const classScope = await resolveClassScope(req, schoolId);
  const classId = Number(req.params.id);
  if (classScope !== null && !classScope.includes(classId)) {
    return res.json({ students: [] });
  }
  const students = await prisma.student.findMany({
    where: {
      schoolId,
      currentClassId: classId,
      status: 'ACTIVE',
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true,
      admissionNo: true,
      firstName: true,
      lastName: true,
      otherNames: true,
      gender: true,
      status: true,
      photoUrl: true,
      dateOfBirth: true,
    },
  });
  res.json({ students });
};

// ── Subjects ──

const listSubjects = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { classSubjects: true } } },
  });
  res.json({ subjects });
};

const createSubject = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const subject = await prisma.subject.create({ data: { ...req.body, schoolId } });
  res.status(201).json({ subject });
};

const updateSubject = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const subject = await prisma.subject.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(req.body.name ? { name: req.body.name } : {}),
      ...(req.body.code !== undefined ? { code: req.body.code } : {}),
      ...(req.body.isCore !== undefined ? { isCore: req.body.isCore } : {}),
    },
  });
  res.json({ subject });
};

const deleteSubject = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const id = Number(req.params.id);
  const scoreCount = await prisma.score.count({ where: { subjectId: id, schoolId } });
  if (scoreCount > 0) {
    return res.status(400).json({ message: 'Cannot delete a subject that has scores recorded' });
  }
  await prisma.subject.delete({ where: { id } });
  res.json({ message: 'Subject deleted' });
};

// ── Class subjects (teacher allocation) ──

const listClassSubjects = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const classSubjects = await prisma.classSubject.findMany({
    where: {
      schoolId,
      ...(req.query.classId ? { classId: Number(req.query.classId) } : {}),
    },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      teacher: { select: { id: true, name: true } },
    },
    orderBy: { id: 'asc' },
  });
  res.json({ classSubjects });
};

const bulkSetClassSubjects = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { classId, subjects } = req.body;

  const klass = await prisma.schoolClass.findFirst({ where: { id: classId, schoolId } });
  if (!klass) return res.status(404).json({ message: 'Class not found' });

  await prisma.$transaction(async (tx) => {
    await tx.classSubject.deleteMany({ where: { schoolId, classId } });
    if (subjects.length > 0) {
      await tx.classSubject.createMany({
        data: subjects.map((s) => ({
          schoolId,
          classId,
          subjectId: s.subjectId,
          teacherId: s.teacherId || null,
        })),
      });
    }
  });

  const classSubjects = await prisma.classSubject.findMany({
    where: { schoolId, classId },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      teacher: { select: { id: true, name: true } },
    },
  });
  res.json({ classSubjects });
};

// ── Assessment types ──

const listAssessmentTypes = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const types = await prisma.assessmentType.findMany({ where: { schoolId }, orderBy: { order: 'asc' } });
  res.json({ assessmentTypes: types });
};

const createAssessmentType = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const type = await prisma.assessmentType.create({
    data: { ...req.body, schoolId, order: req.body.order || 0 },
  });
  res.status(201).json({ assessmentType: type });
};

const updateAssessmentType = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const type = await prisma.assessmentType.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(req.body.name ? { name: req.body.name } : {}),
      ...(req.body.shortCode !== undefined ? { shortCode: req.body.shortCode } : {}),
      ...(req.body.weight !== undefined ? { weight: req.body.weight } : {}),
      ...(req.body.order !== undefined ? { order: req.body.order } : {}),
    },
  });
  res.json({ assessmentType: type });
};

const deleteAssessmentType = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const id = Number(req.params.id);
  const scoreCount = await prisma.score.count({ where: { assessmentTypeId: id, schoolId } });
  if (scoreCount > 0) {
    return res.status(400).json({ message: 'Cannot delete an assessment type that has scores' });
  }
  await prisma.assessmentType.delete({ where: { id } });
  res.json({ message: 'Assessment type deleted' });
};

// ── Grading scales ──

const listGradingScales = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const scales = await prisma.gradingScale.findMany({
    where: { schoolId },
    orderBy: [{ levelId: 'asc' }, { order: 'asc' }],
    include: { level: { select: { id: true, name: true } } },
  });
  res.json({ gradingScales: scales });
};

const setGradingScale = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { levelId, grades } = req.body;

  if (levelId) {
    const level = await prisma.level.findFirst({ where: { id: levelId, schoolId } });
    if (!level) return res.status(400).json({ message: 'Level not found' });
  }

  const ordered = grades
    .slice()
    .sort((a, b) => b.maxScore - a.maxScore)
    .map((g, i) => ({ ...g, order: i + 1 }));

  await prisma.$transaction(async (tx) => {
    await tx.gradingScale.deleteMany({
      where: { schoolId, levelId: levelId || null },
    });
    await tx.gradingScale.createMany({
      data: ordered.map((g) => ({
        schoolId,
        levelId: levelId || null,
        grade: g.grade,
        minScore: g.minScore,
        maxScore: g.maxScore,
        descriptor: g.descriptor,
        remark: g.remark,
        order: g.order,
      })),
    });
  });

  const scales = await prisma.gradingScale.findMany({
    where: { schoolId, levelId: levelId || null },
    orderBy: { order: 'asc' },
  });
  res.json({ gradingScales: scales });
};

module.exports = {
  getPermissionMatrix,
  setRolePerms,
  resetRolePerms,
  listYears,
  createYear,
  updateYear,
  setCurrentYear,
  listTerms,
  createTerm,
  updateTerm,
  setCurrentTerm,
  listLevels,
  createLevel,
  updateLevel,
  listClasses,
  createClass,
  updateClass,
  classRoster,
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  listClassSubjects,
  bulkSetClassSubjects,
  listAssessmentTypes,
  createAssessmentType,
  updateAssessmentType,
  deleteAssessmentType,
  listGradingScales,
  setGradingScale,
};
