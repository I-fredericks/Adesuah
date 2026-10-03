import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, EmptyState, Badge, Modal, ErrorNote } from '../components/ui';
import { formatDate, ROLE_LABELS, STAFF_ROLE_OPTIONS } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const Staff = () => {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'TEACHER', email: '', phone: '', password: '', position: '' });
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (payload) => api.post('/staff', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowAdd(false);
      setForm({ name: '', role: 'TEACHER', email: '', phone: '', password: '', position: '' });
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/staff/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });

  const resetPassword = useMutation({
    mutationFn: (id) => api.post(`/staff/${id}/reset-password`),
    onSuccess: (res) => setTempPassword(res.data.tempPassword),
  });

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Teachers, bursars and administrators"
        actions={
          can('staff.manage') && (
            <button className="btn-primary" onClick={() => setShowAdd(true)}>Add staff</button>
          )
        }
      />

      {tempPassword && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Temporary password: <code className="font-mono font-bold">{tempPassword}</code> — share it with the staff member now, it is shown only once.
          <button className="ml-3 text-brand-600 hover:underline" onClick={() => setTempPassword(null)}>Dismiss</button>
        </div>
      )}

      {isLoading ? (
        <Spinner className="mx-auto h-8 w-8" />
      ) : !data || data.staff.length === 0 ? (
        <EmptyState message="No staff yet" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Role</th>
                <th className="th">Contact</th>
                <th className="th">Staff №</th>
                <th className="th">Last login</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.staff.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{st.name}</td>
                  <td className="td">
                    <Badge tone={st.role === 'OWNER' ? 'blue' : ['HEADTEACHER', 'DEPUTY_HEAD', 'ACADEMIC_COORDINATOR'].includes(st.role) ? 'amber' : 'slate'}>
                      {ROLE_LABELS[st.role] || st.role}
                    </Badge>
                  </td>
                  <td className="td text-slate-500">{st.email || st.phone || '—'}</td>
                  <td className="td font-mono text-xs">{st.staffProfile?.staffNo || '—'}</td>
                  <td className="td text-slate-500">{formatDate(st.lastLoginAt)}</td>
                  <td className="td">
                    <Badge tone={st.isActive ? 'green' : 'red'}>{st.isActive ? 'Active' : 'Disabled'}</Badge>
                  </td>
                  <td className="td">
                    <div className="flex gap-3 text-sm">
                      {can('staff.manage') && (
                        <button
                          className="text-brand-600 hover:underline"
                          onClick={() => toggleActive.mutate({ id: st.id, isActive: !st.isActive })}
                        >
                          {st.isActive ? 'Disable' : 'Enable'}
                        </button>
                      )}
                      {can('staff.reset_password') && (
                        <button className="text-slate-500 hover:underline" onClick={() => resetPassword.mutate(st.id)}>
                          Reset password
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal open onClose={() => setShowAdd(false)} title="Add staff member">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({
                name: form.name,
                role: form.role,
                email: form.email || undefined,
                phone: form.phone || undefined,
                password: form.password,
                position: form.position || undefined,
              });
            }}
            className="space-y-4"
          >
            <ErrorNote error={error ? { response: { data: { message: error } } } : null} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Full name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                  {STAFF_ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Position</label>
                <input className="input" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} placeholder="e.g. Class teacher" />
              </div>
              <div>
                <label className="label">Temporary password * (min 8)</label>
                <input className="input" type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={8} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create account'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Staff;
