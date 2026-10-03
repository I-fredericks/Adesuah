const express = require('express');
const router = express.Router();
const students = require('../controllers/studentController');
const { protect, requireStaff, requireManagement, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, studentSchema, studentUpdateSchema, guardianSchema, promoteSchema } = require('../middlewares/validation');

router.use(protect, requireStaff);

router.get('/', students.listStudents);
router.post('/', requireManagement, validate(studentSchema), students.createStudent);
router.get('/:id', students.getStudent);
router.put('/:id', requireManagement, validate(studentUpdateSchema), students.updateStudent);
router.put('/:id/status', requireManagement, students.setStudentStatus);
router.put('/:id/transfer', requireManagement, students.transferClass);
router.post('/:id/guardians', requireManagement, validate(guardianSchema), students.addGuardian);
router.put('/:id/guardians/:guardianId', requireManagement, validate(guardianSchema), students.updateGuardian);
router.delete('/:id/guardians/:guardianId', requireManagement, students.deleteGuardian);
router.post('/promote', requireManagement, validate(promoteSchema), students.promoteClass);

module.exports = router;
