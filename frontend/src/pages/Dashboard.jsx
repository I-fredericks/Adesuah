import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { PageHeader, StatCard, Badge, Card } from '../components/ui';
import { Users, CalendarCheck, AlertTriangle, UserCheck } from 'lucide-react';
import { formatMoney, formatDate, termLabel } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, school } = useAuth();
  if (user?.role === 'PARENT') {
    window.location.href = '/portal';
    return null;
  }
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });

  if (isLoading) return <SkeletonPage />;
  if (error) return <p className="text-sm text-red-600">{error.response?.data?.message}</p>;

  const fees = data.fees || {};
  const sections = data.sections || {};

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

      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500 p-6 text-white lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-100">{data.currentTerm ? `${termLabel(data.currentTerm.name)} · ${data.academicYear?.name || ''}` : 'No active term'}</p>
            <h2 className="mt-1 text-2xl font-bold lg:text-3xl">Good day, {user?.name?.split(' ')[0]} 👋</h2>
            <p className="mt-1 text-sm text-brand-100">
              {data.students.active} pupils · {data.classCount} classes · {data.staffCount} staff
            </p>
          </div>
          {sections.finances && (
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-medium text-brand-100">Collection this term</p>
              <p className="text-2xl font-bold">{fees.collectionRate || 0}%</p>
              <div className="mt-1.5 h-2 w-40 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(fees.collectionRate || 0, 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sections.enrollment && (
          <StatCard icon={Users} label="Active students" value={data.students.active} sub={`${data.students.male} boys · ${data.students.female} girls`} />
        )}
        {sections.attendanceOverview && (
          <StatCard icon={CalendarCheck} label="Pupil attendance today" value={data.attendanceToday.rate !== null ? `${data.attendanceToday.rate}%` : 'Not marked'} sub={`${data.attendanceToday.present}/${data.attendanceToday.marked} present`} />
        )}
        {sections.staffAttendance && data.staffAttendanceToday && (
          <StatCard icon={UserCheck} label="Staff attendance today" value={data.staffAttendanceToday.rate !== null ? `${data.staffAttendanceToday.rate}%` : 'Not marked'} sub={`${data.staffAttendanceToday.present}/${data.staffAttendanceToday.marked} present`} />
        )}
        {sections.finances && (
          <StatCard icon={AlertTriangle} label="Outstanding fees" value={formatMoney(fees.outstanding)} sub={`${fees.debtorsCount || 0} unpaid invoices`} tone="text-red-600" />
        )}
      </div>

      {data.myClasses && (
        <div className="mt-6">
          <h2 className="mb-3 font-semibold">My classes</h2>
          {data.myClasses.length === 0 ? (
            <p className="text-sm text-slate-400">No classes assigned to you yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.myClasses.map((c) => (
                <Link key={c.id} to={`/attendance?classId=${c.id}`} className="card p-4 transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.name}</span>
                    <Badge tone={c.attendanceMarkedToday ? 'green' : 'amber'}>
                      {c.attendanceMarkedToday ? 'Marked today' : 'Attendance due'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{c.students} pupils</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {sections.scoreGaps && data.scoreGaps?.length > 0 && (
        <Card className="mt-6 p-5">
          <h2 className="mb-3 font-semibold">Scores not yet submitted</h2>
          <div className="flex flex-wrap gap-2">
            {data.scoreGaps.map((g, i) => (
              <span key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
                {g.className} · {g.subject}
              </span>
            ))}
          </div>
        </Card>
      )}

      {sections.corrections && data.correctionsPending > 0 && (
        <Link to="/corrections" className="card mt-6 flex items-center justify-between border-amber-300 bg-amber-50 p-5 transition hover:shadow-md">
          <span className="font-semibold text-amber-900">
            {data.correctionsPending} result correction request{data.correctionsPending > 1 ? 's' : ''} awaiting your decision
          </span>
          <Badge tone="amber">Review →</Badge>
        </Link>
      )}

      {sections.corrections && (data.recentActivity || []).length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-1 font-semibold">Results activity</h2>
          <p className="mb-3 text-xs text-slate-400">Who uploaded or changed results, when, and for which subject</p>
          <ul className="divide-y divide-slate-100">
            {data.recentActivity.map((a) => {
              const d = a.detail || {};
              const what =
                a.action === 'REPORTS_PUBLISH'
                  ? 'Published report cards'
                  : a.action === 'REPORTS_LOCK'
                    ? 'Locked report cards'
                    : a.action === 'CORRECTION_REQUEST'
                      ? `Requested correction — ${d.student || ''}`
                      : a.action === 'CORRECTION_APPLY'
                        ? `Applied correction — ${d.student || ''}`
                        : `${d.subject || 'Score'} · ${d.student || ''}: ${d.rawScore}`;
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    <span className="font-medium">{a.by}</span>{' '}
                    <span className="text-slate-500">{what}</span>
                  </span>
                  <span className="text-xs text-slate-400">{new Date(a.at).toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Enrollment by class</h2>
            {sections.enrollment && <Link to="/students" className="text-sm text-brand-600 hover:underline">All students</Link>}
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
            {sections.finances && (data.recentPayments || []).length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No payments recorded yet</p>
            ) : (
              <ul className="space-y-2.5">
                {(data.recentPayments || []).map((p) => (
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
