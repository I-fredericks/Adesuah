import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, EmptyState, Badge, Modal, ErrorNote, StatCard } from '../components/ui';
import { formatMoney, formatDate, ROLE_LABELS } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const RecordSalaryModal = ({ staff, onClose }) => {
  const queryClient = useQueryClient();
  const now = new Date();
  const [form, setForm] = useState({
    userId: staff.id,
    period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    amount: '',
    method: 'MOMO',
    reference: '',
    note: '',
  });
  const [error, setError] = useState('');

  const record = useMutation({
    mutationFn: (payload) => api.post('/salary', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <Modal open onClose={onClose} title={`Record salary — ${staff.name}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          record.mutate({ ...form, amount: Number(form.amount) });
        }}
        className="space-y-4"
      >
        <ErrorNote error={error ? { response: { data: { message: error } } } : null} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Period (month) *</label>
            <input className="input" type="month" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Amount (GHS) *</label>
            <input className="input" type="number" step="0.01" min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
              <option>MOMO</option>
              <option>BANK</option>
              <option>CASH</option>
              <option>CHEQUE</option>
            </select>
          </div>
          <div>
            <label className="label">Reference</label>
            <input className="input" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
          </div>
          <div className="col-span-full">
            <label className="label">Note</label>
            <input className="input" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={record.isPending}>{record.isPending ? 'Saving…' : 'Record payment'}</button>
        </div>
      </form>
    </Modal>
  );
};

const Salary = () => {
  const { can } = useAuth();
  const canViewAll = can('payroll.view_all');
  const [recording, setRecording] = useState(null);
  const [period, setPeriod] = useState('');

  const { data: mine } = useQuery({
    queryKey: ['mySalary'],
    queryFn: () => api.get('/salary/mine').then((r) => r.data),
  });

  const { data: all, isLoading } = useQuery({
    queryKey: ['salaries', period],
    queryFn: () => api.get('/salary', { params: period ? { period } : {} }).then((r) => r.data),
    enabled: canViewAll,
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then((r) => r.data),
    enabled: can('payroll.record'),
  });

  const total = (canViewAll ? all?.payments || [] : mine?.payments || []).reduce(
    (s, p) => s + Number(p.amount),
    0
  );

  return (
    <div>
      <PageHeader
        title="Salary"
        subtitle={canViewAll ? 'Staff salary payments' : 'Your salary payments'}
        actions={
          can('payroll.record') && staffData?.staff?.length > 0 && (
            <button className="btn-primary" onClick={() => setRecording(staffData.staff[0])}>Record salary payment</button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label={canViewAll ? 'Total paid (listed)' : 'Total paid to you'} value={formatMoney(total)} />
        {mine && (
          <StatCard label="Your last payment" value={mine.payments[0] ? formatMoney(mine.payments[0].amount) : '—'} sub={mine.payments[0] ? `Period ${mine.payments[0].period}` : 'No payments yet'} />
        )}
      </div>

      {/* My payments — everyone */}
      <div className="card mb-6 overflow-x-auto">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">My payments</div>
        {!mine || mine.payments.length === 0 ? (
          <EmptyState message="No salary payments recorded for you yet" />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Period</th>
                <th className="th">Amount</th>
                <th className="th">Method</th>
                <th className="th">Reference</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mine.payments.map((p) => (
                <tr key={p.id}>
                  <td className="td font-medium">{p.period}</td>
                  <td className="td font-semibold text-emerald-600">{formatMoney(p.amount)}</td>
                  <td className="td"><Badge tone="slate">{p.method}</Badge></td>
                  <td className="td text-slate-500">{p.reference || '—'}</td>
                  <td className="td text-slate-500">{formatDate(p.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* All staff — finance/head only */}
      {canViewAll && (
        <div className="card overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-semibold">All staff payments</span>
            <input
              className="input max-w-40"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="Filter by month"
            />
          </div>
          {isLoading ? (
            <Spinner className="mx-auto h-8 w-8" />
          ) : !all || all.payments.length === 0 ? (
            <EmptyState message="No salary payments recorded" />
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Staff</th>
                  <th className="th">Role</th>
                  <th className="th">Period</th>
                  <th className="th">Amount</th>
                  <th className="th">Method</th>
                  <th className="th">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {all.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="td font-medium">{p.user.name}</td>
                    <td className="td text-slate-500">{ROLE_LABELS[p.user.role] || p.user.role}</td>
                    <td className="td">{p.period}</td>
                    <td className="td font-semibold text-emerald-600">{formatMoney(p.amount)}</td>
                    <td className="td"><Badge tone="slate">{p.method}</Badge></td>
                    <td className="td text-slate-500">{p.recordedBy?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {recording && can('payroll.record') && (
        <RecordSalaryModal staff={recording} onClose={() => setRecording(null)} />
      )}
    </div>
  );
};

export default Salary;
