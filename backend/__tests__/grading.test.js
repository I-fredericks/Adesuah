const {
  weightedSubjectTotal,
  gradeFrom,
  competitionRanks,
  ordinalSuffix,
  round2,
  teacherRemarkFromAverage,
  headRemarkFromAverage,
} = require('../src/utils/grading');

describe('weightedSubjectTotal', () => {
  const types = [
    { id: 1, weight: 10 },
    { id: 2, weight: 10 },
    { id: 3, weight: 20 },
    { id: 4, weight: 60 },
  ];

  test('weights scores to a 100 total', () => {
    const entries = [
      { assessmentTypeId: 1, rawScore: 80 },
      { assessmentTypeId: 2, rawScore: 70 },
      { assessmentTypeId: 3, rawScore: 60 },
      { assessmentTypeId: 4, rawScore: 50 },
    ];
    expect(weightedSubjectTotal(entries, types)).toBe(57);
  });

  test('returns null when no scores are entered', () => {
    expect(weightedSubjectTotal([], types)).toBeNull();
    expect(weightedSubjectTotal([{ assessmentTypeId: 1, rawScore: null }], types)).toBeNull();
  });

  test('partial entry scales down (missing components count as zero)', () => {
    const entries = [{ assessmentTypeId: 4, rawScore: 100 }];
    expect(weightedSubjectTotal(entries, types)).toBe(60);
  });
});

describe('gradeFrom with BECE scale', () => {
  const bece = [
    { grade: '1', minScore: 80, maxScore: 100 },
    { grade: '2', minScore: 75, maxScore: 79.99 },
    { grade: '9', minScore: 0, maxScore: 44.99 },
  ];

  test('matches correct band', () => {
    expect(gradeFrom(85, bece).grade).toBe('1');
    expect(gradeFrom(76, bece).grade).toBe('2');
    expect(gradeFrom(30, bece).grade).toBe('9');
  });

  test('boundary values inclusive', () => {
    expect(gradeFrom(80, bece).grade).toBe('1');
    expect(gradeFrom(79.99, bece).grade).toBe('2');
  });

  test('returns null for null total', () => {
    expect(gradeFrom(null, bece)).toBeNull();
  });
});

describe('competitionRanks', () => {
  test('ties share a rank, next rank skips', () => {
    expect(competitionRanks([90, 80, 80, 70])).toEqual([1, 2, 2, 4]);
  });

  test('null values are unranked', () => {
    expect(competitionRanks([50, null, 60])).toEqual([2, null, 1]);
  });

  test('empty input', () => {
    expect(competitionRanks([])).toEqual([]);
  });
});

describe('formatting helpers', () => {
  test('round2', () => {
    expect(round2(1.005)).toBe(1);
    expect(round2(55.555)).toBe(55.56);
  });

  test('ordinalSuffix', () => {
    expect(ordinalSuffix(1)).toBe('1st');
    expect(ordinalSuffix(2)).toBe('2nd');
    expect(ordinalSuffix(3)).toBe('3rd');
    expect(ordinalSuffix(4)).toBe('4th');
    expect(ordinalSuffix(11)).toBe('11th');
    expect(ordinalSuffix(21)).toBe('21st');
  });

  test('remarks bands', () => {
    expect(teacherRemarkFromAverage(85)).toMatch(/excellent/i);
    expect(teacherRemarkFromAverage(45)).toMatch(/better/i);
    expect(headRemarkFromAverage(20)).toMatch(/sit up/i);
    expect(teacherRemarkFromAverage(null)).toBe('');
  });
});
