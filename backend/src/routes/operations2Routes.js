const express = require('express');
const router = express.Router();
const payroll = require('../controllers/payrollController');
const extraClasses = require('../controllers/extraClassController');
const assignments = require('../controllers/assignmentController');
const { protect, requireStaff, requirePermission } = require('../middlewares/authMiddleware');
const { validate, salarySchema, extraClassSchema, extraClassStatusSchema, assignmentSchema } = require('../middlewares/validation');

// Payroll: staff always see their own; view_all/record are permission-gated
router.get('/salary/mine', protect, payroll.mySalaries);
router.get('/salary', protect, requirePermission('payroll.view_all'), payroll.listSalaries);
router.post('/salary', protect, requirePermission('payroll.record'), validate(salarySchema), payroll.recordSalary);

// Extra classes (morning classes etc.) — head/proprietor manage
router.get('/extra-classes', protect, requireStaff, extraClasses.list);
router.post('/extra-classes', protect, requirePermission('academics.manage'), validate(extraClassSchema), extraClasses.create);
router.put('/extra-classes/:id', protect, requirePermission('academics.manage'), extraClasses.update);
router.post('/extra-classes/:id/status', protect, requirePermission('academics.manage'), validate(extraClassStatusSchema), extraClasses.setStatus);

// Assignments / homework
router.get('/assignments', protect, requireStaff, assignments.list);
router.post('/assignments', protect, requirePermission('grades.enter'), validate(assignmentSchema), assignments.create);
router.delete('/assignments/:id', protect, requireStaff, assignments.remove);

module.exports = router;
