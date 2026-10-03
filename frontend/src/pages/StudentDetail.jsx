import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Badge, Spinner, Card } from '../components/ui';
import { formatMoney, formatDate, termLabel } from '../utils/format';
import { resizeImage } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';

const StudentDetail = () => {
  const { id } = useParams();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [photoMsg, setPhotoMsg] = useState('');

  const photoMutation = useMutation({
    mutationFn: (photoUrl) => api.post(`/students/${id}/photo`, { photoUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      setPhotoMsg('Photo updated ✓');
      setTimeout(() => setPhotoMsg(''), 2500);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const uploadPhoto = async (file) => {
    try {
      const dataUrl = await resizeImage(file);
      photoMutation.mutate(dataUrl);
    } catch {
      setError('Could not read that image');
    }
  };

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['student', id],
    queryFn: () => api.get(`/students/${id}`).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => api.put(`/students/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (isLoading) return <Spinner className="mx-auto h-8 w-8" />;
  if (loadError) return <p className="text-sm text-red-600">{getErrorMessage(loadError)}</p>;

  const { student: s, attendance } = data;
  const outstanding = s.invoices?.reduce(
    (sum, i) => sum + Math.max(0, Number(i.amountTotal) - Number(i.discountAmount) - Number(i.amountPaid)),
    0
  );

  return (
    <div>
      <PageHeader
        title={`${s.firstName} ${s.otherNames || ''} ${s.lastName}`.trim()}
        subtitle={`${s.admissionNo} · ${s.currentClass?.name || 'No class'} · Enrolled ${formatDate(s.enrolledAt)}`}
        actions={
          can('students.status') && (
            <select
              className="input w-40"
              value={s.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="GRADUATED">Graduated</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          )
        }
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {photoMsg && <p className="mb-4 text-sm text-emerald-600">{photoMsg}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-4">
            <label className="group relative cursor-pointer">
              {s.photoUrl ? (
                <img src={s.photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-3xl font-bold text-brand-700">
                  {s.firstName.charAt(0)}
                </span>
              )}
              {can('students.edit') && (
                <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow border border-slate-200">
                  <Camera className="h-4 w-4 text-slate-600" />
                </span>
              )}
              {can('students.edit') && (
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])}
                />
              )}
            </label>
            <div>
              <h2 className="font-semibold">Profile</h2>
              <p className="text-xs text-slate-400">Photo visible to staff and guardians</p>
            </div>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Gender</dt><dd>{s.gender === 'MALE' ? 'Male' : 'Female'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Date of birth</dt><dd>{formatDate(s.dateOfBirth)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><Badge tone={s.status === 'ACTIVE' ? 'green' : 'amber'}>{s.status}</Badge></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Attendance</dt><dd className="text-emerald-600">{attendance?.PRESENT || 0} present · {attendance?.ABSENT || 0} absent</dd></div>
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Guardians</h2>
          {(s.guardians || []).length === 0 ? (
            <p className="text-sm text-slate-400">No guardians recorded</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {s.guardians.map((g) => (
                <li key={g.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{g.name} {g.isPrimary && <Badge tone="blue">Primary</Badge>}</p>
                    <p className="text-xs text-slate-500">{g.relationship} · {g.phone}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Fees</h2>
          <p className="text-2xl font-bold text-red-600">{formatMoney(outstanding)}</p>
          <p className="text-xs text-slate-400">outstanding balance</p>
          <ul className="mt-4 space-y-2 text-sm">
            {(s.invoices || []).map((inv) => (
              <li key={inv.id} className="flex items-center justify-between">
                <span className="text-slate-500">{termLabel(inv.term?.name)}</span>
                <span>
                  {formatMoney(Number(inv.amountPaid))} paid{' '}
                  <Badge tone={inv.status === 'PAID' ? 'green' : inv.status === 'PARTIAL' ? 'amber' : 'red'}>
                    {inv.status}
                  </Badge>
                </span>
              </li>
            ))}
            {(s.invoices || []).length === 0 && <li className="text-slate-400">No invoices yet</li>}
          </ul>
        </div>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-semibold">Class history</h2>
        {(s.enrollments || []).length === 0 ? (
          <p className="text-sm text-slate-400">No enrollment history</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {s.enrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between">
                <span>{e.academicYear.name} — {e.class.name}</span>
                <Badge tone={e.status === 'ACTIVE' ? 'green' : 'slate'}>{e.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default StudentDetail;
