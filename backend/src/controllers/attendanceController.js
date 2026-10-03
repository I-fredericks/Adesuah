const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');

const parseDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    const err = new Error('Invalid date format, use YYYY-MM-DD');
    err.status = 400;
    throw err;
  }
  return d;
};

const markAttendance = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { classId, date, records } = req.body;
  const day = parseDate(date);

  const klass = await prisma.schoolClass.findFirst({ where: { id: classId, schoolId } });
  if (!klass) return res.status(404).json({ message: 'Class not found' });

  await prisma.$transaction(
    records.map((r) =>
      prisma.attendanceRecord.upsert({
        where: { studentId_date: { studentId: r.studentId, date: day } },
        create: {
          schoolId,
          studentId: r.studentId,
          classId,
          date: day,
          status: r.status,
          reason: r.reason,
          markedById: req.user.id,
        },
        update: {
          status: r.status,
          reason: r.reason,
          classId,
          markedById: req.user.id,
        },
      })
    )
  );

  res.json({ message: `Attendance saved for ${records.length} students`, count: records.length });
};

const getRegister = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const classId = Number(req.query.classId);
  if (!classId || !req.query.date) {
    return res.status(400).json({ message: 'classId and date are required' });
  }
  const day = parseDate(String(req.query.date));

  const [students, records] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, currentClassId: classId, status: 'ACTIVE' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, admissionNo: true, firstName: true, lastName: true, gender: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { schoolId, classId, date: day },
      select: { studentId: true, status: true, reason: true },
    }),
  ]);

  const byStudent = new Map(records.map((r) => [r.studentId, r]));

  res.json({
    date: req.query.date,
    students: students.map((s) => ({
      ...s,
      attendance: byStudent.get(s.id) || null,
    })),
  });
};

const attendanceStats = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const classId = req.query.classId ? Number(req.query.classId) : undefined;
  const from = req.query.from ? parseDate(String(req.query.from)) : undefined;
  const to = req.query.to ? parseDate(String(req.query.to)) : undefined;

  const where = {
    schoolId,
    ...(classId ? { classId } : {}),
    ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [byStatus, byDate] = await Promise.all([
    prisma.attendanceRecord.groupBy({ by: ['status'], where, _count: true }),
    prisma.attendanceRecord.groupBy({
      by: ['date'],
      where,
      _count: { _all: true },
      orderBy: { date: 'desc' },
      take: 60,
    }),
  ]);

  res.json({
    totals: byStatus.reduce((acc, row) => ({ ...acc, [row.status]: row._count }), {}),
    recentDays: byDate.map((d) => ({ date: d.date, marked: d._count._all })),
  });
};

module.exports = { markAttendance, getRegister, attendanceStats };
