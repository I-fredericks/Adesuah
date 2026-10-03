import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { PageHeader, Spinner, EmptyState, Badge, Modal } from '../components/ui';
import { formatDate, formatMoney } from '../utils/format';

const ParentPortal = () => {
  const [selected, setSelected] = useState(null);
  const [reportTerm, setReportTerm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['myChildren'],
    queryFn: () => api.get('/portal/children').then((r) => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ['child', selected],
    queryFn: () => api.get(`/portal/children/${selected}`).then((r) => r.data),
    enabled: !!selected,
  });

  const { data: report } = useQuery({
    queryKey: ['childReport', selected, reportTerm],
    queryFn: () => api.get(`/portal/children/${selected}/report`, { params: { termId: reportTerm } }).then((r) => r.data),
    enabled: !!selected && !!reportTerm,
  });

  const { data: assignments } = useQuery({
    queryKey: ['childAssignments', selected],
    queryFn: () => api.get(`/portal/children/${selected}/assignments`).then((r) => r.data),
    enabled: !!selected,
  });

  if (isLoading) return <Spinner className="mx-auto h-8 w-8" />;

  return (
    <div>
      <PageHeader title="My children" subtitle="Attendance, fees and published results" />

      {!data || data.children.length === 0 ? (
        <EmptyState message="No children linked to your account yet. Please contact the school office." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.children.map((c) => (
            <button key={c.id} className="card p-5 text-left transition hover:shadow-md" onClick={() => { setSelected(c.id); setReportTerm(null); }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{c.name}</h3>
                <Badge tone="blue">{c.class || 'No class'}</Badge>
              </div>
              <p className="mt-1 font-mono text-xs text-slate-400">{c.admissionNo}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Attendance</p>
                  <p className="font-semibold">{c.attendanceRate !== null ? `${c.attendanceRate}%` : '—'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Fee balance</p>
                  <p className={`font-semibold ${c.feeBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatMoney(c.feeBalance)}
                  </p>
                </div>
              </div>
              {c.latestResult && (
                <p className="mt-3 text-xs text-slate-500">
                  Latest: {c.latestResult.term.name.replace('TERM_', 'Term ')} · average{' '}
                  <span className="font-semibold">{c.latestResult.average}%</span> · position {c.latestResult.classPosition}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {detail && (
        <Modal open onClose={() => { setSelected(null); setReportTerm(null); }} title={`${detail.child.name} — ${detail.child.class || ''}`} wide>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Attendance</h3>
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                {Object.entries(detail.attendance).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-slate-200 p-2">
                    <p className="text-lg font-bold">{v}</p>
                    <p className="text-[10px] uppercase text-slate-400">{k}</p>
                  </div>
                ))}
              </div>

              <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Fees</h3>
              {detail.invoices.length === 0 ? (
                <p className="text-sm text-slate-400">No invoices yet</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {detail.invoices.map((i) => (
                    <li key={i.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <span>{i.term.replace('TERM_', 'Term ')}</span>
                      <span className={i.balance > 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600'}>
                        {formatMoney(i.balance)} {i.status !== 'PAID' && <Badge tone={i.status === 'PARTIAL' ? 'amber' : 'red'}>{i.status}</Badge>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Published reports</h3>
              {detail.reportCards.length === 0 ? (
                <p className="text-sm text-slate-400">No published reports yet</p>
              ) : (
                <ul className="space-y-2">
                  {detail.reportCards.map((rc) => (
                    <li key={rc.id}>
                      <button
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${reportTerm === rc.termId ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
                        onClick={() => setReportTerm(rc.termId)}
                      >
                        <span className="font-medium">{rc.term.name.replace('TERM_', 'Term ')}</span>
                        <span className="float-right text-slate-500">avg {rc.average}% · {rc.classPosition ? `${rc.classPosition} position` : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {report?.reportCard && (
                <div className="mt-3 rounded-lg border border-slate-200 p-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-400">
                        <th className="py-1">Subject</th>
                        <th className="py-1 text-center">Total</th>
                        <th className="py-1 text-center">Grade</th>
                        <th className="py-1 text-center">Pos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.reportCard.subjects.map((s) => (
                        <tr key={s.subjectId} className="border-t border-slate-100">
                          <td className="py-1">{s.subject}</td>
                          <td className="py-1 text-center">{s.total ?? '—'}</td>
                          <td className="py-1 text-center font-semibold">{s.grade ?? '—'}</td>
                          <td className="py-1 text-center">{s.position ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-slate-400">
                    Published {formatDate(report.reportCard.publishedAt)} · teacher: “{report.reportCard.teacherRemark || '—'}”
                  </p>
                </div>
              )}

              <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Homework & assignments
              </h3>
              {!assignments || assignments.length === 0 ? (
                <p className="text-sm text-slate-400">No assignments given yet</p>
              ) : (
                <ul className="space-y-2">
                  {assignments.slice(0, 8).map((a) => (
                    <li key={a.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{a.title}</span>
                        {a.dueDate && <Badge tone="amber">Due {formatDate(a.dueDate)}</Badge>}
                      </div>
                      <p className="text-xs text-slate-400">
                        {a.subject?.name || 'General'}{a.teacher ? ` · ${a.teacher.name}` : ''}
                      </p>
                      {a.description && <p className="mt-1 text-xs text-slate-500">{a.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ParentPortal;
