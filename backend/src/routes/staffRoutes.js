const express = require('express');
const router = express.Router();
const staff = require('../controllers/staffController');
const { protect, requireManagement, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, staffCreateSchema, staffUpdateSchema } = require('../middlewares/validation');

router.use(protect, requireManagement);

router.get('/', staff.listStaff);
router.post('/', validate(staffCreateSchema), staff.createStaff);
router.put('/:id', validate(staffUpdateSchema), staff.updateStaff);
router.post('/:id/reset-password', staff.resetStaffPassword);

module.exports = router;
