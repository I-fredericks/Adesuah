const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const { toNum, round2 } = require('../utils/grading');

const getDashboard = async (req, res) => {
  const schoolId = resolveSchoolId(req);

  const [currentYear, currentTerm] = await Promise.all([
    prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }),
    prisma.term.findFirst({ where: { schoolId, isCurrent: true } }),
  ]);

  const [
    totalStudents,
    activeStudents,
    maleStudents,
    femaleStudents,
    staffCount,
    classCount,
    todayAttendance,
    feeSummary,
    enrollmentByClass,
    announcements,
    recentPayments,
    debtorsCount,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
    prisma.student.count({ where: { schoolId, status: 'ACTIVE', gender: 'MALE' } }),
    prisma.student.count({ where: { schoolId, status: 'ACTIVE', gender: 'FEMALE' } }),
    prisma.user.count({ where: { schoolId, role: { in: ['OWNER', 'ADMIN', 'TEACHER', 'ACCOUNTANT'] }, isActive: true } }),
    prisma.schoolClass.count({ where: { schoolId } }),
    prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        date: new Date(new Date().toISOString().slice(0, 10)),
      },
      select: { status: true },
    }),
    prisma.invoice.findMany({
      where: { schoolId, ...(currentTerm ? { termId: currentTerm.id } : {}) },
      select: { amountTotal: true, discountAmount: true, amountPaid: true, status: true },
    }),
    prisma.schoolClass.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        level: { select: { name: true, order: true } },
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: { id: 'asc' },
    }),
    prisma.announcement.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { author: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: { schoolId },
      orderBy: { paidAt: 'desc' },
      take: 5,
      include: {
        invoice: {
          include: {
            student: { select: { firstName: true, lastName: true, currentClass: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.invoice.count({
      where: {
        schoolId,
        ...(currentTerm ? { termId: currentTerm.id } : {}),
        status: { in: ['UNPAID', 'PARTIAL'] },
      },
    }),
  ]);

  let expected = 0;
  let collected = 0;
  for (const inv of feeSummary) {
    if (inv.status === 'WAIVED') continue;
    expected += toNum(inv.amountTotal) - toNum(inv.discountAmount);
    collected += toNum(inv.amountPaid);
  }

  const present = todayAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;

  res.json({
    academicYear: currentYear,
    currentTerm,
    students: {
      total: totalStudents,
      active: activeStudents,
      male: maleStudents,
      female: femaleStudents,
    },
    staffCount,
    classCount,
    attendanceToday: {
      marked: todayAttendance.length,
      present,
      rate: todayAttendance.length > 0 ? round2((present / todayAttendance.length) * 100) : null,
    },
    fees: {
      expected: round2(expected),
      collected: round2(collected),
      outstanding: round2(expected - collected),
      collectionRate: expected > 0 ? round2((collected / expected) * 100) : 0,
      debtorsCount,
    },
    enrollmentByClass: enrollmentByClass
      .sort((a, b) => (a.level?.order || 0) - (b.level?.order || 0))
      .map((c) => ({ class: c.name, level: c.level?.name, students: c._count.students })),
    announcements,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: toNum(p.amount),
      receiptNo: p.receiptNo,
      paidAt: p.paidAt,
      student: p.invoice.student,
      term: p.invoice.term?.name,
    })),
  });
};

module.exports = { getDashboard };
