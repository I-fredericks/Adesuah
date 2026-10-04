import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, ErrorNote, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const TABS = ['Classes', 'Subjects', 'Teacher Allocation', 'Assessment Types', 'Grading', 'Academic Year'];

const Academics = () => {
  const { can } = useAuth();
  const [tab, setTab] = useState('Classes');
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [newClass, setNewClass] = useState({ levelId: '', name: '' });
  const [newSubject, setNewSubject] = useState({ name: '', code: '' });

  const { data: levelsData, isLoading } = useQuery({
    queryKey: ['levels'],
    queryFn: () => api.get('/academic/levels').then((r) => r.data),
  });
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/academic/classes').then((r) => r.data),
  });
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/academic/subjects').then((r) => r.data),
  });
  const { data: typesData } = useQuery({
    queryKey: ['assessmentTypes'],
    queryFn: () => api.get('/academic/assessment-types').then((r) => r.data),
  });
  const { data: scalesData } = useQuery({
    queryKey: ['gradingScales'],
    queryFn: () => api.get('/academic/grading-scales').then((r) => r.data),
  });
  const { data: yearsData } = useQuery({
    queryKey: ['years'],
    queryFn: () => api.get('/academic/years').then((r) => r.data),
  });

  const createClass = useMutation({
    mutationFn: (payload) => api.post('/academic/classes', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setNewClass({ levelId: '', name: '' });
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });
  const createSubject = useMutation({
    mutationFn: (payload) => api.post('/academic/subjects', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewSubject({ name: '', code: '' });
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });
  const setCurrentYear = useMutation({
    mutationFn: (id) => api.put(`/academic/years/${id}/current`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['years'] }),
  });
  const setCurrentTerm = useMutation({
    mutationFn: (id) => api.put(`/academic/terms/${id}/current`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['years'] }),
  });

  if (isLoading) return <SkeletonPage />;

  const levels = levelsData?.levels || [];
  const classes = classesData?.classes || [];
  const subjects = subjectsData?.subjects || [];
  const types = typesData?.assessmentTypes || [];
  const scales = (scalesData?.gradingScales || []).filter((g) => !g.levelId);
  const years = yearsData?.years || [];

  return (
    <div>
      <PageHeader title="Academics" subtitle="Levels, classes, subjects, assessments and calendar" />
      <ErrorNote error={error ? { response: { data: { message: error } } } : null} />

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-slate-200/60 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? 'bg-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Classes' && (
        <div className="space-y-6">
          {levels.map((level) => (
            <div key={level.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">
                  {level.name} <span className="ml-1 text-xs font-normal text-slate-400">{level.stage}</span>
                </h2>
                <span className="text-xs text-slate-400">{level.classes.length} class(es)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {level.classes.map((c) => {
                  const info = classes.find((x) => x.id === c.id);
                  return (
                    <span key={c.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                      {c.name}
                      <span className="text-xs text-slate-400">{info?._count?.students ?? 0} pupils</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {can('academics.manage') && (
            <div className="card flex flex-wrap items-end gap-3 p-5">
              <div>
                <label className="label">New class name</label>
                <input className="input w-40" value={newClass.name} onChange={(e) => setNewClass((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Primary 4 B" />
              </div>
              <div>
                <label className="label">Level</label>
                <select className="input w-40" value={newClass.levelId} onChange={(e) => setNewClass((f) => ({ ...f, levelId: e.target.value }))}>
                  <option value="">Select…</option>
                  {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <button
                className="btn-primary"
                disabled={!newClass.name || !newClass.levelId || createClass.isPending}
                onClick={() => createClass.mutate({ name: newClass.name, levelId: Number(newClass.levelId) })}
              >
                Add class
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'Subjects' && (
        <div className="card overflow-x-auto p-5">
          <table className="w-full">
            <thead><tr><th className="th">Subject</th><th className="th">Code</th><th className="th">Type</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td className="td font-medium">{s.name}</td>
                  <td className="td font-mono text-xs">{s.code || '—'}</td>
                  <td className="td text-slate-500">{s.isCore ? 'Core' : 'Elective'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {can('academics.manage') && (
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
              <div>
                <label className="label">New subject</label>
                <input className="input w-52" value={newSubject.name} onChange={(e) => setNewSubject((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Arabic" />
              </div>
              <div>
                <label className="label">Code</label>
                <input className="input w-24" value={newSubject.code} onChange={(e) => setNewSubject((f) => ({ ...f, code: e.target.value }))} placeholder="ARB" />
              </div>
              <button
                className="btn-primary"
                disabled={!newSubject.name || createSubject.isPending}
                onClick={() => createSubject.mutate({ name: newSubject.name, code: newSubject.code || undefined })}
              >
                Add subject
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'Assessment Types' && (
        <div className="card overflow-x-auto p-5">
          <p className="mb-4 text-sm text-slate-500">
            Scores are weighted: subject total = Σ(raw score × weight). Weights currently sum to{' '}
            <span className={types.reduce((s, t) => s + t.weight, 0) === 100 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
              {types.reduce((s, t) => s + t.weight, 0)}%
            </span>
          </p>
          <table className="w-full">
            <thead><tr><th className="th">Assessment</th><th className="th">Short code</th><th className="th">Weight</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {types.map((t) => (
                <tr key={t.id}>
                  <td className="td font-medium">{t.name}</td>
                  <td className="td font-mono text-xs">{t.shortCode}</td>
                  <td className="td">{t.weight}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Grading' && (
        <div className="card p-5">
          <p className="mb-4 text-sm text-slate-500">
            Default grading scale (BECE 9-point). Levels may have their own scale (e.g. standards-based A–D for KG).
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {scales.map((g) => (
              <div key={g.id} className="rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-lg font-bold">{g.grade}</p>
                <p className="text-xs text-slate-500">{g.minScore}–{Math.round(g.maxScore)}%</p>
                <p className="mt-1 text-xs text-slate-400">{g.descriptor}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Teacher Allocation' && (
        <TeacherAllocation classes={classes} canManage={can('academics.manage')} />
      )}

      {tab === 'Academic Year' && (
        <TermCalendar years={years} canManage={can('academics.manage')} setCurrentYear={setCurrentYear} setCurrentTerm={setCurrentTerm} />
      )}
    </div>
  );
};

const TeacherAllocation = ({ classes, canManage }) => {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [alloc, setAlloc] = useState({});
  const [bulkTeacher, setBulkTeacher] = useState('');
  const [msg, setMsg] = useState('');

  const { data: csData, isLoading } = useQuery({
    queryKey: ['classSubjects', classId],
    queryFn: () => api.get('/academic/class-subjects', { params: { classId } }).then((r) => r.data),
    enabled: !!classId,
  });
  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (subjects) => api.put('/academic/class-subjects', { classId: Number(classId), subjects }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSubjects', classId] });
      setMsg('Teacher allocation saved.');
      setTimeout(() => setMsg(''), 3000);
    },
  });

  const staff = (staffData?.staff || []).filter((s) => s.isActive);
  const current = {};
  (csData?.classSubjects || []).forEach((cs) => {
    current[cs.subject.id] = cs.teacher?.id || '';
  });

  const teacherFor = (subjectId) => alloc[subjectId] ?? current[subjectId] ?? '';

  const buildPayload = () =>
    (csData?.classSubjects || []).map((cs) => ({
      subjectId: cs.subject.id,
      teacherId: Number(teacherFor(cs.subject.id)) || null,
    }));

  if (!classes.length) return <EmptyState message="No classes yet" />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input max-w-52" value={classId} onChange={(e) => { setClassId(e.target.value); setAlloc({}); }}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {canManage && (
          <div className="flex items-center gap-2">
            <select className="input max-w-56" value={bulkTeacher} onChange={(e) => setBulkTeacher(e.target.value)}>
              <option value="">Assign one teacher to ALL subjects…</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role.replace('_', ' ')})</option>)}
            </select>
            {bulkTeacher && (
              <button
                className="btn-secondary"
                onClick={() => setAlloc(Object.fromEntries((csData?.classSubjects || []).map((cs) => [cs.subject.id, bulkTeacher])))}
              >
                Apply to all
              </button>
            )}
          </div>
        )}
      </div>
      {msg && <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{msg}</p>}
      {isLoading || !csData ? (
        <SkeletonPage />
      ) : csData.classSubjects.length === 0 ? (
        <EmptyState message="This class has no subjects linked" />
      ) : (
        <div className="card max-w-2xl divide-y divide-slate-100">
          {csData.classSubjects.map((cs) => (
            <div key={cs.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span className="font-medium">{cs.subject.name}</span>
              {canManage ? (
                <select
                  className="input w-56"
                  value={teacherFor(cs.subject.id)}
                  onChange={(e) => setAlloc((a) => ({ ...a, [cs.subject.id]: e.target.value }))}
                >
                  <option value="">— Not assigned —</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <span className="text-slate-500">{cs.teacher?.name || 'Not assigned'}</span>
              )}
            </div>
          ))}
          {canManage && (
            <div className="p-4">
              <button className="btn-primary" onClick={() => save.mutate(buildPayload())} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save allocation'}
              </button>
              <p className="mt-2 text-xs text-slate-400">
                Assigned teachers can only enter scores and give homework for their own subjects and classes.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TermCalendar = ({ years, canManage, setCurrentYear, setCurrentTerm }) => {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState({});
  const [msg, setMsg] = useState('');

  const updateTerm = useMutation({
    mutationFn: ({ id, data }) => api.put(`/academic/terms/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['years'] });
      setMsg('Term calendar updated — parents and report cards use these dates.');
      setTimeout(() => setMsg(''), 4000);
    },
  });

  const field = (t, k, type = 'date', label) => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        value={(edits[t.id]?.[k] ?? (t[k] ? new Date(t[k]).toISOString().slice(0, 10) : ''))}
        disabled={!canManage}
        onChange={(e) => setEdits((E) => ({ ...E, [t.id]: { ...E[t.id], [k]: e.target.value } }))}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {msg && <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{msg}</p>}
      {!canManage && (
        <p className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-500">
          Only the proprietor or headteacher can change the term calendar.
        </p>
      )}
      {years.map((y) => (
        <div key={y.id} className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-semibold">{y.name}</h2>
            {y.isCurrent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Current</span>}
            {canManage && !y.isCurrent && (
              <button className="text-xs text-brand-600 hover:underline" onClick={() => setCurrentYear.mutate(y.id)}>
                Set current
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {y.terms.map((t) => {
              const isEditing = edits[t.id] && Object.keys(edits[t.id]).length > 0;
              return (
                <div key={t.id} className={`rounded-lg border p-4 text-sm ${t.isCurrent ? 'border-brand-500' : 'border-slate-200'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold">{t.name.replace('TERM_', 'Term ')}</p>
                    <div className="flex items-center gap-2">
                      {t.isCurrent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Current</span>}
                      {canManage && !t.isCurrent && (
                        <button className="text-xs text-brand-600 hover:underline" onClick={() => setCurrentTerm.mutate(t.id)}>
                          Set current
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {field(t, 'startDate', 'date', 'School re-opens')}
                    {field(t, 'endDate', 'date', 'Term ends / vacates')}
                    {field(t, 'vacationDate', 'date', 'Vacation date')}
                    {field(t, 'nextTermBegins', 'date', 'Next term begins')}
                  </div>
                  {canManage && isEditing && (
                    <button
                      className="btn-primary mt-3 w-full"
                      disabled={updateTerm.isPending}
                      onClick={() => updateTerm.mutate({ id: t.id, data: edits[t.id] })}
                    >
                      {updateTerm.isPending ? 'Saving…' : 'Save term calendar'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Academics;
