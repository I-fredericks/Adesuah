const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const { toNum, round2 } = require('../utils/grading');
const feeService = require('../services/feeService');

// ── Fee structures ──

const listStructures = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const structures = await prisma.feeStructure.findMany({
    where: {
      schoolId,
      ...(req.query.termId ? { termId: Number(req.query.termId) } : {}),
    },
    include: {
      items: true,
      class: { select: { id: true, name: true, level: { select: { name: true } } } },
      term: { select: { id: true, name: true } },
      _count: { select: { invoices: true } },
    },
    orderBy: { id: 'asc' },
  });
  res.json({
    structures: structures.map((s) => ({
      ...s,
      totalAmount: toNum(s.totalAmount),
      items: s.items.map((i) => ({ ...i, amount: toNum(i.amount) })),
    })),
  });
};

const createStructure = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { termId, classId, name, items } = req.body;

  const term = await prisma.term.findFirst({ where: { id: termId, schoolId } });
  if (!term) return res.status(400).json({ message: 'Term not found' });
  const klass = await prisma.schoolClass.findFirst({ where: { id: classId, schoolId } });
  if (!klass) return res.status(400).json({ message: 'Class not found' });

  const total = round2(items.reduce((sum, i) => sum + i.amount, 0));
  const existing = await prisma.feeStructure.findUnique({
    where: { termId_classId: { termId, classId } },
  });
  if (existing) {
    return res.status(409).json({ message: 'A fee structure already exists for this class and term' });
  }

  const structure = await prisma.feeStructure.create({
    data: {
      schoolId,
      academicYearId: term.academicYearId,
      termId,
      classId,
      name,
      totalAmount: total,
      items: { create: items.map((i) => ({ name: i.name, amount: i.amount })) },
    },
    include: { items: true },
  });

  res.status(201).json({
    structure: { ...structure, totalAmount: toNum(structure.totalAmount), items: structure.items.map((i) => ({ ...i, amount: toNum(i.amount) })) },
  });
};

const updateStructure = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const structure = await prisma.feeStructure.findFirst({
    where: { id: Number(req.params.id), schoolId },
  });
  if (!structure) return res.status(404).json({ message: 'Fee structure not found' });

  const items = req.body.items;
  const updated = await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.feeItem.deleteMany({ where: { structureId: structure.id } });
      await tx.feeItem.createMany({
        data: items.map((i) => ({ structureId: structure.id, name: i.name, amount: i.amount })),
      });
    }
    const total = (items || (await tx.feeItem.findMany({ where: { structureId: structure.id } }))).reduce(
      (sum, i) => sum + toNum(i.amount),
      0
    );
    return tx.feeStructure.update({
      where: { id: structure.id },
      data: {
        ...(req.body.name ? { name: req.body.name } : {}),
        totalAmount: round2(total),
      },
      include: { items: true },
    });
  });

  res.json({
    structure: { ...updated, totalAmount: toNum(updated.totalAmount), items: updated.items.map((i) => ({ ...i, amount: toNum(i.amount) })) },
  });
};

const deleteStructure = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const structure = await prisma.feeStructure.findFirst({
    where: { id: Number(req.params.id), schoolId },
    include: { _count: { select: { invoices: true } } },
  });
  if (!structure) return res.status(404).json({ message: 'Fee structure not found' });
  if (structure._count.invoices > 0) {
    return res.status(400).json({ message: 'Cannot delete a structure that has invoices generated' });
  }
  await prisma.feeStructure.delete({ where: { id: structure.id } });
  res.json({ message: 'Fee structure deleted' });
};

// ── Invoices ──

const listInvoices = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const termId = req.query.termId ? Number(req.query.termId) : undefined;
  const classId = req.query.classId ? Number(req.query.classId) : undefined;
  const status = req.query.status || undefined;

  const invoices = await prisma.invoice.findMany({
    where: {
      schoolId,
      ...(termId ? { termId } : {}),
      ...(classId ? { student: { currentClassId: classId } } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          admissionNo: true,
          firstName: true,
          lastName: true,
          status: true,
          currentClass: { select: { name: true } },
        },
      },
      term: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const mapped = invoices.map(feeService.serializeInvoice);
  res.json({ invoices: status ? mapped.filter((i) => i.status === status) : mapped });
};

const getInvoice = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), schoolId },
    include: {
      student: {
        include: {
          currentClass: { include: { level: true } },
          guardians: true,
        },
      },
      term: { include: { academicYear: { select: { name: true } } } },
      items: true,
      payments: { include: { recordedBy: { select: { name: true } } }, orderBy: { paidAt: 'desc' } },
      structure: { include: { items: true } },
    },
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json({ invoice: feeService.serializeInvoice(invoice) });
};

const setDiscount = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), schoolId },
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (req.body.discountAmount > toNum(invoice.amountTotal)) {
    return res.status(400).json({ message: 'Discount cannot exceed the invoice total' });
  }
  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { discountAmount: req.body.discountAmount },
    include: { student: true, term: true },
  });
  res.json({ invoice: feeService.serializeInvoice(updated) });
};

const generateInvoices = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const result = await feeService.generateInvoices(schoolId, req.body.structureId);
  res.json({ message: `Generated ${result.created} invoices`, ...result });
};

const remindInvoice = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const result = await feeService.remindInvoice(schoolId, Number(req.params.id));
  res.json({
    message: result.sms.sent
      ? `Reminder sent to ${result.recipients} guardian(s)`
      : 'Reminder queued — SMS gateway is not configured, in-app notifications delivered',
    ...result,
  });
};

// ── Payments ──

const recordPayment = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const payment = await feeService.recordPayment(schoolId, req.user.id, req.body);

  const invoice = await prisma.invoice.findUnique({
    where: { id: req.body.invoiceId },
    include: { student: true, term: true },
  });

  res.status(201).json({
    payment: { ...payment, amount: toNum(payment.amount) },
    invoice: feeService.serializeInvoice(invoice),
  });
};

const listPayments = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const payments = await prisma.payment.findMany({
    where: {
      schoolId,
      ...(req.query.termId ? { invoice: { termId: Number(req.query.termId) } } : {}),
      ...(req.query.from || req.query.to
        ? {
            paidAt: {
              ...(req.query.from ? { gte: new Date(String(req.query.from)) } : {}),
              ...(req.query.to ? { lte: new Date(`${req.query.to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    },
    include: {
      invoice: {
        include: {
          student: {
            select: { id: true, admissionNo: true, firstName: true, lastName: true, currentClass: { select: { name: true } } },
          },
          term: { select: { name: true } },
        },
      },
      recordedBy: { select: { name: true } },
    },
    orderBy: { paidAt: 'desc' },
    take: 500,
  });
  res.json({ payments: payments.map((p) => ({ ...p, amount: toNum(p.amount) })) });
};

// ── Reports ──

const getDebtors = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const termId = req.query.termId ? Number(req.query.termId) : undefined;
  const debtorsList = await feeService.debtors(schoolId, termId);
  res.json({
    debtors: debtorsList,
    totalOutstanding: round2(debtorsList.reduce((sum, i) => sum + i.balance, 0)),
  });
};

const getFeeSummary = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const termId = req.query.termId ? Number(req.query.termId) : undefined;
  res.json(await feeService.feeSummary(schoolId, termId));
};

module.exports = {
  listStructures,
  createStructure,
  updateStructure,
  deleteStructure,
  listInvoices,
  getInvoice,
  setDiscount,
  generateInvoices,
  remindInvoice,
  recordPayment,
  listPayments,
  getDebtors,
  getFeeSummary,
};
