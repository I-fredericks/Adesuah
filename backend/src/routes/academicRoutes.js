const express = require('express');
const router = express.Router();
const academic = require('../controllers/academicController');
const { protect, requireStaff, requirePermission, resolveSchoolId } = require('../middlewares/authMiddleware');
const {
  validate,
  academicYearSchema,
  termSchema,
  levelSchema,
  schoolClassSchema,
  subjectSchema,
  classSubjectBulkSchema,
  assessmentTypeSchema,
  gradingScaleSchema,
  rolePermissionsSchema,
} = require('../middlewares/validation');

router.use(protect, requireStaff);

router.get('/permissions', academic.getPermissionMatrix);
router.put('/roles/:role/permissions', requirePermission('roles.manage'), validate(rolePermissionsSchema), academic.setRolePerms);
router.post('/roles/:role/reset', requirePermission('roles.manage'), academic.resetRolePerms);

router.get('/years', academic.listYears);
router.post('/years', requirePermission('academics.manage'), validate(academicYearSchema), academic.createYear);
router.put('/years/:id', requirePermission('academics.manage'), validate(academicYearSchema.partial()), academic.updateYear);
router.put('/years/:id/current', requirePermission('academics.manage'), academic.setCurrentYear);

router.get('/terms', academic.listTerms);
router.post('/terms', requirePermission('academics.manage'), validate(termSchema), academic.createTerm);
router.put('/terms/:id', requirePermission('academics.manage'), validate(termSchema.partial()), academic.updateTerm);
router.put('/terms/:id/current', requirePermission('academics.manage'), academic.setCurrentTerm);

router.get('/levels', academic.listLevels);
router.post('/levels', requirePermission('academics.manage'), validate(levelSchema), academic.createLevel);
router.put('/levels/:id', requirePermission('academics.manage'), validate(levelSchema.partial()), academic.updateLevel);

router.get('/classes', academic.listClasses);
router.post('/classes', requirePermission('academics.manage'), validate(schoolClassSchema), academic.createClass);
router.put('/classes/:id', requirePermission('academics.manage'), validate(schoolClassSchema.partial()), academic.updateClass);
router.get('/classes/:id/roster', academic.classRoster);

router.get('/subjects', academic.listSubjects);
router.post('/subjects', requirePermission('academics.manage'), validate(subjectSchema), academic.createSubject);
router.put('/subjects/:id', requirePermission('academics.manage'), validate(subjectSchema.partial()), academic.updateSubject);
router.delete('/subjects/:id', requirePermission('academics.manage'), academic.deleteSubject);

router.get('/class-subjects', academic.listClassSubjects);
router.put('/class-subjects', requirePermission('academics.manage'), validate(classSubjectBulkSchema), academic.bulkSetClassSubjects);

router.get('/assessment-types', academic.listAssessmentTypes);
router.post('/assessment-types', requirePermission('academics.manage'), validate(assessmentTypeSchema), academic.createAssessmentType);
router.put('/assessment-types/:id', requirePermission('academics.manage'), validate(assessmentTypeSchema.partial()), academic.updateAssessmentType);
router.delete('/assessment-types/:id', requirePermission('academics.manage'), academic.deleteAssessmentType);

router.get('/grading-scales', academic.listGradingScales);
router.put('/grading-scales', requirePermission('academics.manage'), validate(gradingScaleSchema), academic.setGradingScale);

module.exports = router;
