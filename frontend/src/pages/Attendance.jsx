import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_STYLE = {
  PRESENT: 'bg-emerald-600 text-white',
  ABSENT: 'bg-red-600 text-white',
  LATE: 'bg-amber-500 text-white',
  EXCUSED: 'bg-sky-600 text-white',
};

const Attendance = () => {
  const { canTeach } = useAuth();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState({});
  const [saved, setSaved] = useState(false);

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/academic/classes').then((r) => r.data),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['register', classId, date],
    queryFn: () => api.get('/attendance/register', { params: { classId, date } }).then((r) => r.data),
    enabled: !!classId,
  });

  const { data: stats } = useQuery({
    queryKey: ['attendanceStats', classId],
    queryFn: () => api.get('/attendance/stats', { params: { classId } }).then((r) => r.data),
    enabled: !!classId,
  });

  const mark = useMutation({
    mutationFn: (records) =>
      api.post('/attendance/mark', {
        classId: Number(classId),
        date,
        records: records.filter((r) => r.status),
      }),
    onSuccess: () => {
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const setAll = (status) => {
    const next = {};
    (data?.students || []).forEach((s) => {
      next[s.id] = status;
    });
    setMarks(next);
  };

  const submit = () => {
    const records = (data?.students || [])
      .map((s) => ({ studentId: s.id, status: marks[s.id] || s.attendance?.status }))
      .filter((r) => r.status);
    mark.mutate(records);
  };

  const classes = classesData?.classes || [];

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Daily class register"
        actions={canTeach && classId && data?.students.length > 0 && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setAll('PRESENT')}>All present</button>
            <button className="btn-primary" onClick={submit} disabled={mark.isPending}>
              {mark.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save register'}
            </button>
          </div>
        )}
      />
      {mark.isError && <p className="mb-4 text-sm text-red-600">{getErrorMessage(mark.error)}</p>}

      <div className="mb-4 flex flex-wrap gap-3">
        <select className="input max-w-52" value={classId} onChange={(e) => { setClassId(e.target.value); setMarks({}); }}>
          <option value="">Select class…</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="input max-w-44" type="date" value={date} onChange={(e) => { setDate(e.target.value); setMarks({}); }} />
        {classId && stats && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {Object.entries(stats.totals).map(([k, v]) => (
              <Badge key={k} tone={k === 'PRESENT' ? 'green' : k === 'ABSENT' ? 'red' : k === 'LATE' ? 'amber' : 'blue'}>
                {k} {v}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <Spinner className="mx-auto h-8 w-8" />
      ) : !classId ? (
        <EmptyState message="Choose a class to take attendance" />
      ) : !data || data.students.length === 0 ? (
        <EmptyState message="No active students in this class" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Pupil</th>
                <th className="th">Admission №</th>
                <th className="th text-center">Mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.students.map((s) => {
                const current = marks[s.id] || s.attendance?.status || '';
                return (
                  <tr key={s.id}>
                    <td className="td font-medium">{s.lastName}, {s.firstName}</td>
                    <td className="td font-mono text-xs text-slate-500">{s.admissionNo}</td>
                    <td className="td">
                      <div className="flex justify-center gap-1.5">
                        {STATUSES.map((st) => (
                          <button
                            key={st}
                            onClick={() => setMarks((m) => ({ ...m, [s.id]: st }))}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${current === st ? STATUS_STYLE[st] : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            {st[0] + st.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Attendance;
