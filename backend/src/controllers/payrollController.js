const prisma = require('../config/db');
const { resolveSchoolId, requirePermission } = require('../middlewares/authMiddleware');
const { audit } = require('../services/auditService');
const { toNum } = require('../utils/grading');

const recordSalary = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { userId, period, amount, method, reference, note, paidAt } = req.body;

  const staff = await prisma.user.findFirst({
    where: { id: userId, schoolId, isActive: true },
  });
  if (!staff) return res.status(404).json({ message: 'Staff member not found' });

  const exists = await prisma.salaryPayment.findUnique({
    where: { userId_period: { userId, period } },
  });
  if (exists) {
    return res.status(409).json({ message: `A salary payment for ${period} already exists for this staff member` });
  }

  const payment = await prisma.salaryPayment.create({
    data: {
      schoolId,
      userId,
      period,
      amount,
      method: method || 'MOMO',
      reference,
      note,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      recordedById: req.user.id,
    },
    include: { user: { select: { name: true, role: true } } },
  });

  audit({
    schoolId,
    userId: req.user.id,
    action: 'SALARY_RECORD',
    entity: 'salaryPayment',
    entityId: payment.id,
    after: { staff: staff.name, period, amount: toNum(amount) },
  });

  res.status(201).json({ payment: { ...payment, amount: toNum(payment.amount) } });
};

const listSalaries = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const payments = await prisma.salaryPayment.findMany({
    where: {
      schoolId,
      ...(req.query.period ? { period: String(req.query.period) } : {}),
      ...(req.query.userId ? { userId: Number(req.query.userId) } : {}),
    },
    include: {
      user: { select: { name: true, role: true, staffProfile: { select: { staffNo: true } } } },
      recordedBy: { select: { name: true } },
    },
    orderBy: { paidAt: 'desc' },
    take: 300,
  });
  res.json({ payments: payments.map((p) => ({ ...p, amount: toNum(p.amount) })) });
};

const mySalaries = async (req, res) => {
  const payments = await prisma.salaryPayment.findMany({
    where: { userId: req.user.id },
    orderBy: { period: 'desc' },
    take: 60,
  });
  res.json({ payments: payments.map((p) => ({ ...p, amount: toNum(p.amount) })) });
};

module.exports = { recordSalary, listSalaries, mySalaries, requirePermission };
