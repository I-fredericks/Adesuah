const express = require('express');
const router = express.Router();
const school = require('../controllers/schoolController');
const { protect, requireManagement, requireStaff, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, schoolUpdateSchema } = require('../middlewares/validation');

router.get('/mine', protect, requireStaff, school.getMySchool);
router.put('/mine', protect, requireManagement, validate(schoolUpdateSchema), school.updateMySchool);

module.exports = router;
