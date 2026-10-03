const express = require('express');
const router = express.Router();
const attendance = require('../controllers/attendanceController');
const { protect, requireStaff, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, attendanceMarkSchema } = require('../middlewares/validation');

router.use(protect, requireStaff);

router.post('/mark', validate(attendanceMarkSchema), attendance.markAttendance);
router.get('/register', attendance.getRegister);
router.get('/stats', attendance.attendanceStats);

module.exports = router;
