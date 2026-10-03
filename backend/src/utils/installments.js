const { toNum, round2 } = require('./grading');

// Allocate an invoice's total paid amount across its instalments in due-date
// order; earlier instalments absorb payments first.
const allocateInstalments = (installments, amountPaid) => {
  let remaining = toNum(amountPaid);
  return [...installments]
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .map((inst) => {
      const amount = toNum(inst.amount);
      const paid = Math.min(remaining, amount);
      remaining = round2(remaining - paid);
      const balance = round2(amount - paid);
      return {
        id: inst.id,
        dueDate: inst.dueDate,
        label: inst.label,
        amount,
        paid: round2(paid),
        balance,
        status: balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
      };
    });
};

// The effective "next/last due date" for an invoice: the earliest unpaid
// instalment's due date, else the invoice due date, else null.
const effectiveDueDate = (invoice, installments = []) => {
  const alloc = allocateInstalments(installments, invoice.amountPaid);
  const unpaid = alloc.find((i) => i.balance > 0);
  if (unpaid) return unpaid.dueDate;
  return invoice.dueDate || null;
};

module.exports = { allocateInstalments, effectiveDueDate };
