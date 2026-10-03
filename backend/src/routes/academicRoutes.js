const express = require('express');
const router = express.Router();
const academic = require('../controllers/academicController');
const { protect, requireStaff, requireManagement, requireRole, resolveSchoolId } = require('../middlewares/authMiddleware');
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
} = require('../middlewares/validation');

router.use(protect, requireStaff);

router.get('/years', academic.listYears);
router.post('/years', requireManagement, validate(academicYearSchema), academic.createYear);
router.put('/years/:id', requireManagement, validate(academicYearSchema.partial()), academic.updateYear);
router.put('/years/:id/current', requireManagement, academic.setCurrentYear);

router.get('/terms', academic.listTerms);
router.post('/terms', requireManagement, validate(termSchema), academic.createTerm);
router.put('/terms/:id', requireManagement, validate(termSchema.partial()), academic.updateTerm);
router.put('/terms/:id/current', requireManagement, academic.setCurrentTerm);

router.get('/levels', academic.listLevels);
router.post('/levels', requireManagement, validate(levelSchema), academic.createLevel);
router.put('/levels/:id', requireManagement, validate(levelSchema.partial()), academic.updateLevel);

router.get('/classes', academic.listClasses);
router.post('/classes', requireManagement, validate(schoolClassSchema), academic.createClass);
router.put('/classes/:id', requireManagement, validate(schoolClassSchema.partial()), academic.updateClass);
router.get('/classes/:id/roster', academic.classRoster);

router.get('/subjects', academic.listSubjects);
router.post('/subjects', requireManagement, validate(subjectSchema), academic.createSubject);
router.put('/subjects/:id', requireManagement, validate(subjectSchema.partial()), academic.updateSubject);
router.delete('/subjects/:id', requireManagement, academic.deleteSubject);

router.get('/class-subjects', academic.listClassSubjects);
router.put('/class-subjects', requireRole('OWNER', 'ADMIN', 'TEACHER'), validate(classSubjectBulkSchema), academic.bulkSetClassSubjects);

router.get('/assessment-types', academic.listAssessmentTypes);
router.post('/assessment-types', requireManagement, validate(assessmentTypeSchema), academic.createAssessmentType);
router.put('/assessment-types/:id', requireManagement, validate(assessmentTypeSchema.partial()), academic.updateAssessmentType);
router.delete('/assessment-types/:id', requireManagement, academic.deleteAssessmentType);

router.get('/grading-scales', academic.listGradingScales);
router.put('/grading-scales', requireManagement, validate(gradingScaleSchema), academic.setGradingScale);

module.exports = router;
