const express = require('express');
const router = express.Router();
const reports = require('../controllers/reportController');
const { protect, requireStaff, requireRole, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, publishReportsSchema, remarksSchema } = require('../middlewares/validation');

router.use(protect, requireStaff);

router.post('/publish', requireRole('OWNER', 'ADMIN', 'TEACHER'), validate(publishReportsSchema), reports.publishReports);
router.get('/student/:studentId', reports.getStudentReport);
router.get('/class', reports.getClassReports);
router.get('/broadsheet', reports.getBroadsheet);
router.put('/:id/remarks', validate(remarksSchema), reports.updateRemarks);

module.exports = router;
