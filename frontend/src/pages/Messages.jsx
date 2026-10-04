import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, FileText, AlertTriangle } from 'lucide-react';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, EmptyState, Badge, StatCard, Card } from '../components/ui';
import { formatDateTime } from '../utils/format';


const Messages = () => {
  const [status, setStatus] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['messages', status],
    queryFn: () => api.get('/messages', { params: status ? { status } : {} }).then((r) => r.data),
  });

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Every SMS sent (or logged) to parents and guardians — latest 200"
      />
      {error && <p className="mb-4 text-sm text-red-600">{getErrorMessage(error)}</p>}

      {data && !data.smsConnected && (
        <div className="mb-6 flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-[240px] flex-1">
            <b>SMS isn't set up yet.</b> Messages are logged here but not delivered. Add your
            Arkesel API key under Settings → Messaging, or use the WhatsApp links on fee
            debtors to reach parents today.
          </div>
          <Link to="/settings" className="btn-secondary btn-sm">Open settings</Link>
        </div>
      )}
      {data?.smsConnected && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div><b>SMS is connected.</b> Parents are texted automatically for fee reminders, absences and announcements.</div>
        </div>
      )}

      {data && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <StatCard icon={Send} tone="green" label="Sent" value={data.stats.sent} />
          <StatCard icon={FileText} tone="slate" label="Logged only" value={data.stats.logged} />
          <StatCard icon={AlertTriangle} tone="red" label="Failed" value={data.stats.failed} />
        </div>
      )}

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-200/60 p-1 w-fit">
        {['', 'SENT', 'LOGGED', 'FAILED'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1.5 text-sm ${status === s ? 'bg-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {s === '' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner className="mx-auto h-8 w-8" />
      ) : !data || data.messages.length === 0 ? (
        <EmptyState icon={MessageSquare} message="No messages yet — fee reminders and absence alerts will appear here" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="table-base w-full">
            <thead>
              <tr>
                <th>When</th>
                <th>Pupil</th>
                <th>Recipient</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.messages.map((m) => {
                                return (
                  <tr key={m.id} className="align-top">
                    <td className="whitespace-nowrap text-slate-500">{formatDateTime(m.createdAt)}</td>
                    <td>
                      {m.student ? (
                        <span className="font-medium text-slate-900">
                          {m.student.firstName} {m.student.lastName}
                          <span className="block text-[11px] text-slate-400">{m.student.currentClass?.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{m.recipient || '—'}</td>
                    <td className="max-w-md leading-relaxed text-slate-600">{m.message}</td>
                    <td>
                      <Badge status={m.status} title={m.response || undefined}>
                        {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default Messages;
