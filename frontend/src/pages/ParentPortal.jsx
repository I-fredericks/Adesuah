import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Printer, Camera, Megaphone } from 'lucide-react';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, EmptyState, Badge, StatCard, Card } from '../components/ui';
import { formatMoney, formatDate, termLabel, ordinalSuffixClient, ROLE_LABELS } from '../utils/format';
import { resizeImage } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'results', label: 'Results' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'fees', label: 'Fees' },
  { key: 'homework', label: 'Homework' },
];

const STATUS_TONE = { PAID: 'green', PARTIAL: 'amber', UNPAID: 'red', WAIVED: 'blue', PENDING: 'slate' };
const ATT_TONE = { PRESENT: 'green', ABSENT: 'red', LATE: 'amber', EXCUSED: 'blue' };

const ChildSwitcher = ({ children: kids, selected, onSelect }) => {
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [photoMsg, setPhotoMsg] = useState(false);

  const upload = useMutation({
    mutationFn: ({ id, photoUrl }) => api.post(`/portal/children/${id}/photo`, { photoUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myChildren'] });
      queryClient.invalidateQueries({ queryKey: ['child', selected] });
      setPhotoMsg(true);
      refreshUser();
      setTimeout(() => setPhotoMsg(false), 2500);
    },
  });

  const child = kids.find((c) => c.id === selected);

  return (
    <div>
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer">
          {child?.photoUrl ? (
            <img src={child.photoUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700">
              {(child?.name || '?').charAt(0)}
            </span>
          )}
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow border border-slate-200">
            <Camera className="h-3.5 w-3.5 text-slate-600" />
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) resizeImage(f).then((url) => upload.mutate({ id: selected, photoUrl: url }));
            }}
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{child?.name || '—'}</p>
          <p className="text-xs text-slate-400">
            {child?.class || 'No class'} · {child?.admissionNo}
            {photoMsg && <span className="ml-1 text-emerald-600">· photo saved ✓</span>}
          </p>
        </div>
      </div>
      {kids.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {kids.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${selected === c.id ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700' : 'border-slate-200 text-slate-500'}`}
            >
              {c.name.split(' ')[0]} · {c.class || '—'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ReportDetail = ({ childId, termId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['childReport', childId, termId],
    queryFn: () =>
      api.get(`/portal/children/${childId}/report`, { params: { termId } }).then((r) => r.data),
    enabled: !!childId && !!termId,
  });

  if (isLoading) return <Spinner className="mx-auto my-3 h-6 w-6" />;
  if (error) return <p className="px-4 pb-3 text-xs text-red-500">{getErrorMessage(error)}</p>;

  const rc = data?.reportCard;
  if (!rc) return <p className="px-4 pb-3 text-xs text-slate-400">Report not available</p>;

  return (
    <div>
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-left text-slate-400">
          <tr>
            <th className="px-3 py-2">Subject</th>
            <th className="px-3 py-2 text-center">Total</th>
            <th className="px-3 py-2 text-center">Grade</th>
            <th className="px-3 py-2 text-center">Pos</th>
          </tr>
        </thead>
        <tbody>
          {(rc.subjects || []).map((s) => (
            <tr key={s.subjectId} className="border-t border-slate-100">
              <td className="px-3 py-2">{s.subject}</td>
              <td className="px-3 py-2 text-center">{s.total ?? '—'}</td>
              <td className="px-3 py-2 text-center font-semibold">{s.grade ?? '—'}</td>
              <td className="px-3 py-2 text-center">{s.position ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(rc.teacherRemark || rc.headRemark) && (
        <div className="space-y-1 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          {rc.teacherRemark && <p><span className="font-medium">Teacher:</span> {rc.teacherRemark}</p>}
          {rc.headRemark && <p><span className="font-medium">Head:</span> {rc.headRemark}</p>}
        </div>
      )}
    </div>
  );
};

const ParentPortal = () => {
  const { user } = useAuth();
  const [childId, setChildId] = useState(null);
  const [tab, setTab] = useState('overview');
  const [openTerm, setOpenTerm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['myChildren'],
    queryFn: () => api.get('/portal/children').then((r) => r.data),
  });

  useEffect(() => {
    if (!childId && data?.children?.length) setChildId(data.children[0].id);
  }, [data, childId]);

  const { data: detail } = useQuery({
    queryKey: ['child', childId],
    queryFn: () => api.get(`/portal/children/${childId}`).then((r) => r.data),
    enabled: !!childId,
  });

  const { data: assignmentsData } = useQuery({
    queryKey: ['childAssignments', childId],
    queryFn: () => api.get(`/portal/children/${childId}/assignments`).then((r) => r.data),
    enabled: !!childId,
  });

  const { data: extraClasses } = useQuery({
    queryKey: ['childExtraClasses', childId],
    queryFn: () => api.get(`/portal/children/${childId}/extra-classes`).then((r) => r.data),
    enabled: !!childId,
  });

  const { data: announcements } = useQuery({
    queryKey: ['portalAnnouncements'],
    queryFn: () => api.get('/portal/announcements').then((r) => r.data),
  });

  if (isLoading) return <Spinner className="mx-auto h-8 w-8" />;

  const kids = data?.children || [];

  if (kids.length === 0) {
    return (
      <div>
        <PageHeader title="My children" />
        <EmptyState message="No children linked to your account yet. Please contact the school office." />
      </div>
    );
  }

  const child = kids.find((c) => c.id === childId) || kids[0];
  const d = detail || null;
  const assignmentList = assignmentsData?.assignments || [];
  const totalOutstanding = (d?.invoices || []).reduce((s, i) => s + i.balance, 0);
  const totalPaid = (d?.invoices || []).reduce((s, i) => s + i.paid, 0);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Parent header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Hello, {user?.name?.split(' ')[0] || 'Parent'} 👋</h1>
          <p className="text-sm text-slate-400">{ROLE_LABELS[user?.role] || 'Guardian'}</p>
        </div>
        <Link
          to="/portal/announcements"
          className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
        >
          <Megaphone className="h-3.5 w-3.5" /> Notices
        </Link>
      </div>

      <div className="card p-4">
        <ChildSwitcher children={kids} selected={childId} onSelect={setChildId} />
      </div>

      {/* Tabs */}
      <div className="sticky top-14 z-20 -mx-4 mt-4 bg-slate-100/95 px-4 py-2 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === t.key ? 'bg-brand-600 text-white shadow' : 'bg-white text-slate-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* ── Overview ── */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Attendance" value={child.attendanceRate !== null ? `${child.attendanceRate}%` : '—'} sub="this session" tone={child.attendanceRate >= 90 ? 'text-emerald-600' : 'text-amber-600'} />
              <StatCard label="Fees owed" value={formatMoney(child.feeBalance)} tone={child.feeBalance > 0 ? 'text-red-600' : 'text-emerald-600'} />
              <StatCard label="Latest average" value={child.latestResult ? `${child.latestResult.average}%` : '—'} sub={child.latestResult ? `${termLabel(child.latestResult.term.name)} · ${ordinalSuffixClient(child.latestResult.classPosition)} in class` : 'No results yet'} />
              <StatCard label="Total paid" value={formatMoney(totalPaid)} sub={`${formatMoney(totalOutstanding)} outstanding`} />
            </div>

            {(extraClasses?.extraClasses || []).length > 0 && (
              <Card className="p-4">
                <h3 className="mb-2 text-sm font-semibold">Extra classes</h3>
                <ul className="space-y-2">
                  {extraClasses.extraClasses.map((x) => (
                    <li key={x.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{x.title}</p>
                        <p className="text-xs text-slate-400">{x.days} · {x.startTime}–{x.endTime}{x.venue ? ` · ${x.venue}` : ''}</p>
                      </div>
                      {x.subject && <Badge tone="blue">{x.subject.name}</Badge>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {(announcements?.announcements || []).slice(0, 3).map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{a.title}</h3>
                  {a.isPinned && <Badge tone="red">Pinned</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.body}</p>
                <p className="mt-1 text-[10px] text-slate-400">{formatDate(a.createdAt)}</p>
              </Card>
            ))}
            <Link
              to="/portal/announcements"
              className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-brand-600"
            >
              See all notices <ChevronRight className="h-4 w-4" />
            </Link>
          </>
        )}

        {/* ── Results ── */}
        {tab === 'results' && (
          !d || d.reportCards.length === 0 ? (
            <EmptyState message="No published results yet — check back after the term ends" />
          ) : (
            d.reportCards.map((rc) => (
              <Card key={rc.id} className="overflow-hidden p-0">
                <button
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => setOpenTerm(openTerm === rc.termId ? null : rc.termId)}
                >
                  <div>
                    <p className="font-semibold">{termLabel(rc.term)}</p>
                    <p className="text-xs text-slate-400">Published {formatDate(rc.publishedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-brand-600">{rc.average}%</p>
                    <p className="text-[10px] text-slate-400">{ordinalSuffixClient(rc.classPosition)} position</p>
                  </div>
                </button>
                {openTerm === rc.termId && (
                  <ReportDetail childId={childId} termId={rc.termId} />
                )}
              </Card>
            ))
          )
        )}

        {/* ── Attendance ── */}
        {tab === 'attendance' && (
          !d ? <Spinner className="mx-auto h-8 w-8" /> : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(d.attendanceCounts).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-slate-200 p-3 text-center">
                    <p className="text-xl font-bold">{v}</p>
                    <p className={`text-[10px] uppercase ${k === 'PRESENT' ? 'text-emerald-600' : k === 'ABSENT' ? 'text-red-500' : 'text-slate-400'}`}>{k}</p>
                  </div>
                ))}
              </div>
              <Card className="divide-y divide-slate-100">
                {d.recentAttendance.length === 0 ? (
                  <EmptyState message="No attendance recorded yet" />
                ) : (
                  d.recentAttendance.map((a, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-slate-500">{formatDate(a.date)}</span>
                      <Badge tone={ATT_TONE[a.status]}>{a.status}</Badge>
                    </div>
                  ))
                )}
              </Card>
            </>
          )
        )}

        {/* ── Fees ── */}
        {tab === 'fees' && (
          !d || d.invoices.length === 0 ? (
            <EmptyState message="No fees billed yet" />
          ) : (
            <>
              {d.invoices.map((inv) => (
                <Card key={inv.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{termLabel(inv.term)}</p>
                    <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Total</p><p className="font-semibold">{formatMoney(inv.total)}</p></div>
                    <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Paid</p><p className="font-semibold text-emerald-600">{formatMoney(inv.paid)}</p></div>
                    <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Balance</p><p className={`font-semibold ${inv.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatMoney(inv.balance)}</p></div>
                  </div>
                  {inv.installments > 0 && <p className="mt-2 text-xs text-slate-400">Paid in {inv.installments} agreed instalment(s)</p>}
                  <p className="mt-1 text-[10px] text-slate-300">Pay at the school bursar's office or via mobile money — receipts are issued for every payment.</p>
                </Card>
              ))}
              <button
                onClick={() => window.print()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600"
              >
                <Printer className="h-4 w-4" /> Print fee statement
              </button>
            </>
          )
        )}

        {/* ── Homework ── */}
        {tab === 'homework' && (
          !assignmentList.length ? (
            <EmptyState message="No homework has been given yet" />
          ) : (
            assignmentList.map((a) => {
              const overdue = a.dueDate && new Date(a.dueDate) < new Date();
              return (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold">{a.title}</h3>
                    {a.dueDate && <Badge tone={overdue ? 'red' : 'amber'}>{overdue ? 'Was due ' : 'Due '}{formatDate(a.dueDate)}</Badge>}
                  </div>
                  <p className="mt-1 text-xs font-medium text-brand-600">{a.subject?.name || 'General'}</p>
                  {a.description && <p className="mt-1.5 text-sm text-slate-600">{a.description}</p>}
                  <p className="mt-2 text-[10px] text-slate-400">Given by {a.teacher?.name || '—'} · {formatDate(a.createdAt)}</p>
                </Card>
              )
            })
          )
        )}
      </div>
    </div>
  );
};

export default ParentPortal;
