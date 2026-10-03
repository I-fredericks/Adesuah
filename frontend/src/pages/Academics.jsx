import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, ErrorNote } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const TABS = ['Classes', 'Subjects', 'Assessment Types', 'Grading', 'Academic Year'];

const Academics = () => {
  const { isManagement } = useAuth();
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

  if (isLoading) return <Spinner className="mx-auto h-8 w-8" />;

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
          {isManagement && (
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
          {isManagement && (
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

      {tab === 'Academic Year' && (
        <div className="space-y-4">
          {years.map((y) => (
            <div key={y.id} className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-semibold">{y.name}</h2>
                {y.isCurrent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Current</span>}
                {isManagement && !y.isCurrent && (
                  <button className="text-xs text-brand-600 hover:underline" onClick={() => setCurrentYear.mutate(y.id)}>
                    Set current
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {y.terms.map((t) => (
                  <div key={t.id} className={`rounded-lg border p-3 text-sm ${t.isCurrent ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                    <p className="font-medium">{t.name.replace('TERM_', 'Term ')}</p>
                    <p className="text-xs text-slate-500">{new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()}</p>
                    {isManagement && !t.isCurrent && (
                      <button className="mt-1 text-xs text-brand-600 hover:underline" onClick={() => setCurrentTerm.mutate(t.id)}>
                        Set current
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Academics;
