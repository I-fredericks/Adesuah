const express = require('express');
const router = express.Router();
const school = require('../controllers/schoolController');
const { protect, requireStaff, requirePermission, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, schoolUpdateSchema } = require('../middlewares/validation');

router.get('/mine', protect, requireStaff, school.getMySchool);
router.put('/mine', protect, requirePermission('school.settings'), validate(schoolUpdateSchema), school.updateMySchool);

module.exports = router;
