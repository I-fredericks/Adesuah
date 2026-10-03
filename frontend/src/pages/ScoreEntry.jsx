import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const ScoreEntry = () => {
  const { can } = useAuth();
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [scores, setScores] = useState({});
  const [saved, setSaved] = useState(false);

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/academic/classes').then((r) => r.data),
  });
  const { data: termsData } = useQuery({
    queryKey: ['terms'],
    queryFn: () => api.get('/academic/terms').then((r) => r.data),
  });
  const currentTerm = termsData?.terms.find((t) => t.isCurrent);
  const [termId, setTermId] = useState('');

  const effectiveTerm = termId || currentTerm?.id || '';

  const { data: classSubjects } = useQuery({
    queryKey: ['classSubjects', classId],
    queryFn: () => api.get('/academic/class-subjects', { params: { classId } }).then((r) => r.data),
    enabled: !!classId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sheet', classId, subjectId, effectiveTerm],
    queryFn: () =>
      api
        .get('/assessments/sheet', { params: { classId, subjectId, termId: effectiveTerm } })
        .then((r) => r.data),
    enabled: !!classId && !!subjectId && !!effectiveTerm,
  });

  const save = useMutation({
    mutationFn: (entries) =>
      api.post('/assessments/scores', {
        classId: Number(classId),
        subjectId: Number(subjectId),
        termId: Number(effectiveTerm),
        entries,
      }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const submit = () => {
    const entries = [];
    (data?.students || []).forEach((s) => {
      (data?.assessmentTypes || []).forEach((t) => {
        const value = scores[`${s.id}:${t.id}`];
        entries.push({
          studentId: s.id,
          assessmentTypeId: t.id,
          rawScore: value === '' || value === undefined ? null : Number(value),
        });
      });
    });
    save.mutate(entries);
  };

  const classes = classesData?.classes || [];

  return (
    <div>
      <PageHeader
        title="Score entry"
        subtitle="Enter raw scores — totals, grades and positions are computed automatically"
        actions={can('grades.enter') && data?.students.length > 0 && (
          <button className="btn-primary" onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save scores'}
          </button>
        )}
      />
      {save.isError && (
        <p className="mb-4 text-sm text-red-600">{getErrorMessage(save.error)}</p>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <select className="input max-w-48" value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(''); setScores({}); }}>
          <option value="">Select class…</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input max-w-52" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setScores({}); }} disabled={!classId}>
          <option value="">Select subject…</option>
          {(classSubjects?.classSubjects || []).map((cs) => (
            <option key={cs.id} value={cs.subject.id}>{cs.subject.name}</option>
          ))}
        </select>
        <select className="input max-w-40" value={effectiveTerm} onChange={(e) => setTermId(e.target.value)}>
          {(termsData?.terms || []).map((t) => (
            <option key={t.id} value={t.id}>{t.name.replace('TERM_', 'Term ')}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Spinner className="mx-auto h-8 w-8" />
      ) : !classId || !subjectId ? (
        <EmptyState message="Choose a class and subject to enter scores" />
      ) : !data || data.students.length === 0 ? (
        <EmptyState message="No active students in this class" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Pupil</th>
                {data.assessmentTypes.map((t) => (
                  <th key={t.id} className="th text-center">
                    {t.shortCode || t.name}
                    <span className="block text-[10px] font-normal normal-case text-slate-400">{t.weight}%</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.students.map((s) => (
                <tr key={s.id}>
                  <td className="td">
                    <span className="font-medium">{s.lastName}, {s.firstName}</span>
                    <span className="ml-2 font-mono text-xs text-slate-400">{s.admissionNo}</span>
                  </td>
                  {data.assessmentTypes.map((t) => {
                    const key = `${s.id}:${t.id}`;
                    return (
                      <td key={t.id} className="td text-center">
                        <input
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-brand-500 focus:outline-none"
                          type="number"
                          min={0}
                          max={100}
                          value={scores[key] ?? data.students.find((x) => x.id === s.id)?.scores[t.id] ?? ''}
                          onChange={(e) => setScores((m) => ({ ...m, [key]: e.target.value }))}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {data.teacher && (
            <p className="border-t px-4 py-2 text-xs text-slate-400">Subject teacher: {data.teacher.name}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ScoreEntry;
