const express = require('express');
const router = express.Router();
const corrections = require('../controllers/correctionController');
const staffAttendance = require('../controllers/staffAttendanceController');
const { protect, requireStaff, requirePermission } = require('../middlewares/authMiddleware');
const { validate, correctionRequestSchema, correctionDecisionSchema, staffAttendanceMarkSchema } = require('../middlewares/validation');

// Result corrections
router.get('/corrections', protect, requireStaff, corrections.listCorrections);
router.post('/corrections', protect, requirePermission('grades.enter'), validate(correctionRequestSchema), corrections.requestCorrection);
router.post('/corrections/:id/decide', protect, requirePermission('grades.approve'), validate(correctionDecisionSchema), corrections.decideCorrection);

// Audit trail
router.get('/audit-logs', protect, requirePermission('grades.approve'), corrections.listAuditLogs);

// Staff attendance
router.get('/staff-attendance', protect, requirePermission('staff.view'), staffAttendance.getRegister);
router.post('/staff-attendance', protect, requirePermission('attendance.enter'), requirePermission('staff.view'), validate(staffAttendanceMarkSchema), staffAttendance.mark);
router.get('/staff-attendance/stats', protect, requirePermission('staff.view'), staffAttendance.stats);

module.exports = router;
