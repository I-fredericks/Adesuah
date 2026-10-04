import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, EmptyState, Badge, Modal, ErrorNote, SkeletonTable } from '../components/ui';
import { formatDate, audienceLabel } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const Announcements = () => {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', audience: 'ALL', classId: '', sendSms: false });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then((r) => r.data),
  });
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/academic/classes').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (payload) => api.post('/announcements', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowNew(false);
      setForm({ title: '', body: '', audience: 'ALL', classId: '', sendSms: false });
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Notices reach staff and guardians in-app (and by SMS where configured)"
        actions={
          can('announcements.send') && (
            <button className="btn-primary" onClick={() => setShowNew(true)}>
              <Megaphone className="h-4 w-4" /> New announcement
            </button>
          )
        }
      />

      {isLoading ? (
        <SkeletonTable rows={7} />
      ) : !data || data.announcements.length === 0 ? (
        <EmptyState message="No announcements yet" />
      ) : (
        <div className="space-y-3">
          {data.announcements.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{a.title}</h3>
                    <Badge tone="blue">{audienceLabel(a.audience)}{a.class ? ` · ${a.class.name}` : ''}</Badge>
                    {a.smsSent && <Badge tone="green">SMS sent</Badge>}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {a.author?.name || 'System'} · {formatDate(a.createdAt)}
                  </p>
                </div>
                {can('announcements.send') && (
                  <button
                    className="text-slate-300 hover:text-red-500"
                    onClick={() => remove.mutate(a.id)}
                    aria-label="Delete announcement"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <Modal open onClose={() => setShowNew(false)} title="New announcement">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({
                title: form.title,
                body: form.body,
                audience: form.audience,
                classId: form.audience === 'CLASS' ? Number(form.classId) : undefined,
                sendSms: form.sendSms,
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
              <label className="label">Message *</label>
              <textarea className="input h-28" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Audience</label>
                <select className="input" value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}>
                  <option value="ALL">Whole school</option>
                  <option value="STAFF">Staff only</option>
                  <option value="CLASS">One class</option>
                </select>
              </div>
              {form.audience === 'CLASS' && (
                <div>
                  <label className="label">Class</label>
                  <select className="input" value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))} required>
                    <option value="">Select…</option>
                    {(classesData?.classes || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.sendSms} onChange={(e) => setForm((f) => ({ ...f, sendSms: e.target.checked }))} />
              Also send by SMS to guardians {form.audience === 'STAFF' && '(staff audience does not SMS)'}
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn-primary" disabled={create.isPending}>{create.isPending ? 'Sending…' : 'Publish'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Announcements;
