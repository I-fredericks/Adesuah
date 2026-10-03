const express = require('express');
const router = express.Router();
const reports = require('../controllers/reportController');
const { protect, requireStaff, requirePermission, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, publishReportsSchema, remarksSchema } = require('../middlewares/validation');

router.use(protect, requireStaff);

router.post('/publish', requirePermission('reports.publish'), validate(publishReportsSchema), reports.publishReports);
router.get('/student/:studentId', requirePermission('reports.view'), reports.getStudentReport);
router.get('/class', requirePermission('reports.view'), reports.getClassReports);
router.get('/broadsheet', requirePermission('reports.view'), reports.getBroadsheet);
router.put('/:id/remarks', requirePermission('reports.remarks'), validate(remarksSchema), reports.updateRemarks);

module.exports = router;
