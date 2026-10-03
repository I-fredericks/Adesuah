const prisma = require('../config/db');
const { resolveSchoolId, assertClassAccess } = require('../middlewares/authMiddleware');
const { hasPermission } = require('../utils/permissions');
const { audit } = require('../services/auditService');
const { notifyUsers } = require('../services/notificationService');

const list = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const permissionService = require('../services/permissionService');
  const { hasPermission } = require('../utils/permissions');
  if (!req._permissions) {
    req._permissions = await permissionService.getUserPermissions(req.user);
  }
  let classScope = null;
  if (req.user.role !== 'SUPER_ADMIN' && !hasPermission(req._permissions || [], 'grades.view_all')) {
    classScope = await permissionService.teacherAssignedClassIds(schoolId, req.user.id);
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      schoolId,
      ...(classScope !== null ? { classId: { in: classScope } } : {}),
      ...(req.query.classId ? { classId: Number(req.query.classId) } : {}),
      ...(req.query.termId ? { termId: Number(req.query.termId) } : {}),
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      teacher: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });
  res.json({ assignments });
};

const create = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { classId, subjectId, termId, title, description, dueDate } = req.body;

  const [klass, term] = await Promise.all([
    prisma.schoolClass.findFirst({ where: { id: classId, schoolId } }),
    prisma.term.findFirst({ where: { id: termId, schoolId } }),
  ]);
  if (!klass || !term) return res.status(400).json({ message: 'Invalid class or term' });

  await assertClassAccess(req, schoolId, classId);

  // Subject teachers may only give assignments for subjects assigned to them,
  // unless they hold grades.edit_any (headteacher/coordinator/proprietor).
  if (!hasPermission(req._permissions || [], 'grades.edit_any') && req.user.role !== 'SUPER_ADMIN') {
    const assignment = await prisma.classSubject.findFirst({
      where: { schoolId, classId, subjectId, teacherId: req.user.id },
    });
    if (!assignment) {
      const err = new Error('This subject is not assigned to you');
      err.status = 403;
      throw err;
    }
  }

  const assignment = await prisma.assignment.create({
    data: {
      schoolId,
      classId,
      subjectId: subjectId || null,
      teacherId: req.user.id,
      termId,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
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
    action: 'ASSIGNMENT_CREATE',
    entity: 'assignment',
    entityId: assignment.id,
    after: { title, classId, subjectId, dueDate: dueDate || null },
  });

  res.status(201).json({ assignment });
};

const remove = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const assignment = await prisma.assignment.findFirst({
    where: { id: Number(req.params.id), schoolId },
  });
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

  const owns = assignment.createdById === req.user.id;
  const canManage = hasPermission(req._permissions || [], 'academics.manage') || req.user.role === 'SUPER_ADMIN';
  if (!owns && !canManage) {
    return res.status(403).json({ message: 'Only the creator or management can remove this assignment' });
  }

  await prisma.assignment.delete({ where: { id: assignment.id } });
  audit({
    schoolId,
    userId: req.user.id,
    action: 'ASSIGNMENT_DELETE',
    entity: 'assignment',
    entityId: assignment.id,
    before: { title: assignment.title },
  });
  res.json({ message: 'Assignment removed' });
};

module.exports = { list, create, remove };
