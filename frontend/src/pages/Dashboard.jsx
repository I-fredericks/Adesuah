import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { PageHeader, StatCard, Badge, Spinner } from '../components/ui';
import { formatMoney, formatDate, termLabel } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { school } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });

  if (isLoading) return <Spinner className="mx-auto h-8 w-8" />;
  if (error) return <p className="text-sm text-red-600">{error.response?.data?.message}</p>;

  const fees = data.fees || {};

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          data.currentTerm
            ? `${data.academicYear?.name || ''} · ${termLabel(data.currentTerm.name)} (ends ${formatDate(data.currentTerm.endDate)})`
            : 'No term is currently active'
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active students" value={data.students.active} sub={`${data.students.male} boys · ${data.students.female} girls`} />
        <StatCard label="Attendance today" value={data.attendanceToday.rate !== null ? `${data.attendanceToday.rate}%` : 'Not marked'} sub={`${data.attendanceToday.present}/${data.attendanceToday.marked} present`} />
        <StatCard label="Collected this term" value={formatMoney(fees.collected)} sub={`${fees.collectionRate || 0}% of ${formatMoney(fees.expected)}`} tone="text-emerald-600" />
        <StatCard label="Outstanding" value={formatMoney(fees.outstanding)} sub={`${fees.debtorsCount || 0} unpaid invoices`} tone="text-red-600" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Enrollment by class</h2>
            <Link to="/students" className="text-sm text-brand-600 hover:underline">All students</Link>
          </div>
          {data.enrollmentByClass.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No students enrolled yet</p>
          ) : (
            <div className="space-y-1.5">
              {data.enrollmentByClass.map((c) => {
                const max = Math.max(...data.enrollmentByClass.map((x) => x.students), 1);
                return (
                  <div key={c.class} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 truncate text-slate-500">{c.class}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                      <div
                        className="flex h-full items-center justify-end rounded bg-brand-500 px-1.5 text-[11px] font-semibold text-white"
                        style={{ width: `${Math.max((c.students / max) * 100, 8)}%` }}
                      >
                        {c.students}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Recent payments</h2>
            {data.recentPayments.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No payments recorded yet</p>
            ) : (
              <ul className="space-y-2.5">
                {data.recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.student?.firstName} {p.student?.lastName}</p>
                      <p className="text-xs text-slate-400">{p.receiptNo} · {formatDate(p.paidAt)}</p>
                    </div>
                    <span className="font-semibold text-emerald-600">{formatMoney(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Announcements</h2>
            {data.announcements.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Nothing posted yet</p>
            ) : (
              <ul className="space-y-2.5">
                {data.announcements.map((a) => (
                  <li key={a.id}>
                    <p className="text-sm font-medium">{a.title} <Badge tone="blue">{a.audience}</Badge></p>
                    <p className="line-clamp-2 text-xs text-slate-500">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        {school?.name} · {data.staffCount} staff · {data.classCount} classes
      </p>
    </div>
  );
};

export default Dashboard;
