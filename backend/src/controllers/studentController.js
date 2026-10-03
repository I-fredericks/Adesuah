const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const { transferStudent } = require('../services/promotionService');

const admissionNoFor = async (schoolId) => {
  const count = await prisma.student.count({ where: { schoolId } });
  const year = new Date().getFullYear();
  return `ADM-${year}-${String(count + 1).padStart(4, '0')}`;
};

const studentSelect = {
  id: true,
  admissionNo: true,
  firstName: true,
  lastName: true,
  otherNames: true,
  gender: true,
  dateOfBirth: true,
  photoUrl: true,
  address: true,
  healthNotes: true,
  status: true,
  enrolledAt: true,
  currentClassId: true,
  currentClass: { select: { id: true, name: true, level: { select: { name: true } } } },
  guardians: true,
};

const listStudents = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 25);
  const search = req.query.search?.trim();
  const classId = req.query.classId ? Number(req.query.classId) : undefined;
  const status = req.query.status || undefined;

  const where = {
    schoolId,
    ...(classId ? { currentClassId: classId } : {}),
    ...(status ? { status } : { status: { not: 'WITHDRAWN' } }),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { otherNames: { contains: search, mode: 'insensitive' } },
            { admissionNo: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      select: studentSelect,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({ students, total, page, pages: Math.ceil(total / limit) || 1 });
};

const getStudent = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const student = await prisma.student.findFirst({
    where: { id: Number(req.params.id), schoolId },
    include: {
      currentClass: { include: { level: true } },
      guardians: true,
      enrollments: {
        include: { class: { include: { level: true } }, academicYear: true },
        orderBy: { createdAt: 'desc' },
      },
      invoices: {
        include: { term: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
      },
    },
  });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const [attendanceAgg, scoresCount] = await Promise.all([
    prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { studentId: student.id },
      _count: true,
    }),
    prisma.score.count({ where: { studentId: student.id } }),
  ]);

  res.json({
    student,
    attendance: attendanceAgg.reduce((acc, row) => ({ ...acc, [row.status]: row._count }), {}),
    scoresRecorded: scoresCount,
  });
};

const createStudent = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { guardians, classId, dateOfBirth, ...rest } = req.body;

  const klass = await prisma.schoolClass.findFirst({ where: { id: classId, schoolId } });
  if (!klass) return res.status(400).json({ message: 'Class not found' });

  const currentYear = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });

  const admissionNo = await admissionNoFor(schoolId);

  const student = await prisma.student.create({
    data: {
      ...rest,
      schoolId,
      admissionNo,
      currentClassId: classId,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      guardians: {
        create: guardians.map((g, i) => ({
          name: g.name,
          relationship: g.relationship || 'GUARDIAN',
          phone: g.phone,
          whatsapp: g.whatsapp,
          email: g.email || null,
          occupation: g.occupation,
          isPrimary: g.isPrimary ?? i === 0,
        })),
      },
      enrollments: currentYear
        ? { create: { schoolId, classId, academicYearId: currentYear.id } }
        : undefined,
    },
    include: { guardians: true, currentClass: true },
  });

  res.status(201).json({ student });
};

const updateStudent = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { guardians, classId, dateOfBirth, currentClassId, ...rest } = req.body;

  const student = await prisma.student.update({
    where: { id: Number(req.params.id) },
    data: {
      ...rest,
      ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}),
    },
    include: { guardians: true, currentClass: { include: { level: true } } },
  });

  if (currentClassId !== undefined && currentClassId !== null && currentClassId !== student.currentClassId) {
    await transferStudent(schoolId, student.id, currentClassId);
  }

  res.json({ student });
};

const addGuardian = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const student = await prisma.student.findFirst({
    where: { id: Number(req.params.id), schoolId },
    select: { id: true },
  });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const guardian = await prisma.guardian.create({
    data: { ...req.body, studentId: student.id, email: req.body.email || null },
  });
  res.status(201).json({ guardian });
};

const updateGuardian = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const guardian = await prisma.guardian.findFirst({
    where: { id: Number(req.params.guardianId), student: { schoolId } },
  });
  if (!guardian) return res.status(404).json({ message: 'Guardian not found' });

  const updated = await prisma.guardian.update({
    where: { id: guardian.id },
    data: { ...req.body, email: req.body.email || null },
  });
  res.json({ guardian: updated });
};

const deleteGuardian = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const guardian = await prisma.guardian.findFirst({
    where: { id: Number(req.params.guardianId), student: { schoolId } },
  });
  if (!guardian) return res.status(404).json({ message: 'Guardian not found' });
  await prisma.guardian.delete({ where: { id: guardian.id } });
  res.json({ message: 'Guardian removed' });
};

const setStudentStatus = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { status } = req.body;
  const student = await prisma.student.update({
    where: { id: Number(req.params.id) },
    data: {
      status,
      ...(status === 'GRADUATED' || status === 'WITHDRAWN' ? { currentClassId: null } : {}),
    },
    include: { currentClass: true },
  });
  res.json({ student });
};

const transferClass = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const student = await transferStudent(schoolId, Number(req.params.id), Number(req.body.classId));
  res.json({ student });
};

const promoteClass = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { promoteClass } = require('../services/promotionService');
  const summary = await promoteClass(schoolId, req.body);
  res.json({ summary });
};

module.exports = {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  addGuardian,
  updateGuardian,
  deleteGuardian,
  setStudentStatus,
  transferClass,
  promoteClass,
};
