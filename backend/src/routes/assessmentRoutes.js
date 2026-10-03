const express = require('express');
const router = express.Router();
const assessments = require('../controllers/assessmentController');
const { protect, requireStaff, requirePermission, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, scoreEntrySchema } = require('../middlewares/validation');

router.use(protect, requireStaff);

router.get('/sheet', requirePermission('grades.view'), assessments.getScoreSheet);
router.post('/scores', requirePermission('grades.enter'), validate(scoreEntrySchema), assessments.saveScores);
router.get('/results', requirePermission('grades.view'), assessments.getComputedResults);

module.exports = router;
