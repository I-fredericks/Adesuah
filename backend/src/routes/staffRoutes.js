const express = require('express');
const router = express.Router();
const staff = require('../controllers/staffController');
const { protect, requirePermission, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, staffCreateSchema, staffUpdateSchema } = require('../middlewares/validation');

router.use(protect);

router.get('/', requirePermission('staff.view'), staff.listStaff);
router.post('/', requirePermission('staff.manage'), validate(staffCreateSchema), staff.createStaff);
router.put('/:id', requirePermission('staff.manage'), validate(staffUpdateSchema), staff.updateStaff);
router.post('/:id/reset-password', requirePermission('staff.reset_password'), staff.resetStaffPassword);

module.exports = router;
