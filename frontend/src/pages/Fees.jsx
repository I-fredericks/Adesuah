import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, Printer, MessageCircle } from 'lucide-react';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, Spinner, EmptyState, Badge, Modal, ErrorNote, StatCard } from '../components/ui';
import { formatMoney, formatDate, termLabel } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const STATUS_TONE = { PAID: 'green', PARTIAL: 'amber', UNPAID: 'red', WAIVED: 'blue' };
const BUCKET_LABELS = { not_due: 'Not yet due', '1_30': '1–30 days', '31_60': '31–60 days', '60_plus': '60+ days' };

const ReceiptModal = ({ payment, onClose }) => {
  const { data } = useQuery({
    queryKey: ['invoice', payment.invoiceId],
    queryFn: () => api.get(`/fees/invoices/${payment.invoiceId}`).then((r) => r.data),
  });

  const guardianPhone = data?.invoice?.student?.guardians?.[0]?.phone?.replace(/\D/g, '');
  const waNumber = guardianPhone && guardianPhone.startsWith('0') ? `233${guardianPhone.slice(1)}` : guardianPhone;
  const waText = encodeURIComponent(
    `Adesuah Receipt ${payment.receiptNo}\n${payment.invoice.student.firstName} ${payment.invoice.student.lastName}\n${termLabel(payment.invoice.term?.name)} fees\nAmount paid: ${formatMoney(payment.amount)}\nBalance: ${formatMoney(data?.invoice?.balance ?? 0)}\nDate: ${formatDate(payment.paidAt)}\nThank you.`
  );

  return (
    <Modal open onClose={onClose} title={`Receipt ${payment.receiptNo}`}>
      <div className="print-area rounded-lg border border-slate-200 p-5 text-sm">
        <div className="mb-3 text-center">
          <p className="text-xs uppercase tracking-wide text-slate-400">Official receipt</p>
          <p className="font-mono text-sm font-bold">{payment.receiptNo}</p>
        </div>
        <dl className="space-y-1.5">
          <div className="flex justify-between"><dt className="text-slate-500">Pupil</dt><dd className="font-medium">{payment.invoice.student.firstName} {payment.invoice.student.lastName}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Class</dt><dd>{payment.invoice.student.currentClass?.name || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Term</dt><dd>{termLabel(payment.invoice.term?.name)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Amount paid</dt><dd className="font-bold text-emerald-600">{formatMoney(payment.amount)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Method</dt><dd>{payment.method}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Reference</dt><dd>{payment.reference || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Balance after</dt><dd>{formatMoney(data?.invoice?.balance ?? 0)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Date</dt><dd>{formatDate(payment.paidAt)}</dd></div>
        </dl>
      </div>
      <div className="no-print mt-4 flex justify-end gap-2">
        {waNumber && (
          <a className="btn-secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${waNumber}?text=${waText}`}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        )}
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>
    </Modal>
  );
};

const PaymentModal = ({ invoice, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ amount: invoice.balance, method: 'CASH', reference: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/fees/payments', {
        invoiceId: invoice.id,
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <Modal open onClose={onClose} title={`Record payment — ${invoice.student.firstName} ${invoice.student.lastName}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <ErrorNote error={error ? { response: { data: { message: error } } } : null} />
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p>{termLabel(invoice.term?.name)} · Total {formatMoney(invoice.amountTotal)}</p>
          <p className="font-semibold text-red-600">Balance: {formatMoney(invoice.balance)}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Amount (GHS) *</label>
            <input className="input" type="number" step="0.01" min="0.01" max={invoice.balance} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
              <option>CASH</option>
              <option>MOMO</option>
              <option>BANK</option>
              <option>CHEQUE</option>
              <option>OTHER</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Reference (MoMo ID, cheque №…)</label>
            <input className="input" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Record payment'}</button>
        </div>
      </form>
    </Modal>
  );
};

const StructureModal = ({ open, onClose, classes, terms }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ classId: '', termId: '', items: [{ name: 'Tuition', amount: '' }] });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/fees/structures', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structures'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const setItem = (i, k, v) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)),
    }));

  const total = form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <Modal open={open} onClose={onClose} title="New fee structure" wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({
            classId: Number(form.classId),
            termId: Number(form.termId),
            name: 'Term fees',
            items: form.items.map((i) => ({ name: i.name, amount: Number(i.amount) })),
          });
        }}
        className="space-y-4"
      >
        <ErrorNote error={error ? { response: { data: { message: error } } } : null} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Class *</label>
            <select className="input" value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))} required>
              <option value="">Select…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Term *</label>
            <select className="input" value={form.termId} onChange={(e) => setForm((f) => ({ ...f, termId: e.target.value }))} required>
              <option value="">Select…</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.name.replace('TERM_', 'Term ')}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">Fee items *</label>
            <button type="button" className="text-sm text-brand-600 hover:underline" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { name: '', amount: '' }] }))}>
              + Add item
            </button>
          </div>
          <div className="space-y-2">
            {form.items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input className="input flex-1" placeholder="Item name" value={item.name} onChange={(e) => setItem(i, 'name', e.target.value)} required />
                <input className="input w-32" type="number" step="0.01" min="0" placeholder="GHS" value={item.amount} onChange={(e) => setItem(i, 'amount', e.target.value)} required />
                {form.items.length > 1 && (
                  <button type="button" className="px-2 text-slate-400 hover:text-red-500" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}>×</button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-sm font-semibold">Total: {formatMoney(total)}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Create structure'}</button>
        </div>
      </form>
    </Modal>
  );
};

const TABS = ['Invoices', 'Debtors', 'Structures', 'Payments'];

const Fees = () => {
  const { can } = useAuth();
  const [tab, setTab] = useState('Invoices');
  const [paying, setPaying] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [showStructure, setShowStructure] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');
  const queryClient = useQueryClient();

  const { data: termsData } = useQuery({
    queryKey: ['terms'],
    queryFn: () => api.get('/academic/terms').then((r) => r.data),
  });
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/academic/classes').then((r) => r.data),
  });
  const currentTerm = termsData?.terms.find((t) => t.isCurrent);
  const [termId, setTermId] = useState('');
  const effectiveTerm = termId || currentTerm?.id || '';

  const { data: summary } = useQuery({
    queryKey: ['feeSummary', effectiveTerm],
    queryFn: () => api.get('/fees/summary', { params: { termId: effectiveTerm } }).then((r) => r.data),
    enabled: !!effectiveTerm,
  });

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', effectiveTerm],
    queryFn: () => api.get('/fees/invoices', { params: { termId: effectiveTerm } }).then((r) => r.data),
    enabled: !!effectiveTerm,
  });

  const { data: debtorsData } = useQuery({
    queryKey: ['debtors', effectiveTerm],
    queryFn: () => api.get('/fees/debtors', { params: { termId: effectiveTerm } }).then((r) => r.data),
    enabled: !!effectiveTerm,
  });

  const { data: structuresData } = useQuery({
    queryKey: ['structures', effectiveTerm],
    queryFn: () => api.get('/fees/structures', { params: { termId: effectiveTerm } }).then((r) => r.data),
    enabled: !!effectiveTerm,
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['payments', effectiveTerm],
    queryFn: () => api.get('/fees/payments', { params: { termId: effectiveTerm } }).then((r) => r.data),
    enabled: !!effectiveTerm,
  });

  const generate = useMutation({
    mutationFn: (structureId) => api.post('/fees/invoices/generate', { structureId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['structures'] });
      queryClient.invalidateQueries({ queryKey: ['feeSummary'] });
    },
  });

  const runReminders = useMutation({
    mutationFn: () => api.post('/fees/reminders/run', null, { params: { termId: effectiveTerm } }),
    onSuccess: (res) => {
      setReminderMsg(res.data.message);
      setTimeout(() => setReminderMsg(''), 5000);
    },
  });

  const classes = classesData?.classes || [];
  const terms = termsData?.terms || [];

  return (
    <div>
      <PageHeader
        title="Fees"
        subtitle={currentTerm ? `${termLabel(currentTerm.name)} collections` : ''}
        actions={
          can('fees.structure_manage') && (
            <button className="btn-primary" onClick={() => setShowStructure(true)}>New fee structure</button>
          )
        }
        actions={
          can('fees.remind') && effectiveTerm && (
            <button className="btn-secondary" onClick={() => runReminders.mutate()} disabled={runReminders.isPending}>
              <BellRing className="h-4 w-4" /> {runReminders.isPending ? 'Sending…' : 'Run fee reminders'}
            </button>
          )
        }
      />
      {reminderMsg && <p className="mb-4 rounded-lg bg-sky-50 px-4 py-2 text-sm text-sky-700">{reminderMsg}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input max-w-44" value={effectiveTerm} onChange={(e) => setTermId(e.target.value)}>
          {terms.map((t) => <option key={t.id} value={t.id}>{t.name.replace('TERM_', 'Term ')}</option>)}
        </select>
      </div>

      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Expected" value={formatMoney(summary.expected)} sub={`${summary.invoiceCount} invoices`} />
          <StatCard label="Collected" value={formatMoney(summary.collected)} sub={`${summary.collectionRate}% collection rate`} tone="text-emerald-600" />
          <StatCard label="Outstanding" value={formatMoney(summary.outstanding)} sub={`${summary.unpaidCount} unpaid invoices`} tone="text-red-600" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-200/60 p-1">
        {TABS.map((t) => (
          <button key={t} className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? 'bg-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Structures' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(structuresData?.structures || []).length === 0 && <EmptyState message="No fee structures for this term yet" />}
          {(structuresData?.structures || []).map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{s.class?.name}</h3>
                <Badge tone="blue">{s._count?.invoices || 0} invoices</Badge>
              </div>
              <p className="mt-1 text-lg font-bold text-brand-600">{formatMoney(s.totalAmount)}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {s.items.map((i) => (
                  <li key={i.id} className="flex justify-between"><span>{i.name}</span><span>{formatMoney(i.amount)}</span></li>
                ))}
              </ul>
              {can('fees.invoice_generate') && s._count?.invoices === 0 && (
                <button
                  className="btn-secondary mt-3 w-full"
                  disabled={generate.isPending}
                  onClick={() => generate.mutate(s.id)}
                >
                  {generate.isPending ? 'Generating…' : 'Generate invoices'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'Invoices' && (
        isLoading ? <Spinner className="mx-auto h-8 w-8" /> :
        !invoicesData || invoicesData.invoices.length === 0 ? <EmptyState message="No invoices — create a fee structure and generate them" /> : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Pupil</th>
                  <th className="th">Class</th>
                  <th className="th">Total</th>
                  <th className="th">Paid</th>
                  <th className="th">Balance</th>
                  <th className="th">Status</th>
                  {can('fees.payment_record') && <th className="th"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoicesData.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="td">
                      <span className="font-medium">{inv.student.lastName}, {inv.student.firstName}</span>
                      <span className="ml-2 font-mono text-xs text-slate-400">{inv.student.admissionNo}</span>
                    </td>
                    <td className="td">{inv.student.currentClass?.name || '—'}</td>
                    <td className="td">
                      {formatMoney(inv.amountTotal)}
                      {(inv.installments || []).length > 0 && (
                        <span className="ml-1 text-[10px] text-slate-400">({inv.installments.length} inst.)</span>
                      )}
                    </td>
                    <td className="td text-emerald-600">{formatMoney(inv.amountPaid)}</td>
                    <td className="td font-semibold text-red-600">{formatMoney(inv.balance)}</td>
                    <td className="td"><Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge></td>
                    {can('fees.payment_record') && (
                      <td className="td">
                        {inv.balance > 0 && inv.status !== 'WAIVED' && (
                          <button className="text-sm font-medium text-brand-600 hover:underline" onClick={() => setPaying(inv)}>Pay</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'Debtors' && (
        !debtorsData || debtorsData.debtors.length === 0 ? <EmptyState message="No debtors — everyone is up to date" /> : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(debtorsData.ageing).map(([bucket, amount]) => (
                <StatCard
                  key={bucket}
                  label={BUCKET_LABELS[bucket] || bucket}
                  value={formatMoney(amount)}
                  tone={bucket === 'not_due' ? 'text-slate-800' : bucket === '60_plus' ? 'text-red-600' : 'text-amber-600'}
                />
              ))}
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="th">Pupil</th>
                    <th className="th">Class</th>
                    <th className="th">Guardian contact</th>
                    <th className="th">Due date</th>
                    <th className="th">Ageing</th>
                    <th className="th">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debtorsData.debtors.map((inv) => (
                    <tr key={inv.id}>
                      <td className="td font-medium">{inv.student.lastName}, {inv.student.firstName}</td>
                      <td className="td">{inv.student.currentClass?.name || '—'}</td>
                      <td className="td text-slate-500">{(inv.student.guardians || []).map((g) => g.phone).join(', ') || '—'}</td>
                      <td className="td text-slate-500">{formatDate(inv.dueDate)}</td>
                      <td className="td"><Badge tone={inv.bucket === 'not_due' ? 'blue' : inv.bucket === '60_plus' ? 'red' : 'amber'}>{BUCKET_LABELS[inv.bucket]}</Badge></td>
                      <td className="td font-semibold text-red-600">{formatMoney(inv.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t px-4 py-3 text-sm font-semibold">
                Total outstanding: <span className="text-red-600">{formatMoney(debtorsData.totalOutstanding)}</span>
              </p>
            </div>
          </>
        )
      )}

      {tab === 'Payments' && (
        !paymentsData || paymentsData.payments.length === 0 ? <EmptyState message="No payments recorded this term" /> : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Receipt №</th>
                  <th className="th">Date</th>
                  <th className="th">Pupil</th>
                  <th className="th">Method</th>
                  <th className="th">Amount</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentsData.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="td font-mono text-xs">{p.receiptNo}</td>
                    <td className="td text-slate-500">{formatDate(p.paidAt)}</td>
                    <td className="td font-medium">{p.invoice.student.lastName}, {p.invoice.student.firstName}</td>
                    <td className="td"><Badge tone={p.method === 'MOMO' ? 'blue' : 'slate'}>{p.method}</Badge></td>
                    <td className="td font-semibold text-emerald-600">{formatMoney(p.amount)}</td>
                    <td className="td">
                      <button className="text-sm font-medium text-brand-600 hover:underline" onClick={() => setReceipt(p)}>
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {paying && <PaymentModal invoice={paying} onClose={() => setPaying(null)} />}
      {receipt && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
      {showStructure && <StructureModal open onClose={() => setShowStructure(false)} classes={classes} terms={terms} />}
    </div>
  );
};

export default Fees;
