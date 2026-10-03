const express = require('express');
const router = express.Router();
const fees = require('../controllers/feeController');
const { protect, requireStaff, requireRole, resolveSchoolId } = require('../middlewares/authMiddleware');
const {
  validate,
  feeStructureSchema,
  generateInvoicesSchema,
  paymentSchema,
  discountSchema,
} = require('../middlewares/validation');

router.use(protect, requireStaff);

router.get('/structures', fees.listStructures);
router.post('/structures', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), validate(feeStructureSchema), fees.createStructure);
router.put('/structures/:id', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), fees.updateStructure);
router.delete('/structures/:id', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), fees.deleteStructure);

router.post('/invoices/generate', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), validate(generateInvoicesSchema), fees.generateInvoices);
router.get('/invoices', fees.listInvoices);
router.get('/invoices/:id', fees.getInvoice);
router.put('/invoices/:id/discount', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), validate(discountSchema), fees.setDiscount);
router.post('/invoices/:id/remind', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), fees.remindInvoice);

router.post('/payments', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), validate(paymentSchema), fees.recordPayment);
router.get('/payments', fees.listPayments);

router.get('/debtors', fees.getDebtors);
router.get('/summary', fees.getFeeSummary);

module.exports = router;
