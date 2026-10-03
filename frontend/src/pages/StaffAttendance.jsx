import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui';

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_STYLE = {
  PRESENT: 'bg-emerald-600 text-white',
  ABSENT: 'bg-red-600 text-white',
  LATE: 'bg-amber-500 text-white',
  EXCUSED: 'bg-sky-600 text-white',
};

const StaffAttendance = () => {
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState({});
  const [saved, setSaved] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['staffRegister', date],
    queryFn: () => api.get('/operations/staff-attendance', { params: { date } }).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['staffAttendanceStats'],
    queryFn: () => api.get('/operations/staff-attendance/stats').then((r) => r.data),
  });

  const mark = useMutation({
    mutationFn: (records) =>
      api.post('/operations/staff-attendance', {
        date,
        records: records.filter((r) => r.status),
      }),
    onSuccess: () => {
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const submit = () => {
    const records = (data?.staff || [])
      .map((s) => ({ userId: s.id, status: marks[s.id] || s.attendance?.status }))
      .filter((r) => r.status);
    mark.mutate(records);
  };

  return (
    <div>
      <PageHeader
        title="Staff attendance"
        subtitle="Daily staff register — feeds the proprietor dashboard"
        actions={
          data?.staff.length > 0 && (
            <button className="btn-primary" onClick={submit} disabled={mark.isPending}>
              {mark.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save register'}
            </button>
          )
        }
      />
      {mark.isError && <p className="mb-4 text-sm text-red-600">{getErrorMessage(mark.error)}</p>}

      <div className="mb-4 flex items-center gap-3">
        <input className="input max-w-44" type="date" value={date} onChange={(e) => { setDate(e.target.value); setMarks({}); }} />
      </div>

      {isLoading ? (
        <Spinner className="mx-auto h-8 w-8" />
      ) : !data || data.staff.length === 0 ? (
        <EmptyState message="No active staff" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Staff</th>
                <th className="th">Role</th>
                <th className="th text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.staff.map((s) => {
                const current = marks[s.id] || s.attendance?.status || '';
                return (
                  <tr key={s.id}>
                    <td className="td font-medium">{s.name}</td>
                    <td className="td text-slate-500 text-sm">{s.role.replace('_', ' ')}</td>
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

      {stats && (
        <div className="card mt-6 overflow-x-auto">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Last 30 days</div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Staff</th>
                <th className="th">Days marked</th>
                <th className="th">Attendance rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.staff.map((s) => (
                <tr key={s.id}>
                  <td className="td font-medium">{s.name}</td>
                  <td className="td">{s.daysMarked}</td>
                  <td className="td">
                    {s.attendanceRate !== null ? (
                      <Badge tone={s.attendanceRate >= 90 ? 'green' : s.attendanceRate >= 75 ? 'amber' : 'red'}>
                        {s.attendanceRate}%
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">No records</span>
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

export default StaffAttendance;
