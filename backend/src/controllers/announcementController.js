const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const { notifyUsers } = require('../services/notificationService');
const { sendSms } = require('../services/smsService');

const listAnnouncements = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const announcements = await prisma.announcement.findMany({
    where: { schoolId },
    include: {
      author: { select: { name: true } },
      class: { select: { name: true } },
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });
  res.json({ announcements });
};

const createAnnouncement = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { title, body, audience = 'ALL', classId, isPinned, sendSms: withSms } = req.body;

  if (audience === 'CLASS' && !classId) {
    return res.status(400).json({ message: 'classId is required for class announcements' });
  }

  const announcement = await prisma.announcement.create({
    data: {
      schoolId,
      authorId: req.user.id,
      title,
      body,
      audience,
      classId: audience === 'CLASS' ? classId : null,
      isPinned: !!isPinned,
    },
    include: { author: { select: { name: true } }, class: { select: { name: true } } },
  });

  let userIds = [];
  if (audience === 'STAFF') {
    const staff = await prisma.user.findMany({
      where: { schoolId, role: { in: ['OWNER', 'ADMIN', 'TEACHER', 'ACCOUNTANT'] }, isActive: true },
      select: { id: true },
    });
    userIds = staff.map((u) => u.id);
  } else if (audience === 'CLASS') {
    const guardians = await prisma.guardian.findMany({
      where: { userId: { not: null }, student: { currentClassId: classId } },
      select: { userId: true },
    });
    userIds = guardians.map((g) => g.userId);
  } else {
    const users = await prisma.user.findMany({
      where: { schoolId, isActive: true },
      select: { id: true },
    });
    const guardians = await prisma.guardian.findMany({
      where: { userId: { not: null }, student: { schoolId } },
      select: { userId: true },
    });
    userIds = [...users.map((u) => u.id), ...guardians.map((g) => g.userId)];
  }

  await notifyUsers({
    schoolId,
    userIds,
    type: 'ANNOUNCEMENT',
    title,
    body,
    data: { announcementId: announcement.id },
  });

  let sms = null;
  if (withSms) {
    let phones = [];
    if (audience === 'CLASS') {
      const guardians = await prisma.guardian.findMany({
        where: { student: { currentClassId: classId } },
        select: { phone: true },
      });
      phones = guardians.map((g) => g.phone);
    } else if (audience === 'ALL') {
      const guardians = await prisma.guardian.findMany({
        where: { student: { schoolId } },
        select: { phone: true },
      });
      phones = guardians.map((g) => g.phone);
    }
    sms = await sendSms(schoolId, phones, `${title}\n\n${body}`.slice(0, 480));
    await prisma.announcement.update({ where: { id: announcement.id }, data: { smsSent: !!sms.sent } });
  }

  res.status(201).json({ announcement, notified: userIds.length, sms });
};

const deleteAnnouncement = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const announcement = await prisma.announcement.findFirst({
    where: { id: Number(req.params.id), schoolId },
  });
  if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
  await prisma.announcement.delete({ where: { id: announcement.id } });
  res.json({ message: 'Announcement deleted' });
};

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
