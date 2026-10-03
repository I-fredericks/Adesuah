const prisma = require('../config/db');

const DEFAULT_LEVELS = [
  { name: 'KG 1', code: 'KG1', stage: 'KG', order: 1 },
  { name: 'KG 2', code: 'KG2', stage: 'KG', order: 2 },
  { name: 'Primary 1', code: 'P1', stage: 'PRIMARY', order: 3 },
  { name: 'Primary 2', code: 'P2', stage: 'PRIMARY', order: 4 },
  { name: 'Primary 3', code: 'P3', stage: 'PRIMARY', order: 5 },
  { name: 'Primary 4', code: 'P4', stage: 'PRIMARY', order: 6 },
  { name: 'Primary 5', code: 'P5', stage: 'PRIMARY', order: 7 },
  { name: 'Primary 6', code: 'P6', stage: 'PRIMARY', order: 8 },
  { name: 'JHS 1', code: 'JHS1', stage: 'JHS', order: 9 },
  { name: 'JHS 2', code: 'JHS2', stage: 'JHS', order: 10 },
  { name: 'JHS 3', code: 'JHS3', stage: 'JHS', order: 11 },
];

const DEFAULT_SUBJECTS = [
  { name: 'English Language', code: 'ENG' },
  { name: 'Mathematics', code: 'MATH' },
  { name: 'Integrated Science', code: 'SCI' },
  { name: 'Social Studies', code: 'SOC' },
  { name: 'Religious & Moral Education', code: 'RME' },
  { name: 'Our World Our People', code: 'OWOP' },
  { name: 'Creative Arts & Design', code: 'CAD' },
  { name: 'Career Technology', code: 'CT' },
  { name: 'Computing', code: 'ICT' },
  { name: 'Ghanaian Language', code: 'GHL' },
  { name: 'French', code: 'FRE' },
  { name: 'History', code: 'HIST' },
];

const DEFAULT_ASSESSMENT_TYPES = [
  { name: 'Class Exercise', shortCode: 'CE', weight: 10, order: 1 },
  { name: 'Homework', shortCode: 'HW', weight: 10, order: 2 },
  { name: 'Group Work', shortCode: 'GW', weight: 10, order: 3 },
  { name: 'Mid-Term Exam', shortCode: 'MT', weight: 20, order: 4 },
  { name: 'End-of-Term Exam', shortCode: 'ET', weight: 50, order: 5 },
];

const BECE_GRADING = [
  { grade: '1', minScore: 80, maxScore: 100, descriptor: 'Excellent', remark: 'Excellent' },
  { grade: '2', minScore: 75, maxScore: 79.99, descriptor: 'Very Good', remark: 'Very good' },
  { grade: '3', minScore: 70, maxScore: 74.99, descriptor: 'Good', remark: 'Good' },
  { grade: '4', minScore: 65, maxScore: 69.99, descriptor: 'Credit', remark: 'Credit' },
  { grade: '5', minScore: 60, maxScore: 64.99, descriptor: 'Credit', remark: 'Credit' },
  { grade: '6', minScore: 55, maxScore: 59.99, descriptor: 'Credit', remark: 'Credit' },
  { grade: '7', minScore: 50, maxScore: 54.99, descriptor: 'Pass', remark: 'Pass' },
  { grade: '8', minScore: 45, maxScore: 49.99, descriptor: 'Pass', remark: 'Pass' },
  { grade: '9', minScore: 0, maxScore: 44.99, descriptor: 'Fail', remark: 'Fail' },
];

const STANDARDS_BASED_GRADING = [
  { grade: 'A', minScore: 80, maxScore: 100, descriptor: 'Advanced Proficient', remark: 'Excellent' },
  { grade: 'B', minScore: 60, maxScore: 79.99, descriptor: 'Proficient', remark: 'Very good' },
  { grade: 'C', minScore: 40, maxScore: 59.99, descriptor: 'Approaching Proficiency', remark: 'Good, keep improving' },
  { grade: 'D', minScore: 0, maxScore: 39.99, descriptor: 'Below Proficiency', remark: 'Needs support' },
];

const STAGE_SUBJECT_CODES = {
  KG: ['ENG', 'MATH', 'CAD', 'GHL'],
  PRIMARY: ['ENG', 'MATH', 'SCI', 'OWOP', 'RME', 'CAD', 'ICT', 'GHL', 'HIST'],
  JHS: ['ENG', 'MATH', 'SCI', 'SOC', 'RME', 'CT', 'CAD', 'ICT', 'GHL', 'FRE', 'HIST'],
};

const defaultAcademicYear = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const y = startYear;
  return {
    name: `${y}/${y + 1}`,
    startDate: `${y}-09-01`,
    endDate: `${y + 1}-07-31`,
    terms: [
      { name: 'TERM_1', startDate: `${y}-09-08`, endDate: `${y}-12-18` },
      { name: 'TERM_2', startDate: `${y + 1}-01-06`, endDate: `${y + 1}-03-27` },
      { name: 'TERM_3', startDate: `${y + 1}-04-13`, endDate: `${y + 1}-07-30` },
    ],
  };
};

const slugify = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'school';

const uniqueSlug = async (base) => {
  let slug = slugify(base);
  let n = 1;
  while (await prisma.school.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
};

const seedSchoolDefaults = async (schoolId, academicYearOptions = {}) => {
  const year = { ...defaultAcademicYear(), ...academicYearOptions };

  const levels = await Promise.all(
    DEFAULT_LEVELS.map((l) =>
      prisma.level.create({ data: { ...l, schoolId } })
    )
  );

  await Promise.all(
    DEFAULT_SUBJECTS.map((s) => prisma.subject.create({ data: { ...s, schoolId } }))
  );

  await Promise.all(
    DEFAULT_ASSESSMENT_TYPES.map((t) =>
      prisma.assessmentType.create({ data: { ...t, schoolId } })
    )
  );

  await prisma.gradingScale.createMany({
    data: BECE_GRADING.map((g, i) => ({ ...g, schoolId, levelId: null, order: i + 1 })),
  });

  const kgLevels = levels.filter((l) => l.stage === 'KG');
  for (const level of kgLevels) {
    await prisma.gradingScale.createMany({
      data: STANDARDS_BASED_GRADING.map((g, i) => ({ ...g, schoolId, levelId: level.id, order: i + 1 })),
    });
  }

  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId,
      name: year.name,
      startDate: new Date(year.startDate),
      endDate: new Date(year.endDate),
      isCurrent: true,
    },
  });

  await prisma.term.createMany({
    data: year.terms.map((t, i) => ({
      schoolId,
      academicYearId: academicYear.id,
      name: t.name,
      startDate: new Date(t.startDate),
      endDate: new Date(t.endDate),
      isCurrent: i === 0,
    })),
  });

  const subjects = await prisma.subject.findMany({ where: { schoolId } });
  const subjectByCode = new Map(subjects.map((s) => [s.code || s.name.toUpperCase(), s]));

  await Promise.all(
    levels.map((level) => {
      const classSubjects = (STAGE_SUBJECT_CODES[level.stage] || [])
        .map((code) => subjectByCode.get(code))
        .filter(Boolean);
      return prisma.schoolClass.create({
        data: {
          schoolId,
          levelId: level.id,
          name: level.name,
          subjects: {
            create: classSubjects.map((s) => ({ schoolId, subjectId: s.id })),
          },
        },
      });
    })
  );

  return { academicYear, levels };
};

module.exports = {
  DEFAULT_LEVELS,
  DEFAULT_SUBJECTS,
  DEFAULT_ASSESSMENT_TYPES,
  BECE_GRADING,
  STANDARDS_BASED_GRADING,
  defaultAcademicYear,
  slugify,
  uniqueSlug,
  seedSchoolDefaults,
};
