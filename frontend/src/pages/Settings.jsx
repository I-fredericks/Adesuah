import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, RotateCcw } from 'lucide-react';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, ErrorNote, Badge } from '../components/ui';
import { ROLE_LABELS } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const RolesMatrix = () => {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [editRole, setEditRole] = useState(null);
  const [draft, setDraft] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['permissionMatrix'],
    queryFn: () => api.get('/academic/permissions').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: ({ role, permissions }) => api.put(`/academic/roles/${role}/permissions`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      setEditRole(null);
      setMessage('Permissions saved. Staff will see changes on their next sign-in.');
      setTimeout(() => setMessage(''), 4000);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const reset = useMutation({
    mutationFn: (role) => api.post(`/academic/roles/${role}/reset`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      setEditRole(null);
      setMessage('Role reset to defaults.');
      setTimeout(() => setMessage(''), 4000);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (isLoading) return <Spinner className="mx-auto h-8 w-8" />;
  if (!data) return null;

  const roles = Object.keys(data.matrix);
  const groups = [...new Set(data.catalog.map((c) => c.group))];
  const editable = can('roles.manage');

  const toggle = (perm) =>
    setDraft((d) => (d.includes(perm) ? d.filter((p) => p !== perm) : [...d, perm]));

  return (
    <div className="card mt-6 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Roles & permissions</h2>
        {editable && (
          <p className="text-xs text-slate-400">
            {editRole ? 'Editing — click permissions to toggle, then save.' : 'Click “Edit” on a role to customise what it can do.'}
          </p>
        )}
      </div>
      {message && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      <ErrorNote error={error ? { response: { data: { message: error } } } : null} />

      {editRole ? (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{ROLE_LABELS[editRole]}</h3>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setEditRole(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => save.mutate({ role: editRole, permissions: draft })} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save permissions'}
              </button>
            </div>
          </div>
          {groups.map((g) => (
            <div key={g} className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{g}</p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {data.catalog.filter((c) => c.group === g).map((c) => {
                  const on = draft.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      onClick={() => toggle(c.key)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${on ? 'border-brand-500 bg-brand-50 text-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      {on ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <X className="h-4 w-4 shrink-0 text-slate-300" />}
                      <span>
                        {c.label}
                        <span className="block font-mono text-[10px] text-slate-400">{c.key}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Role</th>
                <th className="th">Permissions</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((role) => (
                <tr key={role}>
                  <td className="td font-medium">{ROLE_LABELS[role] || role}</td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {(data.matrix[role] || []).length === 0 ? (
                        <span className="text-xs text-slate-400">No permissions</span>
                      ) : (
                        (data.matrix[role] || []).map((p) => (
                          <Badge key={p} tone="slate">{p}</Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="td">
                    {editable && (
                      <div className="flex gap-3 text-sm">
                        <button
                          className="text-brand-600 hover:underline"
                          onClick={() => {
                            setEditRole(role);
                            setDraft(data.matrix[role] || []);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-700"
                          onClick={() => reset.mutate(role)}
                          title="Reset to defaults"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Reset
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Settings = () => {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [pwMessage, setPwMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['school'],
    queryFn: () => api.get('/school/mine').then((r) => r.data),
  });

  const [form, setForm] = useState(null);
  const schoolForm = form || (data?.school
    ? {
        name: data.school.name || '',
        shortName: data.school.shortName || '',
        motto: data.school.motto || '',
        address: data.school.address || '',
        city: data.school.city || '',
        region: data.school.region || '',
        phone: data.school.phone || '',
        email: data.school.email || '',
        gesRegNumber: data.school.gesRegNumber || '',
      }
    : null);

  const save = useMutation({
    mutationFn: (payload) => api.put('/school/mine', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school'] });
      setError('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const changePassword = useMutation({
    mutationFn: () => api.put('/auth/change-password', passwords),
    onSuccess: () => {
      setPwMessage('Password changed. Signing you out…');
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, 1500);
    },
    onError: (err) => setPwMessage(getErrorMessage(err)),
  });

  if (isLoading || !schoolForm) return <Spinner className="mx-auto h-8 w-8" />;

  const editable = can('school.settings');
  const set = (k) => (e) => setForm({ ...schoolForm, [k]: e.target.value });

  return (
    <div>
      <PageHeader title="Settings" subtitle="School profile & role permissions" />
      <ErrorNote error={error ? { response: { data: { message: error } } } : null} />
      {saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">Saved ✓</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          className="card h-fit space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(schoolForm);
          }}
        >
          <h2 className="font-semibold">School profile</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-full">
              <label className="label">School name</label>
              <input className="input" value={schoolForm.name} onChange={set('name')} disabled={!editable} />
            </div>
            <div>
              <label className="label">Short name</label>
              <input className="input" value={schoolForm.shortName} onChange={set('shortName')} disabled={!editable} />
            </div>
            <div>
              <label className="label">GES registration №</label>
              <input className="input" value={schoolForm.gesRegNumber} onChange={set('gesRegNumber')} disabled={!editable} />
            </div>
            <div className="col-span-full">
              <label className="label">Motto</label>
              <input className="input" value={schoolForm.motto} onChange={set('motto')} disabled={!editable} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={schoolForm.city} onChange={set('city')} disabled={!editable} />
            </div>
            <div>
              <label className="label">Region</label>
              <input className="input" value={schoolForm.region} onChange={set('region')} disabled={!editable} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={schoolForm.phone} onChange={set('phone')} disabled={!editable} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={schoolForm.email} onChange={set('email')} disabled={!editable} />
            </div>
            <div className="col-span-full">
              <label className="label">Address</label>
              <input className="input" value={schoolForm.address} onChange={set('address')} disabled={!editable} />
            </div>
          </div>
          {editable && (
            <button className="btn-primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </form>

        <form
          className="card h-fit space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate();
          }}
        >
          <h2 className="font-semibold">Change my password</h2>
          {pwMessage && <p className="text-sm text-slate-600">{pwMessage}</p>}
          <div>
            <label className="label">Current password</label>
            <input className="input" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="label">New password (min 8 characters)</label>
            <input className="input" type="password" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} required minLength={8} />
          </div>
          <button className="btn-primary" disabled={changePassword.isPending}>Update password</button>
        </form>
      </div>

      <RolesMatrix />
    </div>
  );
};

export default Settings;
