import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, EmptyState, Modal } from '../components/ui';

const ScoreEntry = () => {
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [scores, setScores] = useState({});
  const [saved, setSaved] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState({ studentId: '', assessmentTypeId: '', newScore: '', reason: '' });
  const [correctionMsg, setCorrectionMsg] = useState('');
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ['sheet'] });
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
        actions={
          data?.students.length > 0 && (
            data.locked ? (
              <button className="btn-secondary" onClick={() => setShowCorrection(true)}>
                Request score correction
              </button>
            ) : (
              <button className="btn-primary" onClick={submit} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save scores'}
              </button>
            )
          )
        }
      />

      {data?.locked && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Results for this class and term are <strong>locked</strong>. Scores cannot be edited directly —
          use “Request score correction” to propose a change for approval. All changes are audit-logged.
        </div>
      )}
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

      {showCorrection && data && (
        <Modal open onClose={() => setShowCorrection(false)} title="Request score correction">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setCorrectionMsg('');
              try {
                await api.post('/operations/corrections', {
                  studentId: Number(correction.studentId),
                  subjectId: Number(subjectId),
                  termId: Number(effectiveTerm),
                  assessmentTypeId: Number(correction.assessmentTypeId),
                  newScore: Number(correction.newScore),
                  reason: correction.reason,
                });
                setCorrectionMsg('Request submitted — an approver will review it.');
                setCorrection({ studentId: '', assessmentTypeId: '', newScore: '', reason: '' });
                queryClient.invalidateQueries({ queryKey: ['corrections'] });
              } catch (err) {
                setCorrectionMsg(getErrorMessage(err));
              }
            }}
            className="space-y-4"
          >
            {correctionMsg && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{correctionMsg}</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Pupil *</label>
                <select className="input" value={correction.studentId} onChange={(e) => setCorrection((c) => ({ ...c, studentId: e.target.value }))} required>
                  <option value="">Select…</option>
                  {data.students.map((s) => (
                    <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Assessment *</label>
                <select className="input" value={correction.assessmentTypeId} onChange={(e) => setCorrection((c) => ({ ...c, assessmentTypeId: e.target.value }))} required>
                  <option value="">Select…</option>
                  {data.assessmentTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.weight}%)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Corrected score * (current scores shown above)</label>
                <input className="input" type="number" min="0" max="100" value={correction.newScore} onChange={(e) => setCorrection((c) => ({ ...c, newScore: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Reason * (min 5 characters)</label>
                <input className="input" value={correction.reason} onChange={(e) => setCorrection((c) => ({ ...c, reason: e.target.value }))} required minLength={5} />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Your request goes to an approver (headteacher/proprietor). If approved, the score is
              updated and the report card recomputed — all audit-logged.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowCorrection(false)}>Close</button>
              <button className="btn-primary">Submit request</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ScoreEntry;
