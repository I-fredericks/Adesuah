const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const { audit } = require('../services/auditService');

const list = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const extraClasses = await prisma.extraClass.findMany({
    where: {
      schoolId,
      ...(req.query.status ? { status: String(req.query.status) } : {}),
      ...(req.query.classId ? { classId: Number(req.query.classId) } : {}),
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      teacher: { select: { name: true } },
    },
    orderBy: [{ status: 'asc' }, { startTime: 'asc' }],
  });
  res.json({ extraClasses });
};

const create = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { title, classId, subjectId, teacherId, days, startTime, endTime, venue, startDate, endDate, notes } = req.body;

  const klass = await prisma.schoolClass.findFirst({ where: { id: classId, schoolId } });
  if (!klass) return res.status(400).json({ message: 'Class not found' });

  const extraClass = await prisma.extraClass.create({
    data: {
      schoolId,
      title,
      classId,
      subjectId: subjectId || null,
      teacherId: teacherId || null,
      days,
      startTime,
      endTime,
      venue,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      notes,
      createdById: req.user.id,
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });

  audit({
    schoolId,
    userId: req.user.id,
    action: 'EXTRA_CLASS_CREATE',
    entity: 'extraClass',
    entityId: extraClass.id,
    after: { title, classId, days, startTime, endTime },
  });

  res.status(201).json({ extraClass });
};

const update = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const extraClass = await prisma.extraClass.findFirst({
    where: { id: Number(req.params.id), schoolId },
  });
  if (!extraClass) return res.status(404).json({ message: 'Extra class not found' });

  const b = req.body;
  const updated = await prisma.extraClass.update({
    where: { id: extraClass.id },
    data: {
      ...(b.title !== undefined ? { title: b.title } : {}),
      ...(b.classId !== undefined ? { classId: b.classId } : {}),
      ...(b.subjectId !== undefined ? { subjectId: b.subjectId || null } : {}),
      ...(b.teacherId !== undefined ? { teacherId: b.teacherId || null } : {}),
      ...(b.days !== undefined ? { days: b.days } : {}),
      ...(b.startTime !== undefined ? { startTime: b.startTime } : {}),
      ...(b.endTime !== undefined ? { endTime: b.endTime } : {}),
      ...(b.venue !== undefined ? { venue: b.venue } : {}),
      ...(b.startDate !== undefined ? { startDate: new Date(b.startDate) } : {}),
      ...(b.endDate !== undefined ? { endDate: b.endDate ? new Date(b.endDate) : null } : {}),
      ...(b.notes !== undefined ? { notes: b.notes } : {}),
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });

  audit({
    schoolId,
    userId: req.user.id,
    action: 'EXTRA_CLASS_UPDATE',
    entity: 'extraClass',
    entityId: extraClass.id,
    before: { title: extraClass.title, days: extraClass.days, startTime: extraClass.startTime, endTime: extraClass.endTime },
    after: { title: updated.title, days: updated.days, startTime: updated.startTime, endTime: updated.endTime },
  });

  res.json({ extraClass: updated });
};

const setStatus = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const extraClass = await prisma.extraClass.findFirst({
    where: { id: Number(req.params.id), schoolId },
  });
  if (!extraClass) return res.status(404).json({ message: 'Extra class not found' });

  const { status } = req.body;
  const updated = await prisma.extraClass.update({
    where: { id: extraClass.id },
    data: {
      status,
      ...(status === 'ENDED' && !extraClass.endDate ? { endDate: new Date() } : {}),
    },
  });

  audit({
    schoolId,
    userId: req.user.id,
    action: status === 'ENDED' ? 'EXTRA_CLASS_END' : 'EXTRA_CLASS_STATUS',
    entity: 'extraClass',
    entityId: extraClass.id,
    before: { status: extraClass.status },
    after: { status },
  });

  res.json({ extraClass: updated, message: status === 'ENDED' ? 'Extra class terminated' : `Extra class ${status.toLowerCase()}` });
};

module.exports = { list, create, update, setStatus };
