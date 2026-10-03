const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const permissionService = require('../services/permissionService');
const { hasPermission } = require('../utils/permissions');
const { toNum, round2 } = require('../utils/grading');

const getDashboard = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  if (!req._permissions) {
    req._permissions = await permissionService.getUserPermissions(req.user);
  }
  const perms = req._permissions || [];
  const can = (p) => req.user.role === 'SUPER_ADMIN' || hasPermission(perms, p);

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

  // Role-aware sections
  const [teacherClasses, staffAttendanceToday, correctionsPending, scoreGaps, recentActivity] = await Promise.all([
    can('grades.enter') && !can('grades.view_all')
      ? permissionService.teacherAssignedClassIds(schoolId, req.user.id)
      : Promise.resolve(null),
    can('staff.view')
      ? prisma.staffAttendance.findMany({
          where: { schoolId, date: new Date(new Date().toISOString().slice(0, 10)) },
          select: { status: true },
        })
      : Promise.resolve(null),
    can('grades.approve')
      ? prisma.resultCorrection.count({ where: { schoolId, status: 'PENDING' } })
      : Promise.resolve(null),
    can('grades.view_all') && currentTerm
      ? prisma.classSubject.findMany({
          where: { schoolId, classId: { in: (await prisma.schoolClass.findMany({ where: { schoolId }, select: { id: true } })).map((c) => c.id) } },
          select: {
            classId: true,
            subject: { select: { name: true } },
            class: { select: { name: true } },
          },
        }).then(async (rows) => {
          if (rows.length === 0) return [];
          const scored = await prisma.score.findMany({
            where: { schoolId, termId: currentTerm.id, classId: { in: [...new Set(rows.map((r) => r.classId))] } },
            select: { classId: true, subjectId: true },
            distinct: ['classId', 'subjectId'],
          });
          const done = new Set(scored.map((s) => `${s.classId}:${s.subjectId}`));
          return rows
            .filter((r) => !done.has(`${r.classId}:${r.subjectId}`))
            .slice(0, 12)
            .map((r) => ({ className: r.class.name, subject: r.subject.name }));
        })
      : Promise.resolve([]),
    can('grades.approve')
      ? prisma.auditLog.findMany({
          where: {
            schoolId,
            action: { in: ['SCORE_EDIT', 'CORRECTION_REQUEST', 'CORRECTION_APPLY', 'CORRECTION_REJECT', 'REPORTS_PUBLISH', 'REPORTS_LOCK'] },
          },
          include: { user: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 12,
        })
      : Promise.resolve([]),
  ]);

  const teacherScope = teacherClasses
    ? await prisma.schoolClass.findMany({
        where: { schoolId, id: { in: teacherClasses } },
        select: {
          id: true,
          name: true,
          _count: { select: { students: { where: { status: 'ACTIVE' } } } },
          attendance: {
            where: { date: new Date(new Date().toISOString().slice(0, 10)) },
            select: { id: true },
          },
        },
      })
    : null;

  const staffPresent = (staffAttendanceToday || []).filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;

  res.json({
    role: req.user.role,
    sections: {
      finances: can('fees.view'),
      attendanceOverview: can('attendance.view_all'),
      staffAttendance: can('staff.view'),
      enrollment: can('students.view_all'),
      corrections: can('grades.approve'),
      scoreGaps: can('grades.view_all'),
    },
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
    enrollmentByClass: can('students.view_all')
      ? enrollmentByClass
          .sort((a, b) => (a.level?.order || 0) - (b.level?.order || 0))
          .map((c) => ({ class: c.name, level: c.level?.name, students: c._count.students }))
      : [],
    myClasses: teacherScope
      ? teacherScope.map((c) => ({
          id: c.id,
          name: c.name,
          students: c._count.students,
          attendanceMarkedToday: c.attendance.length > 0,
        }))
      : undefined,
    staffAttendanceToday: staffAttendanceToday
      ? {
          marked: staffAttendanceToday.length,
          present: staffPresent,
          rate: staffAttendanceToday.length > 0 ? round2((staffPresent / staffAttendanceToday.length) * 100) : null,
        }
      : undefined,
    correctionsPending,
    scoreGaps,
    recentActivity: (recentActivity || []).map((log) => ({
      id: log.id,
      action: log.action,
      by: log.user?.name || 'System',
      byRole: log.user?.role,
      detail: log.after || log.before || {},
      reason: log.reason,
      at: log.createdAt,
    })),
    announcements,
    recentPayments: can('fees.view')
      ? recentPayments.map((p) => ({
          id: p.id,
          amount: toNum(p.amount),
          receiptNo: p.receiptNo,
          paidAt: p.paidAt,
          student: p.invoice.student,
          term: p.invoice.term?.name,
        }))
      : undefined,
  });
};

module.exports = { getDashboard };
