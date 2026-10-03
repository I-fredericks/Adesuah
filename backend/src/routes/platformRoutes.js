const express = require('express');
const router = express.Router();
const platform = require('../controllers/platformController');
const { protect, requirePlatform } = require('../middlewares/authMiddleware');
const { validate, platformSchoolSchema, platformStatusSchema } = require('../middlewares/validation');

router.use(protect, requirePlatform);

router.get('/stats', platform.platformStats);
router.get('/schools', platform.listSchools);
router.post('/schools', validate(platformSchoolSchema), platform.createSchool);
router.get('/schools/:id', platform.getSchool);
router.put('/schools/:id/status', validate(platformStatusSchema), platform.updateSchoolStatus);

module.exports = router;
