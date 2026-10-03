const express = require('express');
const router = express.Router();
const fees = require('../controllers/feeController');
const { protect, requireStaff, requirePermission, resolveSchoolId } = require('../middlewares/authMiddleware');
const {
  validate,
  feeStructureSchema,
  generateInvoicesSchema,
  paymentSchema,
  discountSchema,
} = require('../middlewares/validation');

router.use(protect, requireStaff);

router.get('/structures', requirePermission('fees.view'), fees.listStructures);
router.post('/structures', requirePermission('fees.structure_manage'), validate(feeStructureSchema), fees.createStructure);
router.put('/structures/:id', requirePermission('fees.structure_manage'), fees.updateStructure);
router.delete('/structures/:id', requirePermission('fees.structure_manage'), fees.deleteStructure);

router.post('/invoices/generate', requirePermission('fees.invoice_generate'), validate(generateInvoicesSchema), fees.generateInvoices);
router.get('/invoices', requirePermission('fees.view'), fees.listInvoices);
router.get('/invoices/:id', requirePermission('fees.view'), fees.getInvoice);
router.put('/invoices/:id/discount', requirePermission('fees.discount'), validate(discountSchema), fees.setDiscount);
router.post('/invoices/:id/remind', requirePermission('fees.remind'), fees.remindInvoice);

router.post('/payments', requirePermission('fees.payment_record'), validate(paymentSchema), fees.recordPayment);
router.get('/payments', requirePermission('fees.view'), fees.listPayments);

router.get('/debtors', requirePermission('fees.reports'), fees.getDebtors);
router.get('/summary', requirePermission('fees.view'), fees.getFeeSummary);

module.exports = router;
