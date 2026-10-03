const prisma = require('../config/db');
const { resolveSchoolId, assertClassAccess } = require('../middlewares/authMiddleware');
const { sendSms } = require('../services/smsService');
const { notifyUsers } = require('../services/notificationService');

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
  await assertClassAccess(req, schoolId, classId);

  const before = await prisma.attendanceRecord.findMany({
    where: { schoolId, classId, date: day },
    select: { studentId: true, status: true },
  });
  const beforeByStudent = new Map(before.map((r) => [r.studentId, r.status]));

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

  // Absence alerts: notify guardians of pupils newly marked ABSENT (not for
  // repeated saves of an already-absent pupil). Silent on SMS misconfig.
  const newlyAbsent = records.filter(
    (r) => r.status === 'ABSENT' && beforeByStudent.get(r.studentId) !== 'ABSENT'
  );
  if (newlyAbsent.length > 0) {
    const absentStudents = await prisma.student.findMany({
      where: { schoolId, id: { in: newlyAbsent.map((r) => r.studentId) } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentClass: { select: { name: true } },
        guardians: { select: { phone: true, userId: true } },
      },
    });

    for (const student of absentStudents) {
      const message = `Attendance notice: ${student.firstName} ${student.lastName} (${student.currentClass?.name || 'school'}) was marked ABSENT today, ${date}. If this is unexpected please contact the school.`;
      sendSms(student.guardians.map((g) => g.phone), message);
      const guardianUsers = student.guardians.filter((g) => g.userId).map((g) => g.userId);
      if (guardianUsers.length > 0) {
        notifyUsers({
          schoolId,
          userIds: guardianUsers,
          type: 'ABSENCE_ALERT',
          title: 'Absence today',
          body: message,
          data: { studentId: student.id, date },
        });
      }
    }
  }

  res.json({
    message: `Attendance saved for ${records.length} students${newlyAbsent.length ? `, ${newlyAbsent.length} absence alert(s) queued` : ''}`,
    count: records.length,
    absenceAlerts: newlyAbsent.length,
  });
};

const getRegister = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const classId = Number(req.query.classId);
  if (!classId || !req.query.date) {
    return res.status(400).json({ message: 'classId and date are required' });
  }
  const day = parseDate(String(req.query.date));
  await assertClassAccess(req, schoolId, classId);

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
    canMark: true,
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

  const classScope = await resolveClassScope(req, schoolId, 'attendance.view_all');

  const where = {
    schoolId,
    ...(classId ? { classId } : classScope !== null ? { classId: { in: classScope } } : {}),
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
