const prisma = require('../config/db');
const { invoiceBalance } = require('../utils/feeMath');
const { toNum } = require('../utils/grading');

// A parent sees strictly their own children's data — enforced by Guardian links.
const requireParent = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (req.user.role === 'PARENT' || req.user.role === 'SUPER_ADMIN') return next();
  return res.status(403).json({ message: 'Parent access required' });
};

const getMyChildren = async (req, res) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return res.json({ children: [] });
  }

  const links = await prisma.guardian.findMany({
    where: { userId: req.user.id },
    include: {
      student: {
        include: {
          currentClass: { select: { name: true, level: { select: { name: true } } } },
          invoices: { include: { term: { select: { name: true } } } },
          attendance: { select: { status: true } },
          reportCards: {
            where: { published: true },
            orderBy: { publishedAt: 'desc' },
            take: 1,
            select: { termId: true, average: true, classPosition: true, term: { select: { name: true } } },
          },
        },
      },
    },
  });

  const children = links.map((link) => {
    const s = link.student;
    const outstanding = s.invoices.reduce(
      (sum, i) => sum + Math.max(0, toNum(i.amountTotal) - toNum(i.discountAmount) - toNum(i.amountPaid)),
      0
    );
    const marked = s.attendance.length;
    const present = s.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      admissionNo: s.admissionNo,
      class: s.currentClass?.name || null,
      relationship: link.relationship,
      feeBalance: Math.round(outstanding * 100) / 100,
      attendanceRate: marked > 0 ? Math.round((present / marked) * 100) : null,
      latestResult: s.reportCards[0] || null,
    };
  });

  res.json({ children });
};

const getChildDetail = async (req, res) => {
  const link = await prisma.guardian.findFirst({
    where: { userId: req.user.id, studentId: Number(req.params.id) },
    include: {
      student: {
        include: {
          currentClass: { select: { name: true } },
          invoices: { include: { term: { select: { name: true } }, installments: true, payments: true } },
          attendance: { orderBy: { date: 'desc' }, take: 60, select: { date: true, status: true } },
          reportCards: {
            where: { published: true },
            include: { term: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!link) {
    return res.status(404).json({ message: 'Child not found' });
  }

  const s = link.student;
  const attendanceCounts = s.attendance.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 }
  );

  res.json({
    child: {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      admissionNo: s.admissionNo,
      photoUrl: s.photoUrl,
      class: s.currentClass?.name || null,
      relationship: link.relationship,
    },
    attendanceCounts,
    recentAttendance: s.attendance.map((a) => ({ date: a.date, status: a.status })),
    invoices: s.invoices.map((i) => ({
      id: i.id,
      term: i.term.name,
      total: toNum(i.amountTotal),
      paid: toNum(i.amountPaid),
      balance: invoiceBalance(i),
      status: i.status,
      installments: i.installments.length,
    })),
    reportCards: s.reportCards.map((rc) => ({
      id: rc.id,
      termId: rc.termId,
      term: rc.term.name,
      average: rc.average,
      totalScore: rc.totalScore,
      classPosition: rc.classPosition,
      subjectsCount: rc.subjectsCount,
      publishedAt: rc.publishedAt,
    })),
  });
};

const getChildReport = async (req, res) => {
  const link = await prisma.guardian.findFirst({
    where: { userId: req.user.id, studentId: Number(req.params.id) },
    include: {
      student: {
        include: { currentClass: { include: { level: true } } },
      },
    },
  });
  if (!link) return res.status(404).json({ message: 'Child not found' });

  const termId = Number(req.query.termId);
  const reportCard = await prisma.reportCard.findFirst({
    where: {
      studentId: Number(req.params.id),
      termId,
      published: true,
    },
    include: {
      term: { include: { academicYear: { select: { name: true } } } },
    },
  });
  if (!reportCard) return res.status(404).json({ message: 'No published report for this term yet' });

  const school = await prisma.school.findUnique({
    where: { id: req.user.schoolId },
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

  const s = link.student;

  res.json({
    // Same payload shape the staff printable view uses, so parents get the
    // identical official report card.
    school,
    term: {
      name: reportCard.term.name,
      academicYear: reportCard.term.academicYear?.name || null,
      endDate: reportCard.term.endDate,
      vacationDate: reportCard.term.vacationDate,
      nextTermBegins: reportCard.term.nextTermBegins,
    },
    student: {
      firstName: s.firstName,
      otherNames: s.otherNames,
      lastName: s.lastName,
      admissionNo: s.admissionNo,
      dateOfBirth: s.dateOfBirth,
      photoUrl: s.photoUrl,
      currentClass: s.currentClass ? { name: s.currentClass.name } : null,
      guardians: [],
    },
    reportCard,
  });
};

// Homework/assignments for a child's class — so parents can verify what was given.
const getChildAssignments = async (req, res) => {
  const link = await prisma.guardian.findFirst({
    where: { userId: req.user.id, studentId: Number(req.params.id) },
    include: { student: { select: { currentClassId: true } } },
  });
  if (!link) return res.status(404).json({ message: 'Child not found' });

  const assignments = await prisma.assignment.findMany({
    where: { schoolId: req.user.schoolId, classId: link.student.currentClassId },
    include: {
      subject: { select: { name: true } },
      teacher: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ assignments });
};

// Active extra classes for a child's class (morning classes etc.).
const getChildExtraClasses = async (req, res) => {
  const link = await prisma.guardian.findFirst({
    where: { userId: req.user.id, studentId: Number(req.params.id) },
    include: { student: { select: { currentClassId: true } } },
  });
  if (!link) return res.status(404).json({ message: 'Child not found' });

  const extraClasses = await prisma.extraClass.findMany({
    where: {
      schoolId: req.user.schoolId,
      classId: link.student.currentClassId,
      status: 'ACTIVE',
    },
    include: {
      subject: { select: { name: true } },
      teacher: { select: { name: true } },
    },
    orderBy: { startTime: 'asc' },
  });
  res.json({ extraClasses });
};

// Guardians may update their child's photo.
const updateChildPhoto = async (req, res) => {  const { photoUrl } = req.body;
  const AVATAR_RE = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;
  if (!photoUrl || !AVATAR_RE.test(photoUrl) || photoUrl.length > 1_500_000) {
    return res.status(400).json({ message: 'Please upload a valid PNG, JPEG or WebP image' });
  }
  const link = await prisma.guardian.findFirst({
    where: { userId: req.user.id, studentId: Number(req.params.id) },
    select: { id: true },
  });
  if (!link) return res.status(404).json({ message: 'Child not found' });

  const student = await prisma.student.update({
    where: { id: Number(req.params.id) },
    data: { photoUrl },
    select: { id: true, photoUrl: true },
  });
  res.json({ student });
};

const getPortalAnnouncements = async (req, res) => {
  const childIds = (
    await prisma.guardian.findMany({
      where: { userId: req.user.id },
      select: { student: { select: { currentClassId: true } } },
    })
  )
    .map((g) => g.student.currentClassId)
    .filter(Boolean);

  const announcements = await prisma.announcement.findMany({
    where: {
      schoolId: req.user.schoolId,
      OR: [{ audience: 'ALL' }, ...(childIds.length ? [{ audience: 'CLASS', classId: { in: childIds } }] : [])],
    },
    include: { class: { select: { name: true } } },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });
  res.json({ announcements });
};

module.exports = {
  requireParent,
  getMyChildren,
  getChildDetail,
  getChildReport,
  getChildAssignments,
  getChildExtraClasses,
  updateChildPhoto,
  getPortalAnnouncements,
};
