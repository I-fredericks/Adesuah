const express = require('express');
const router = express.Router();
const students = require('../controllers/studentController');
const { protect, requireStaff, requirePermission, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, studentSchema, studentUpdateSchema, guardianSchema, promoteSchema } = require('../middlewares/validation');

router.use(protect, requireStaff);

router.get('/', students.listStudents);
router.post('/', requirePermission('students.create'), validate(studentSchema), students.createStudent);
router.get('/:id', students.getStudent);
router.post('/:id/photo', requirePermission('students.edit'), students.updatePhoto);
router.put('/:id', requirePermission('students.edit'), validate(studentUpdateSchema), students.updateStudent);
router.put('/:id/status', requirePermission('students.status'), students.setStudentStatus);
router.put('/:id/transfer', requirePermission('students.transfer'), students.transferClass);
router.post('/:id/guardians', requirePermission('students.edit'), validate(guardianSchema), students.addGuardian);
router.put('/:id/guardians/:guardianId', requirePermission('students.edit'), validate(guardianSchema), students.updateGuardian);
router.delete('/:id/guardians/:guardianId', requirePermission('students.edit'), students.deleteGuardian);
router.post('/promote', requirePermission('students.promote'), validate(promoteSchema), students.promoteClass);

module.exports = router;
