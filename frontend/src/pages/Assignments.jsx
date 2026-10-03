import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, EmptyState, Badge, Modal, ErrorNote } from '../components/ui';
import { formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const Assignments = () => {
  const { can, user } = useAuth();
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', subjectId: '', dueDate: '' });
  const [error, setError] = useState('');

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
    queryKey: ['assignments', classId, effectiveTerm],
    queryFn: () =>
      api
        .get('/assignments', { params: { classId, termId: effectiveTerm } })
        .then((r) => r.data),
    enabled: !!classId && !!effectiveTerm,
  });

  const create = useMutation({
    mutationFn: (payload) => api.post('/assignments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setShowNew(false);
      setForm({ title: '', description: '', subjectId: '', dueDate: '' });
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/assignments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  });

  const classes = classesData?.classes || [];

  return (
    <div>
      <PageHeader
        title="Assignments & homework"
        subtitle="What you give stays visible to parents on their ward's portal"
        actions={
          can('grades.enter') && classId && (
            <button className="btn-primary" onClick={() => setShowNew(true)}>Give assignment</button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <select className="input max-w-52" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select class…</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input max-w-40" value={effectiveTerm} onChange={(e) => setTermId(e.target.value)}>
          {(termsData?.terms || []).map((t) => (
            <option key={t.id} value={t.id}>{t.name.replace('TERM_', 'Term ')}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Spinner className="mx-auto h-8 w-8" />
      ) : !classId ? (
        <EmptyState message="Choose a class to see its assignments" />
      ) : !data || data.assignments.length === 0 ? (
        <EmptyState message="No assignments for this class and term yet" />
      ) : (
        <div className="space-y-3">
          {data.assignments.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{a.title}</h3>
                    <Badge tone="blue">{a.subject?.name || 'General'}</Badge>
                    {a.dueDate && <Badge tone="amber">Due {formatDate(a.dueDate)}</Badge>}
                  </div>
                  {a.description && <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600">{a.description}</p>}
                  <p className="mt-2 text-xs text-slate-400">
                    Given by {a.teacher?.name || a.createdBy?.name || '—'} · {formatDate(a.createdAt)}
                  </p>
                </div>
                {(a.createdById === user?.id || can('academics.manage')) && (
                  <button className="text-slate-300 hover:text-red-500" onClick={() => remove.mutate(a.id)} aria-label="Delete assignment">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <Modal open onClose={() => setShowNew(false)} title="Give assignment">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({
                classId: Number(classId),
                termId: Number(effectiveTerm),
                title: form.title,
                description: form.description || undefined,
                subjectId: form.subjectId ? Number(form.subjectId) : null,
                dueDate: form.dueDate || null,
              });
            }}
            className="space-y-4"
          >
            <ErrorNote error={error ? { response: { data: { message: error } } } : null} />
            <div>
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Instructions</label>
              <textarea className="input h-24" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Complete exercise 4B, questions 1–15" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Subject</label>
                <select className="input" value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}>
                  <option value="">General</option>
                  {(classSubjects?.classSubjects || []).map((cs) => (
                    <option key={cs.id} value={cs.subject.id}>{cs.subject.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Due date</label>
                <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn-primary" disabled={create.isPending}>{create.isPending ? 'Posting…' : 'Give assignment'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Assignments;
