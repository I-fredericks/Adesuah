const express = require('express');
const router = express.Router();
const attendance = require('../controllers/attendanceController');
const { protect, requireStaff, requirePermission, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, attendanceMarkSchema } = require('../middlewares/validation');

router.use(protect, requireStaff);

router.post('/mark', requirePermission('attendance.enter'), validate(attendanceMarkSchema), attendance.markAttendance);
router.get('/register', requirePermission('attendance.view'), attendance.getRegister);
router.get('/stats', requirePermission('attendance.view'), attendance.attendanceStats);

module.exports = router;
