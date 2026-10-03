export const Spinner = ({ className = 'h-6 w-6' }) => (
  <svg className={`animate-spin text-brand-600 ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);

export const Badge = ({ tone = 'slate', children }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-sky-100 text-sky-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
};

export const EmptyState = ({ message }) => (
  <div className="py-12 text-center text-sm text-slate-400">{message}</div>
);

export const ErrorNote = ({ error }) =>
  error ? (
    <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
      {error.response?.data?.message || error.message}
    </div>
  ) : null;

export const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-10 shadow-xl sm:rounded-xl sm:p-6 sm:pb-6 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-600">×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Card = ({ className = '', children }) => (
  <div className={`card ${className}`}>{children}</div>
);

export const StatCard = ({ label, value, sub, tone, icon: Icon }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      {Icon && (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
          <Icon className="h-5 w-5 text-brand-600" />
        </span>
      )}
    </div>
    <p className={`mt-1 text-2xl font-bold ${tone || 'text-slate-800'}`}>{value}</p>
    {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
  </div>
);
