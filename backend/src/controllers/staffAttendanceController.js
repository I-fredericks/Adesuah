const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const { audit } = require('../services/auditService');

const parseDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    const err = new Error('Invalid date format, use YYYY-MM-DD');
    err.status = 400;
    throw err;
  }
  return d;
};

const listStaffForRegister = async (schoolId) =>
  prisma.user.findMany({
    where: {
      schoolId,
      role: { in: ['OWNER', 'HEADTEACHER', 'DEPUTY_HEAD', 'ACADEMIC_COORDINATOR', 'TEACHER', 'ACCOUNTANT', 'SECRETARY', 'SUPPORT_STAFF'] },
      isActive: true,
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, role: true, staffProfile: { select: { staffNo: true } } },
  });

const getRegister = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  if (!req.query.date) return res.status(400).json({ message: 'date is required' });
  const day = parseDate(String(req.query.date));

  const [staff, records] = await Promise.all([
    listStaffForRegister(schoolId),
    prisma.staffAttendance.findMany({
      where: { schoolId, date: day },
      select: { userId: true, status: true, note: true },
    }),
  ]);

  const byUser = new Map(records.map((r) => [r.userId, r]));
  res.json({
    date: req.query.date,
    staff: staff.map((s) => ({ ...s, attendance: byUser.get(s.id) || null })),
  });
};

const mark = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { date, records } = req.body;
  const day = parseDate(date);

  await prisma.$transaction(
    records.map((r) =>
      prisma.staffAttendance.upsert({
        where: { userId_date: { userId: r.userId, date: day } },
        create: {
          schoolId,
          userId: r.userId,
          date: day,
          status: r.status,
          note: r.note,
          markedById: req.user.id,
        },
        update: { status: r.status, note: r.note, markedById: req.user.id },
      })
    )
  );

  audit({
    schoolId,
    userId: req.user.id,
    action: 'STAFF_ATTENDANCE_MARK',
    entity: 'staffAttendance',
    entityId: date,
    after: { count: records.length },
  });

  res.json({ message: `Staff attendance saved for ${records.length} staff`, count: records.length });
};

const stats = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const from = req.query.from ? parseDate(String(req.query.from)) : new Date(Date.now() - 30 * 86400000);
  const to = req.query.to ? parseDate(String(req.query.to)) : new Date();

  const byStatus = await prisma.staffAttendance.groupBy({
    by: ['userId', 'status'],
    where: { schoolId, date: { gte: from, lte: to } },
    _count: true,
  });

  const staff = await listStaffForRegister(schoolId);
  const perStaff = staff.map((s) => {
    const rows = byStatus.filter((r) => r.userId === s.id);
    const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: r._count }), {});
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const present = (counts.PRESENT || 0) + (counts.LATE || 0);
    return {
      ...s,
      counts,
      daysMarked: total,
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : null,
    };
  });

  res.json({ from, to, staff: perStaff });
};

module.exports = { getRegister, mark, stats };
