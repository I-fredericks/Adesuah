const round2 = (v) => Math.round(v * 100) / 100;

const toNum = (v) => (v === null || v === undefined ? 0 : Number(v));

const weightedSubjectTotal = (entries, assessmentTypes) => {
  if (!entries || entries.length === 0) return null;
  const weightById = new Map(assessmentTypes.map((t) => [t.id, t.weight]));
  let total = 0;
  let counted = 0;
  for (const e of entries) {
    const weight = weightById.get(e.assessmentTypeId);
    if (weight === undefined || e.rawScore === null || e.rawScore === undefined) continue;
    total += (e.rawScore * weight) / 100;
    counted += 1;
  }
  if (counted === 0) return null;
  return round2(total);
};

const gradeFrom = (total, scales) => {
  if (total === null || total === undefined || !scales || scales.length === 0) return null;
  const sorted = [...scales].sort((a, b) => b.maxScore - a.maxScore);
  for (const s of sorted) {
    if (total >= s.minScore && total <= s.maxScore) {
      return { grade: s.grade, descriptor: s.descriptor, remark: s.remark };
    }
  }
  return null;
};

const competitionRanks = (values) => {
  const indexed = values
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v !== null && x.v !== undefined)
    .sort((a, b) => b.v - a.v);
  const ranks = new Array(values.length).fill(null);
  let lastValue = null;
  let lastRank = 0;
  indexed.forEach((entry, pos) => {
    const rank = lastValue !== null && entry.v === lastValue ? lastRank : pos + 1;
    ranks[entry.i] = rank;
    lastValue = entry.v;
    lastRank = rank;
  });
  return ranks;
};

const ordinalSuffix = (n) => {
  if (n === null || n === undefined) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const teacherRemarkFromAverage = (avg) => {
  if (avg === null || avg === undefined) return '';
  if (avg >= 80) return 'An excellent result. Keep it up.';
  if (avg >= 70) return 'A very good performance. Aim even higher.';
  if (avg >= 60) return 'Good work. A little more effort will take you far.';
  if (avg >= 50) return 'A fairly good performance. Work harder next term.';
  if (avg >= 40) return 'You can do much better. Take your studies seriously.';
  return 'Poor performance. Serious improvement is needed.';
};

const headRemarkFromAverage = (avg) => {
  if (avg === null || avg === undefined) return '';
  if (avg >= 80) return 'Excellent performance. The school is proud of you.';
  if (avg >= 70) return 'Very good result. Keep soaring.';
  if (avg >= 60) return 'Good result. Strive for excellence.';
  if (avg >= 50) return 'An average result. Put in more effort.';
  if (avg >= 40) return 'Below average. Parents should take note.';
  return 'Unsatisfactory. Must sit up.';
};

module.exports = {
  round2,
  toNum,
  weightedSubjectTotal,
  gradeFrom,
  competitionRanks,
  ordinalSuffix,
  teacherRemarkFromAverage,
  headRemarkFromAverage,
};
