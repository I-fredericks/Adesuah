import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, EmptyState, Badge, Card } from '../components/ui';
import { formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const STATUS_TONE = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' };

const Corrections = () => {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [note, setNote] = useState({});
  const [error, setError] = useState('');

  const canApprove = can('grades.approve');

  const { data, isLoading } = useQuery({
    queryKey: ['corrections', statusFilter],
    queryFn: () => api.get('/operations/corrections', { params: { status: statusFilter } }).then((r) => r.data),
  });

  const decide = useMutation({
    mutationFn: ({ id, approve }) =>
      api.post(`/operations/corrections/${id}/decide`, { approve, note: note[id] || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] });
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Result corrections"
        subtitle={
          canApprove
            ? 'Approve or reject score change requests — every decision is audit-logged'
            : 'Your correction requests and their status'
        }
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-200/60 p-1 w-fit">
        {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
          <button
            key={s}
            className={`rounded-md px-3 py-1.5 text-sm ${statusFilter === s ? 'bg-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonTable rows={7} />
      ) : !data || data.corrections.length === 0 ? (
        <EmptyState message={`No ${statusFilter.toLowerCase()} correction requests`} />
      ) : (
        <div className="space-y-3">
          {data.corrections.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {c.student.lastName}, {c.student.firstName}
                    </span>
                    <Badge tone="slate">{c.student.currentClass?.name || '—'}</Badge>
                    <Badge tone="blue">{c.term.name.replace('TERM_', 'Term ')}</Badge>
                    <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {c.subject.name} · {c.assessmentType.name}:{' '}
                    <span className="font-mono">{c.oldScore}</span> →{' '}
                    <span className="font-mono font-bold">{c.newScore}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Reason: “{c.reason}” — requested by {c.requestedBy?.name || '—'} · {formatDate(c.createdAt)}
                  </p>
                  {c.status !== 'PENDING' && (
                    <p className="mt-1 text-xs text-slate-400">
                      {c.status === 'APPROVED' ? 'Applied' : 'Rejected'} by {c.decidedBy?.name || '—'}
                      {c.decisionNote ? ` · “${c.decisionNote}”` : ''}
                    </p>
                  )}
                </div>
                {canApprove && c.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <input
                      className="input w-44"
                      placeholder="Decision note (optional)"
                      value={note[c.id] || ''}
                      onChange={(e) => setNote((n) => ({ ...n, [c.id]: e.target.value }))}
                    />
                    <button className="btn-primary" onClick={() => decide.mutate({ id: c.id, approve: true })} disabled={decide.isPending}>
                      Approve & apply
                    </button>
                    <button className="btn-danger" onClick={() => decide.mutate({ id: c.id, approve: false })} disabled={decide.isPending}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Corrections;
