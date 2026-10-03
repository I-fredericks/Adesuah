import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Badge, Spinner, EmptyState, Modal, ErrorNote } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';

const AddStudentModal = ({ open, onClose, classes }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    otherNames: '',
    gender: 'MALE',
    dateOfBirth: '',
    classId: classes[0]?.id || '',
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: 'FATHER',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/students', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const submit = (e) => {
    e.preventDefault();
    setError('');
    mutation.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      otherNames: form.otherNames || undefined,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth || undefined,
      classId: Number(form.classId),
      guardians: [
        {
          name: form.guardianName,
          phone: form.guardianPhone,
          relationship: form.guardianRelationship,
          isPrimary: true,
        },
      ],
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Enroll student" wide>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote error={error ? { response: { data: { message: error } } } : null} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">First name *</label>
            <input className="input" value={form.firstName} onChange={set('firstName')} required />
          </div>
          <div>
            <label className="label">Surname *</label>
            <input className="input" value={form.lastName} onChange={set('lastName')} required />
          </div>
          <div>
            <label className="label">Other names</label>
            <input className="input" value={form.otherNames} onChange={set('otherNames')} />
          </div>
          <div>
            <label className="label">Gender *</label>
            <select className="input" value={form.gender} onChange={set('gender')}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <div>
            <label className="label">Date of birth</label>
            <input className="input" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
          </div>
          <div>
            <label className="label">Class *</label>
            <select className="input" value={form.classId} onChange={set('classId')} required>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <hr />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="col-span-2 text-sm font-medium text-slate-600">Guardian</div>
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.guardianName} onChange={set('guardianName')} required />
          </div>
          <div>
            <label className="label">Phone *</label>
            <input className="input" value={form.guardianPhone} onChange={set('guardianPhone')} required placeholder="02xxxxxxxx" />
          </div>
          <div>
            <label className="label">Relationship</label>
            <select className="input" value={form.guardianRelationship} onChange={set('guardianRelationship')}>
              <option>FATHER</option>
              <option>MOTHER</option>
              <option>GUARDIAN</option>
              <option>OTHER</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enrolling…' : 'Enroll student'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const Students = () => {
  const { can } = useAuth();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/academic/classes').then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['students', { search, page, classId }],
    queryFn: () =>
      api
        .get('/students', { params: { search, page, limit: 25, ...(classId ? { classId } : {}) } })
        .then((r) => r.data),
  });

  const classes = classesData?.classes || [];

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={data ? `${data.total} enrolled` : ''}
        actions={
          can('students.create') && (
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Enroll student
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="input max-w-xs"
          placeholder="Search name or admission number…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input max-w-48"
          value={classId || ''}
          onChange={(e) => {
            setPage(1);
            window.location.hash = '';
            window.location.search = e.target.value ? `?classId=${e.target.value}` : '';
          }}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Spinner className="mx-auto h-8 w-8" />
      ) : !data || data.students.length === 0 ? (
        <EmptyState message="No students found" />
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-2.5 md:hidden">
            {data.students.map((s) => {
              const primary = s.guardians?.find((g) => g.isPrimary) || s.guardians?.[0];
              return (
                <Link key={s.id} to={`/students/${s.id}`} className="card block p-4 active:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {s.lastName}, {s.firstName} {s.otherNames}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400">{s.admissionNo} · {s.currentClass?.name || '—'}</p>
                      {primary && <p className="mt-0.5 truncate text-xs text-slate-400">{primary.name} · {primary.phone}</p>}
                    </div>
                    <Badge tone={s.status === 'ACTIVE' ? 'green' : s.status === 'GRADUATED' ? 'blue' : 'amber'}>
                      {s.status}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="card hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Admission №</th>
                <th className="th">Name</th>
                <th className="th">Class</th>
                <th className="th">Gender</th>
                <th className="th">Guardian</th>
                <th className="th">Enrolled</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.students.map((s) => {
                const primary = s.guardians?.find((g) => g.isPrimary) || s.guardians?.[0];
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="td font-mono text-xs">{s.admissionNo}</td>
                    <td className="td">
                      <Link to={`/students/${s.id}`} className="font-medium text-brand-600 hover:underline">
                        {s.lastName}, {s.firstName} {s.otherNames}
                      </Link>
                    </td>
                    <td className="td">{s.currentClass?.name || '—'}</td>
                    <td className="td">{s.gender === 'MALE' ? 'M' : 'F'}</td>
                    <td className="td text-slate-500">{primary ? `${primary.name} · ${primary.phone}` : '—'}</td>
                    <td className="td text-slate-500">{formatDate(s.enrolledAt)}</td>
                    <td className="td">
                      <Badge tone={s.status === 'ACTIVE' ? 'green' : s.status === 'GRADUATED' ? 'blue' : 'amber'}>
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">Page {data.page} of {data.pages}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn-secondary" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      <AddStudentModal open={showAdd} onClose={() => setShowAdd(false)} classes={classes} />
    </div>
  );
};

export default Students;
