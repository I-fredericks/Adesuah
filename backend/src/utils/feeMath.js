const { toNum, round2 } = require('./grading');

const invoiceBalance = (invoice) =>
  round2(toNum(invoice.amountTotal) - toNum(invoice.discountAmount) - toNum(invoice.amountPaid));

const invoiceStatus = (invoice) => {
  if (invoice.status === 'WAIVED') return 'WAIVED';
  const balance = invoiceBalance(invoice);
  if (balance <= 0) return 'PAID';
  if (toNum(invoice.amountPaid) > 0) return 'PARTIAL';
  return 'UNPAID';
};

const receiptNoFor = (schoolId, paymentId) =>
  `RCPT-${String(schoolId).padStart(4, '0')}-${String(paymentId).padStart(6, '0')}`;

module.exports = { invoiceBalance, invoiceStatus, receiptNoFor };
