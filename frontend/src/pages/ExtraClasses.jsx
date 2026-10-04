import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Square, Pencil } from 'lucide-react';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, EmptyState, Badge, Modal, ErrorNote } from '../components/ui';
import { formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const STATUS_TONE = { ACTIVE: 'green', PAUSED: 'amber', ENDED: 'red' };

const ExtraClassForm = ({ initial, classes, subjects, staff, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(
    initial
      ? { ...initial, startDate: initial.startDate?.slice(0, 10), endDate: initial.endDate?.slice(0, 10) || '' }
      : {
          title: 'Morning Extra Classes',
          classId: classes[0]?.id || '',
          subjectId: '',
          teacherId: '',
          days: 'Mon,Tue,Wed,Thu',
          startTime: '06:30',
          endTime: '07:30',
          venue: '',
          startDate: new Date().toISOString().slice(0, 10),
          endDate: '',
          notes: '',
        }
  );
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: (payload) =>
      initial ? api.put(`/extra-classes/${initial.id}`, payload) : api.post('/extra-classes', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraClasses'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal open onClose={onClose} title={initial ? 'Modify extra class' : 'New extra class'} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({
            title: form.title,
            classId: Number(form.classId),
            subjectId: form.subjectId ? Number(form.subjectId) : null,
            teacherId: form.teacherId ? Number(form.teacherId) : null,
            days: form.days,
            startTime: form.startTime,
            endTime: form.endTime,
            venue: form.venue || undefined,
            startDate: form.startDate || undefined,
            endDate: form.endDate || null,
            notes: form.notes || undefined,
          });
        }}
        className="space-y-4"
      >
        <ErrorNote error={error ? { response: { data: { message: error } } } : null} />
        <div>
          <label className="label">Title *</label>
          <input className="input" value={form.title} onChange={set('title')} required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Class *</label>
            <select className="input" value={form.classId} onChange={set('classId')} required>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject (optional)</label>
            <select className="input" value={form.subjectId} onChange={set('subjectId')}>
              <option value="">General</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Teacher (optional)</label>
            <select className="input" value={form.teacherId} onChange={set('teacherId')}>
              <option value="">—</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Venue</label>
            <input className="input" value={form.venue} onChange={set('venue')} placeholder="e.g. JHS Block" />
          </div>
          <div>
            <label className="label">Days *</label>
            <input className="input" value={form.days} onChange={set('days')} required placeholder="Mon,Tue,Wed,Thu" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Starts *</label>
              <input className="input" type="time" value={form.startTime} onChange={set('startTime')} required />
            </div>
            <div>
              <label className="label">Ends *</label>
              <input className="input" type="time" value={form.endTime} onChange={set('endTime')} required />
            </div>
          </div>
          <div>
            <label className="label">Start date</label>
            <input className="input" type="date" value={form.startDate} onChange={set('startDate')} />
          </div>
          <div>
            <label className="label">End date (optional)</label>
            <input className="input" type="date" value={form.endDate} onChange={set('endDate')} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
};

const ExtraClasses = () => {
  const { can } = useAuth();
  const canManage = can('academics.manage');
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['extraClasses'],
    queryFn: () => api.get('/extra-classes').then((r) => r.data),
  });
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/academic/classes').then((r) => r.data),
  });
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/academic/subjects').then((r) => r.data),
  });
  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then((r) => r.data),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }) => api.post(`/extra-classes/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['extraClasses'] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  const classes = classesData?.classes || [];
  const subjects = subjectsData?.subjects || [];
  const staff = (staffData?.staff || []).filter((s) => s.isActive);
  const list = data?.extraClasses || [];

  return (
    <div>
      <PageHeader
        title="Extra classes"
        subtitle="Morning or after-school classes — start, modify, pause or terminate them here"
        actions={
          canManage && (
            <button className="btn-primary" onClick={() => setCreating(true)}>New extra class</button>
          )
        }
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <SkeletonTable rows={7} />
      ) : list.length === 0 ? (
        <EmptyState message="No extra classes yet" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((x) => (
            <div key={x.id} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{x.title}</h3>
                  <p className="text-sm text-slate-500">
                    {x.class?.name}{x.subject ? ` · ${x.subject.name}` : ''}{x.teacher ? ` · ${x.teacher.name}` : ''}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[x.status]}>{x.status}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-[10px] uppercase text-slate-400">Schedule</p>
                  <p className="font-medium">{x.days}</p>
                  <p className="text-slate-500">{x.startTime} – {x.endTime}{x.venue ? ` · ${x.venue}` : ''}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-[10px] uppercase text-slate-400">Runs</p>
                  <p className="font-medium">{formatDate(x.startDate)} → {x.endDate ? formatDate(x.endDate) : '—'}</p>
                </div>
              </div>
              {canManage && (
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                  <button className="btn-secondary text-xs" onClick={() => setEditing(x)}>
                    <Pencil className="h-3.5 w-3.5" /> Modify
                  </button>
                  {x.status === 'ACTIVE' && (
                    <button className="btn-secondary text-xs" onClick={() => setStatus.mutate({ id: x.id, status: 'PAUSED' })}>
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </button>
                  )}
                  {x.status === 'PAUSED' && (
                    <button className="btn-secondary text-xs" onClick={() => setStatus.mutate({ id: x.id, status: 'ACTIVE' })}>
                      <Play className="h-3.5 w-3.5" /> Resume
                    </button>
                  )}
                  {x.status !== 'ENDED' && (
                    <button className="btn-danger text-xs" onClick={() => setStatus.mutate({ id: x.id, status: 'ENDED' })}>
                      <Square className="h-3.5 w-3.5" /> Terminate
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {creating && <ExtraClassForm classes={classes} subjects={subjects} staff={staff} onClose={() => setCreating(false)} />}
      {editing && <ExtraClassForm initial={editing} classes={classes} subjects={subjects} staff={staff} onClose={() => setEditing(null)} />}
    </div>
  );
};

export default ExtraClasses;
