const { invoiceBalance, invoiceStatus, receiptNoFor } = require('../src/utils/feeMath');

describe('invoiceBalance', () => {
  test('total minus discount minus paid', () => {
    expect(invoiceBalance({ amountTotal: 500, discountAmount: 100, amountPaid: 250 })).toBe(150);
  });

  test('handles decimal strings from Prisma Decimal', () => {
    expect(invoiceBalance({ amountTotal: '1200.50', discountAmount: '0', amountPaid: '1200.50' })).toBe(0);
  });
});

describe('invoiceStatus', () => {
  test('unpaid when nothing paid', () => {
    expect(invoiceStatus({ amountTotal: 500, discountAmount: 0, amountPaid: 0, status: 'UNPAID' })).toBe('UNPAID');
  });

  test('partial when some paid', () => {
    expect(invoiceStatus({ amountTotal: 500, discountAmount: 0, amountPaid: 200, status: 'PARTIAL' })).toBe('PARTIAL');
  });

  test('paid when balance cleared', () => {
    expect(invoiceStatus({ amountTotal: 500, discountAmount: 100, amountPaid: 400, status: 'PAID' })).toBe('PAID');
  });

  test('waived stays waived', () => {
    expect(invoiceStatus({ amountTotal: 500, discountAmount: 0, amountPaid: 0, status: 'WAIVED' })).toBe('WAIVED');
  });
});

describe('receiptNoFor', () => {
  test('pads school and payment ids', () => {
    expect(receiptNoFor(3, 42)).toBe('RCPT-0003-000042');
  });
});
