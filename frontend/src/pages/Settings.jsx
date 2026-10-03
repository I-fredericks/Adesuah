import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, ErrorNote } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { isManagement } = useAuth();
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

  const set = (k) => (e) => setForm({ ...schoolForm, [k]: e.target.value });

  return (
    <div>
      <PageHeader title="Settings" subtitle="School profile" />
      <ErrorNote error={error ? { response: { data: { message: error } } } : null} />
      {saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">Saved ✓</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          className="card space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(schoolForm);
          }}
        >
          <h2 className="font-semibold">School profile</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="label">School name</label>
              <input className="input" value={schoolForm.name} onChange={set('name')} disabled={!isManagement} />
            </div>
            <div>
              <label className="label">Short name</label>
              <input className="input" value={schoolForm.shortName} onChange={set('shortName')} disabled={!isManagement} />
            </div>
            <div>
              <label className="label">GES registration №</label>
              <input className="input" value={schoolForm.gesRegNumber} onChange={set('gesRegNumber')} disabled={!isManagement} />
            </div>
            <div className="col-span-2">
              <label className="label">Motto</label>
              <input className="input" value={schoolForm.motto} onChange={set('motto')} disabled={!isManagement} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={schoolForm.city} onChange={set('city')} disabled={!isManagement} />
            </div>
            <div>
              <label className="label">Region</label>
              <input className="input" value={schoolForm.region} onChange={set('region')} disabled={!isManagement} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={schoolForm.phone} onChange={set('phone')} disabled={!isManagement} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={schoolForm.email} onChange={set('email')} disabled={!isManagement} />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <input className="input" value={schoolForm.address} onChange={set('address')} disabled={!isManagement} />
            </div>
          </div>
          {isManagement && (
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
    </div>
  );
};

export default Settings;
