const prisma = require('../config/db');
const { invoiceBalance } = require('../utils/feeMath');
const { toNum, round2 } = require('../utils/grading');
const { effectiveDueDate } = require('../utils/installments');
const { sendSms } = require('./smsService');
const { notifyUsers } = require('./notificationService');

const DUE_SOON_DAYS = 3;
const MIN_DAYS_BETWEEN_REMINDERS = 3;

// Fee reminder run: for every invoice with an outstanding balance whose
// effective due date is within DUE_SOON_DAYS or past, SMS guardians and notify
// guardian accounts. Each invoice is reminded at most once every
// MIN_DAYS_BETWEEN_REMINDERS days. Returns a summary for the caller.
const runFeeReminders = async (schoolId, { termId, dryRun } = {}) => {
  const invoices = await prisma.invoice.findMany({
    where: { schoolId, ...(termId ? { termId } : {}), status: { not: 'WAIVED' } },
    include: {
      student: {
        include: {
          guardians: true,
          currentClass: { select: { name: true } },
        },
      },
      term: { select: { name: true, endDate: true } },
      installments: true,
    },
  });

  const now = new Date();
  const targets = [];

  for (const invoice of invoices) {
    const balance = invoiceBalance(invoice);
    if (balance <= 0) continue;

    const due = effectiveDueDate(invoice, invoice.installments) || invoice.term.endDate;
    const daysToDue = Math.ceil((new Date(due) - now) / 86400000);

    const last = invoice.lastRemindedAt
      ? Math.floor((now - new Date(invoice.lastRemindedAt)) / 86400000)
      : Infinity;
    if (last < MIN_DAYS_BETWEEN_REMINDERS) continue;

    if (daysToDue > DUE_SOON_DAYS) continue;

    targets.push({ invoice, balance, due, daysToDue });
  }

  if (dryRun) {
    return {
      matched: targets.length,
      sent: 0,
      skipped: invoices.length - targets.length,
      preview: targets.slice(0, 5).map((t) => ({
        student: `${t.invoice.student.firstName} ${t.invoice.student.lastName}`,
        balance: t.balance,
        due: t.due,
        daysToDue: t.daysToDue,
      })),
    };
  }

  let sent = 0;
  for (const { invoice, balance, due, daysToDue } of targets) {
    const urgency =
      daysToDue < 0
        ? `is overdue by ${Math.abs(daysToDue)} day(s)`
        : daysToDue === 0
          ? 'is due today'
          : `is due in ${daysToDue} day(s)`;
    const message = `${invoice.term.name.replace('_', ' ')} fees for ${invoice.student.firstName} ${invoice.student.lastName}: outstanding balance GHS ${balance.toFixed(2)} ${urgency}. Kindly settle at the school office. Thank you.`;

    const phones = invoice.student.guardians.map((g) => g.phone);
    const result = await sendSms(phones, message);
    if (result.sent || result.reason === 'not_configured') sent += 1;

    const guardianUsers = invoice.student.guardians.filter((g) => g.userId).map((g) => g.userId);
    if (guardianUsers.length > 0) {
      await notifyUsers({
        schoolId,
        userIds: guardianUsers,
        type: 'FEE_REMINDER',
        title: 'Fee reminder',
        body: message,
        data: { invoiceId: invoice.id, studentId: invoice.studentId },
      });
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { lastRemindedAt: new Date() },
    });
  }

  return {
    matched: targets.length,
    sent,
    skipped: invoices.length - targets.length,
    totalOutstanding: round2(targets.reduce((s, t) => s + t.balance, 0)),
  };
};

module.exports = { runFeeReminders };
