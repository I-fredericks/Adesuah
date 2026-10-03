const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const { toNum, round2 } = require('../utils/grading');
const { allocateInstalments } = require('../utils/installments');
const { audit } = require('../services/auditService');
const { runFeeReminders } = require('../services/reminderService');
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

const serializeInvoice = (invoice) => {
  const base = feeService.serializeInvoice(invoice);
  return {
    ...base,
    dueDate: invoice.dueDate || null,
    lastRemindedAt: invoice.lastRemindedAt || null,
    installments: invoice.installments
      ? allocateInstalments(invoice.installments, invoice.amountPaid)
      : [],
  };
};

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
      term: { select: { name: true, endDate: true } },
      installments: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const mapped = invoices.map(serializeInvoice);
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
      installments: { orderBy: { dueDate: 'asc' } },
      payments: { include: { recordedBy: { select: { name: true } } }, orderBy: { paidAt: 'desc' } },
      structure: { include: { items: true } },
    },
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json({ invoice: serializeInvoice(invoice) });
};

// Set or replace the instalment plan for an invoice.
const setInstallments = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), schoolId },
    include: { installments: true },
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  const total = req.body.installments.reduce((s, i) => s + i.amount, 0);
  const expected = toNum(invoice.amountTotal) - toNum(invoice.discountAmount);
  if (Math.abs(total - expected) > 0.01) {
    return res.status(400).json({
      message: `Instalment amounts must add up to the invoice balance expectation of GHS ${expected.toFixed(2)} (got GHS ${total.toFixed(2)})`,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoiceInstallment.deleteMany({ where: { invoiceId: invoice.id } });
    await tx.invoiceInstallment.createMany({
      data: req.body.installments.map((i) => ({
        invoiceId: invoice.id,
        dueDate: new Date(i.dueDate),
        amount: i.amount,
        label: i.label,
      })),
    });
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { dueDate: new Date(req.body.installments[0].dueDate) },
    });
  });

  audit({
    schoolId,
    userId: req.user.id,
    action: 'INSTALLMENTS_SET',
    entity: 'invoice',
    entityId: invoice.id,
    before: { count: invoice.installments.length },
    after: { count: req.body.installments.length },
  });

  const fresh = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: { installments: { orderBy: { dueDate: 'asc' } } },
  });
  res.json({ invoice: serializeInvoice(fresh) });
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
  audit({
    schoolId,
    userId: req.user.id,
    action: 'INVOICE_DISCOUNT',
    entity: 'invoice',
    entityId: invoice.id,
    before: { discountAmount: toNum(invoice.discountAmount) },
    after: { discountAmount: req.body.discountAmount },
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

  audit({
    schoolId,
    userId: req.user.id,
    action: 'PAYMENT_RECORD',
    entity: 'payment',
    entityId: payment.id,
    after: { amount: toNum(payment.amount), method: req.body.method || 'CASH', receiptNo: payment.receiptNo, invoiceId: req.body.invoiceId },
  });

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

// Debtors with ageing buckets by days past the effective due date.
const getDebtors = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const termId = req.query.termId ? Number(req.query.termId) : undefined;
  const invoices = await prisma.invoice.findMany({
    where: { schoolId, ...(termId ? { termId } : {}) },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNo: true,
          currentClass: { select: { name: true } },
          guardians: { select: { name: true, phone: true } },
        },
      },
      term: { select: { name: true, endDate: true } },
      installments: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const now = new Date();
  const debtorsList = invoices
    .map((inv) => {
      const base = feeService.serializeInvoice(inv);
      const alloc = allocateInstalments(inv.installments, inv.amountPaid);
      const firstUnpaid = alloc.find((i) => i.balance > 0);
      const due = firstUnpaid ? firstUnpaid.dueDate : inv.dueDate || inv.term.endDate;
      const daysOverdue = Math.floor((now - new Date(due)) / 86400000);
      return {
        ...base,
        dueDate: due,
        daysOverdue,
        bucket:
          daysOverdue <= 0 ? 'not_due' : daysOverdue <= 30 ? '1_30' : daysOverdue <= 60 ? '31_60' : '60_plus',
      };
    })
    .filter((i) => i.status !== 'WAIVED' && i.balance > 0);

  const ageing = {
    not_due: 0,
    '1_30': 0,
    '31_60': 0,
    '60_plus': 0,
  };
  for (const d of debtorsList) ageing[d.bucket] = round2(ageing[d.bucket] + d.balance);

  res.json({
    debtors: debtorsList,
    totalOutstanding: round2(debtorsList.reduce((sum, i) => sum + i.balance, 0)),
    ageing,
  });
};

const getFeeSummary = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const termId = req.query.termId ? Number(req.query.termId) : undefined;
  res.json(await feeService.feeSummary(schoolId, termId));
};

// Reminder run: SMS guardians of invoices due soon / overdue. Safe to re-run —
// each invoice is reminded at most once every 3 days.
const runReminders = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const termId = req.query.termId ? Number(req.query.termId) : undefined;
  const dryRun = req.query.dryRun === '1';
  const result = await runFeeReminders(schoolId, { termId, dryRun });

  if (!dryRun && result.sent > 0) {
    audit({
      schoolId,
      userId: req.user.id,
      action: 'FEE_REMINDER_RUN',
      entity: 'invoice',
      after: { ...result },
    });
  }

  res.json({
    message: dryRun
      ? `Dry run: ${result.matched} invoice(s) would be reminded`
      : `Reminders processed for ${result.sent} invoice(s)`,
    ...result,
  });
};

module.exports = {
  listStructures,
  createStructure,
  updateStructure,
  deleteStructure,
  listInvoices,
  getInvoice,
  setInstallments,
  setDiscount,
  generateInvoices,
  remindInvoice,
  recordPayment,
  listPayments,
  getDebtors,
  getFeeSummary,
  runReminders,
};
