const express = require('express');
const router = express.Router();
const assessments = require('../controllers/assessmentController');
const { protect, requireStaff, requireRole, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, scoreEntrySchema } = require('../middlewares/validation');

router.use(protect, requireStaff);

router.get('/sheet', assessments.getScoreSheet);
router.post('/scores', requireRole('OWNER', 'ADMIN', 'TEACHER'), validate(scoreEntrySchema), assessments.saveScores);
router.get('/results', assessments.getComputedResults);

module.exports = router;
