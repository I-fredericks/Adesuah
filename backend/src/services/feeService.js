const prisma = require('../config/db');
const { invoiceBalance, invoiceStatus, receiptNoFor } = require('../utils/feeMath');
const { toNum, round2 } = require('../utils/grading');
const { notifyUsers } = require('./notificationService');
const { sendSms } = require('./smsService');

const generateInvoices = async (schoolId, structureId) => {
  const structure = await prisma.feeStructure.findFirst({
    where: { id: structureId, schoolId },
    include: { items: true, term: true },
  });
  if (!structure) {
    const err = new Error('Fee structure not found');
    err.status = 404;
    throw err;
  }

  const students = await prisma.student.findMany({
    where: { schoolId, currentClassId: structure.classId, status: 'ACTIVE' },
    select: { id: true },
  });

  const existing = await prisma.invoice.findMany({
    where: { schoolId, termId: structure.termId, studentId: { in: students.map((s) => s.id) } },
    select: { studentId: true },
  });
  const existingIds = new Set(existing.map((e) => e.studentId));
  const targets = students.filter((s) => !existingIds.has(s.id));

  const total = structure.items.reduce((sum, i) => sum + toNum(i.amount), 0);

  await prisma.$transaction(
    targets.map((s) =>
      prisma.invoice.create({
        data: {
          schoolId,
          studentId: s.id,
          termId: structure.termId,
          structureId: structure.id,
          amountTotal: round2(total),
          items: {
            create: structure.items.map((i) => ({ name: i.name, amount: i.amount })),
          },
        },
      })
    )
  );

  return { created: targets.length, skipped: existingIds.size, total };
};

const recordPayment = async (schoolId, userId, { invoiceId, amount, method, reference, note }) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, schoolId },
    include: { student: true, term: true },
  });
  if (!invoice) {
    const err = new Error('Invoice not found');
    err.status = 404;
    throw err;
  }
  if (invoice.status === 'WAIVED') {
    const err = new Error('This invoice has been waived');
    err.status = 400;
    throw err;
  }
  const balance = invoiceBalance(invoice);
  if (amount > balance + 0.001) {
    const err = new Error(`Amount exceeds outstanding balance of GHS ${balance.toFixed(2)}`);
    err.status = 400;
    throw err;
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        schoolId,
        invoiceId,
        amount: round2(amount),
        method: method || 'CASH',
        reference,
        note,
        recordedById: userId,
      },
    });
    await tx.payment.update({
      where: { id: created.id },
      data: { receiptNo: receiptNoFor(schoolId, created.id) },
    });
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: { increment: round2(amount) } },
    });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: invoiceStatus(updatedInvoice) },
    });
    return created;
  });

  return prisma.payment.findUnique({
    where: { id: payment.id },
    include: {
      invoice: { include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } } },
    },
  });
};

const serializeInvoice = (invoice) => ({
  ...invoice,
  amountTotal: toNum(invoice.amountTotal),
  discountAmount: toNum(invoice.discountAmount),
  amountPaid: toNum(invoice.amountPaid),
  balance: invoiceBalance(invoice),
  status: invoiceStatus(invoice),
  items: invoice.items?.map((i) => ({ ...i, amount: toNum(i.amount) })),
  payments: invoice.payments?.map((p) => ({ ...p, amount: toNum(p.amount) })),
});

const debtors = async (schoolId, termId) => {
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
      term: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return invoices
    .map(serializeInvoice)
    .filter((i) => i.status !== 'WAIVED' && i.balance > 0);
};

const feeSummary = async (schoolId, termId) => {
  const invoices = await prisma.invoice.findMany({
    where: { schoolId, ...(termId ? { termId } : {}) },
    select: {
      amountTotal: true,
      discountAmount: true,
      amountPaid: true,
      status: true,
    },
  });

  let expected = 0;
  let collected = 0;
  let waived = 0;
  let unpaidCount = 0;
  let paidCount = 0;

  for (const inv of invoices) {
    if (inv.status === 'WAIVED') {
      waived += toNum(inv.amountTotal);
      continue;
    }
    expected += toNum(inv.amountTotal) - toNum(inv.discountAmount);
    collected += toNum(inv.amountPaid);
    if (invoiceStatus(inv) === 'PAID') paidCount += 1;
    else unpaidCount += 1;
  }

  return {
    invoiceCount: invoices.length,
    expected: round2(expected),
    collected: round2(collected),
    outstanding: round2(expected - collected),
    waived: round2(waived),
    paidCount,
    unpaidCount,
    collectionRate: expected > 0 ? round2((collected / expected) * 100) : 0,
  };
};

const remindInvoice = async (schoolId, invoiceId) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, schoolId },
    include: {
      student: {
        include: { guardians: true, currentClass: { select: { name: true } } },
      },
      term: { select: { name: true } },
    },
  });
  if (!invoice) {
    const err = new Error('Invoice not found');
    err.status = 404;
    throw err;
  }
  const balance = invoiceBalance(invoice);
  const message = `${invoice.term.name.replace('_', ' ')} fees: ${invoice.student.firstName} ${invoice.student.lastName} (${invoice.student.currentClass?.name || 'N/A'}) has an outstanding balance of GHS ${balance.toFixed(2)}. Kindly settle at the school office. Thank you.`;
  const phones = invoice.student.guardians.map((g) => g.phone);
  const result = await sendSms(phones, message);

  const guardiansWithAccounts = invoice.student.guardians.filter((g) => g.userId).map((g) => g.userId);
  if (guardiansWithAccounts.length > 0) {
    await notifyUsers({
      schoolId,
      userIds: guardiansWithAccounts,
      type: 'FEE_REMINDER',
      title: 'Fee reminder',
      body: message,
      data: { invoiceId, studentId: invoice.studentId },
    });
  }

  return { message, recipients: phones.length, sms: result };
};

module.exports = {
  generateInvoices,
  recordPayment,
  serializeInvoice,
  debtors,
  feeSummary,
  remindInvoice,
};
