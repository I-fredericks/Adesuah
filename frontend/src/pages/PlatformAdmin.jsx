import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, StatCard, Badge, Modal, ErrorNote } from '../components/ui';
import { formatDate } from '../utils/format';

const PlatformAdmin = () => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', phone: '', ownerName: '', ownerEmail: '', ownerPassword: '' });
  const [error, setError] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['platformStats'],
    queryFn: () => api.get('/platform/stats').then((r) => r.data),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['platformSchools'],
    queryFn: () => api.get('/platform/schools').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (payload) =>
      api.post('/platform/schools', {
        name: payload.name,
        city: payload.city || undefined,
        phone: payload.phone || undefined,
        owner: {
          name: payload.ownerName,
          email: payload.ownerEmail,
          password: payload.ownerPassword,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformSchools'] });
      setShowAdd(false);
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/platform/schools/${id}/status`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platformSchools'] }),
  });

  return (
    <div>
      <PageHeader
        title="Platform admin"
        subtitle="All schools registered on the system"
        actions={<button className="btn-primary" onClick={() => setShowAdd(true)}>Register school</button>}
      />

      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Schools" value={stats.schoolCount} />
          <StatCard label="Active schools" value={stats.activeSchools} tone="text-emerald-600" />
          <StatCard label="Students" value={stats.studentCount} />
          <StatCard label="User accounts" value={stats.userCount} />
        </div>
      )}

      {isLoading ? (
        <SkeletonTable rows={7} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">School</th>
                <th className="th">Location</th>
                <th className="th">Students</th>
                <th className="th">Staff</th>
                <th className="th">Plan</th>
                <th className="th">Joined</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.schools || []).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{s.name}</td>
                  <td className="td text-slate-500">{s.city || '—'}</td>
                  <td className="td">{s._count.students}</td>
                  <td className="td">{s._count.users}</td>
                  <td className="td"><Badge tone="blue">{s.plan}</Badge></td>
                  <td className="td text-slate-500">{formatDate(s.createdAt)}</td>
                  <td className="td">
                    <Badge tone={s.isActive ? 'green' : 'red'}>{s.isActive ? 'Active' : 'Suspended'}</Badge>
                  </td>
                  <td className="td">
                    <button
                      className="text-sm text-brand-600 hover:underline"
                      onClick={() => toggle.mutate({ id: s.id, isActive: !s.isActive })}
                    >
                      {s.isActive ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal open onClose={() => setShowAdd(false)} title="Register a school">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(form);
            }}
            className="space-y-4"
          >
            <ErrorNote error={error ? { response: { data: { message: error } } } : null} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <label className="label">School name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <hr />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="col-span-2 text-sm font-medium text-slate-600">Owner account</div>
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" value={form.ownerEmail} onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))} required />
              </div>
              <div className="col-span-2">
                <label className="label">Temporary password *</label>
                <input className="input" value={form.ownerPassword} onChange={(e) => setForm((f) => ({ ...f, ownerPassword: e.target.value }))} required minLength={8} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create school'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PlatformAdmin;
