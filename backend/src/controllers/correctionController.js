const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const permissionService = require('../services/permissionService');
const { audit } = require('../services/auditService');
const { notifyUsers } = require('../services/notificationService');
const { publishClassReports } = require('../services/reportService');
const { hasPermission } = require('../utils/permissions');

// Teacher (grades.enter) submits a score change with a reason. Works on locked
// results — that is the point: the change is proposed, not applied directly.
const requestCorrection = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { studentId, subjectId, termId, assessmentTypeId, newScore, reason } = req.body;

  const [student, subject, term, assessmentType] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, schoolId } }),
    prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
    prisma.term.findFirst({ where: { id: termId, schoolId } }),
    prisma.assessmentType.findFirst({ where: { id: assessmentTypeId, schoolId } }),
  ]);
  if (!student || !subject || !term || !assessmentType) {
    return res.status(400).json({ message: 'Invalid student, subject, term or assessment' });
  }

  const existing = await prisma.score.findUnique({
    where: {
      studentId_subjectId_termId_assessmentTypeId: {
        studentId,
        subjectId,
        termId,
        assessmentTypeId,
      },
    },
  });
  if (!existing) {
    return res.status(400).json({
      message: 'No existing score to correct — scores can still be entered normally',
    });
  }
  if (existing.rawScore === newScore) {
    return res.status(400).json({ message: 'The new score is the same as the current score' });
  }

  const pending = await prisma.resultCorrection.findFirst({
    where: {
      schoolId,
      studentId,
      subjectId,
      termId,
      assessmentTypeId,
      status: 'PENDING',
    },
  });
  if (pending) {
    return res.status(409).json({ message: 'A correction for this score is already awaiting approval' });
  }

  const correction = await prisma.resultCorrection.create({
    data: {
      schoolId,
      studentId,
      subjectId,
      termId,
      assessmentTypeId,
      oldScore: existing.rawScore,
      newScore,
      reason,
      requestedById: req.user.id,
    },
    include: {
      student: { select: { firstName: true, lastName: true, admissionNo: true } },
      subject: { select: { name: true } },
      assessmentType: { select: { name: true, shortCode: true } },
      term: { select: { name: true } },
      requestedBy: { select: { name: true } },
    },
  });

  audit({
    schoolId,
    userId: req.user.id,
    action: 'CORRECTION_REQUEST',
    entity: 'resultCorrection',
    entityId: correction.id,
    before: { rawScore: existing.rawScore },
    after: { rawScore: newScore },
    reason,
  });

  res.status(201).json({ correction });
};

const listCorrections = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const status = req.query.status || undefined;

  if (!req._permissions) {
    req._permissions = await permissionService.getUserPermissions(req.user);
  }
  const isApprover = hasPermission(req._permissions || [], 'grades.approve');
  const scope = isApprover ? [] : [{ requestedById: req.user.id }];

  const corrections = await prisma.resultCorrection.findMany({
    where: { schoolId, ...(status ? { status } : {}), ...(scope.length ? { OR: scope } : {}) },
    include: {
      student: { select: { firstName: true, lastName: true, admissionNo: true, currentClass: { select: { name: true } } } },
      subject: { select: { name: true } },
      assessmentType: { select: { name: true, shortCode: true } },
      term: { select: { name: true } },
      requestedBy: { select: { name: true } },
      decidedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ corrections });
};

// Approver (grades.approve) decides. On approval the score change is applied,
// the class report card snapshot is recomputed (bypassing the lock — this IS
// the sanctioned path) and both actions are audit-logged.
const decideCorrection = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ message: 'Correction request not found' });
  const correction = await prisma.resultCorrection.findFirst({
    where: { id, schoolId },
  });
  if (!correction) return res.status(404).json({ message: 'Correction request not found' });
  if (correction.status !== 'PENDING') {
    return res.status(400).json({ message: 'This correction has already been decided' });
  }

  const { approve, note } = req.body;

  if (!approve) {
    const updated = await prisma.resultCorrection.update({
      where: { id: correction.id },
      data: {
        status: 'REJECTED',
        decidedById: req.user.id,
        decidedAt: new Date(),
        decisionNote: note,
      },
    });
    audit({
      schoolId,
      userId: req.user.id,
      action: 'CORRECTION_REJECT',
      entity: 'resultCorrection',
      entityId: correction.id,
      before: { status: 'PENDING' },
      after: { status: 'REJECTED' },
      reason: note,
    });
    return res.json({ correction: updated });
  }

  const applied = await prisma.$transaction(async (tx) => {
    const score = await tx.score.update({
      where: {
        studentId_subjectId_termId_assessmentTypeId: {
          studentId: correction.studentId,
          subjectId: correction.subjectId,
          termId: correction.termId,
          assessmentTypeId: correction.assessmentTypeId,
        },
      },
      data: { rawScore: correction.newScore },
    });

    await tx.resultCorrection.update({
      where: { id: correction.id },
      data: {
        status: 'APPROVED',
        decidedById: req.user.id,
        decidedAt: new Date(),
        decisionNote: note,
        appliedAt: new Date(),
      },
    });

    return score;
  });

  audit({
    schoolId,
    userId: req.user.id,
    action: 'CORRECTION_APPLY',
    entity: 'score',
    entityId: applied.id,
    before: { rawScore: correction.oldScore },
    after: { rawScore: correction.newScore },
    reason: `Correction #${correction.id}: ${correction.reason}`,
  });
  audit({
    schoolId,
    userId: req.user.id,
    action: 'CORRECTION_APPROVE',
    entity: 'resultCorrection',
    entityId: correction.id,
    before: { status: 'PENDING' },
    after: { status: 'APPROVED' },
    reason: note,
  });

  // Recompute the class snapshot so published report cards reflect the change
  const classId = applied.classId;
  try {
    await publishClassReports(schoolId, classId, correction.termId, new Map(), { force: true });
  } catch (err) {
    console.error('snapshot recompute failed after correction:', err.message);
  }

  const requester = await prisma.user.findUnique({
    where: { id: correction.requestedById || 0 },
    select: { id: true },
  });
  if (requester) {
    await notifyUsers({
      schoolId,
      userIds: [requester.id],
      type: 'CORRECTION_DECIDED',
      title: approve ? 'Correction approved' : 'Correction rejected',
      body: approve
        ? `Your score correction was approved and applied.`
        : `Your score correction was rejected.${note ? ' Note: ' + note : ''}`,
      data: { correctionId: correction.id },
    });
  }

  res.json({
    message: approve ? 'Correction approved and applied' : 'Correction rejected',
    appliedScore: applied.rawScore,
  });
};

// Audit trail viewer (grades.approve holders; owners see everything).
const listAuditLogs = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const logs = await prisma.auditLog.findMany({
    where: {
      schoolId,
      ...(req.query.entity ? { entity: String(req.query.entity) } : {}),
    },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ logs });
};

module.exports = { requestCorrection, listCorrections, decideCorrection, listAuditLogs };
