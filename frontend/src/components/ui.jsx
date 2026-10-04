
/* ── Status badge with dot — for workflow states ── */
const STATUS_DOTS = {
  ACTIVE: 'bg-emerald-500', PAID: 'bg-emerald-500', PRESENT: 'bg-emerald-500', APPROVED: 'bg-emerald-500', SENT: 'bg-emerald-500', PUBLISHED: 'bg-emerald-500',
  PARTIAL: 'bg-amber-500', PENDING: 'bg-amber-500', LATE: 'bg-amber-500', PAUSED: 'bg-amber-500', UNPAID: 'bg-red-500', ABSENT: 'bg-red-500', FAILED: 'bg-red-500', REJECTED: 'bg-red-500', WITHDRAWN: 'bg-red-500',
  LOGGED: 'bg-slate-400', GRADUATED: 'bg-blue-500', TRANSFERRED: 'bg-indigo-500', EXCUSED: 'bg-cyan-500', ENDED: 'bg-slate-400',
};
const STATUS_TONES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700', PAID: 'bg-emerald-50 text-emerald-700', PRESENT: 'bg-emerald-50 text-emerald-700', APPROVED: 'bg-emerald-50 text-emerald-700', SENT: 'bg-emerald-50 text-emerald-700',
  PARTIAL: 'bg-amber-50 text-amber-700', PENDING: 'bg-amber-50 text-amber-700', LATE: 'bg-amber-50 text-amber-700', PAUSED: 'bg-amber-50 text-amber-700',
  UNPAID: 'bg-red-50 text-red-700', ABSENT: 'bg-red-50 text-red-700', FAILED: 'bg-red-50 text-red-700', REJECTED: 'bg-red-50 text-red-700', WITHDRAWN: 'bg-red-50 text-red-700',
  GRADUATED: 'bg-blue-50 text-blue-700', TRANSFERRED: 'bg-indigo-50 text-indigo-700', EXCUSED: 'bg-cyan-50 text-cyan-700', WAIVED: 'bg-slate-100 text-slate-600', ENDED: 'bg-slate-100 text-slate-600', LOGGED: 'bg-slate-100 text-slate-600',
};

export const Badge = ({ children, tone, status }) => {
  const key = (status || children || '').toString().toUpperCase();
  const t = STATUS_TONES[key] || 'bg-slate-100 text-slate-600';
  const dot = STATUS_DOTS[key] || 'bg-slate-400';
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-black/5 ${tone && !status ? (tones[tone] || 'bg-slate-100 text-slate-600') : t}`}>
      {(status || STATUS_DOTS[key]) && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {children}
    </span>
  );
};

const tones = {
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  red: 'bg-red-50 text-red-700 ring-red-600/15',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  blue: 'bg-brand-50 text-brand-700 ring-brand-600/15',
};

/* ── Toned pill — for counts, labels, hints ── */
export const Pill = ({ tone = 'slate', children, title }) => (
  <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone] || tones.slate}`}>
    {children}
  </span>
);

/* ── Success / error banner ── */
export const Flash = ({ ok, error, children }) => {
  if (!ok && !error && !children) return null;
  const isErr = !!error;
  return (
    <div className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${isErr ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${isErr ? 'bg-red-500' : 'bg-emerald-500'}`} />
      <span className="font-medium">{error || ok || children}</span>
    </div>
  );
};

export const Spinner = ({ className = 'h-6 w-6' }) => (
  <svg className={`animate-spin text-brand-500 ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);


/* ── Skeleton loaders (shimmer placeholders) ── */
export const Skeleton = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />
);

export const SkeletonStats = ({ count = 4 }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="p-4 sm:p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-20" />
        <Skeleton className="mt-2 h-3 w-36" />
      </Card>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 6 }) => (
  <Card className="overflow-hidden">
    <Skeleton className="h-11 w-full rounded-none" />
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="hidden h-3 w-16 sm:block" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  </Card>
);

export const SkeletonCards = ({ count = 6 }) => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </Card>
    ))}
  </div>
);

export const SkeletonPage = () => (
  <div>
    <div className="mb-6">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-72" />
    </div>
    <SkeletonStats />
    <div className="mt-6" />
    <SkeletonTable rows={5} />
  </div>
);

/* ── Card + header row (icon chip / title / sub / action) ── */
export const Card = ({ className = '', children }) => (
  <div className={`card ${className}`}>{children}</div>
);

export const CardHeader = ({ title, sub, icon: Icon, action, className = '' }) => (
  <div className={`flex items-start justify-between gap-3 px-5 pb-3 pt-4 ${className}`}>
    <div className="flex min-w-0 items-start gap-3">
      {Icon && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-6 text-slate-900">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/* ── Stat card with icon chip ── */
const STAT_TONES = {
  blue: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
};

export const StatCard = ({ label, value, sub, tone = 'blue', icon: Icon }) => {
  const isTextTone = tone && tone.startsWith('text-');
  const chip = isTextTone
    ? { 'text-red-600': 'bg-red-50', 'text-emerald-600': 'bg-emerald-50' }[tone] || 'bg-slate-100'
    : STAT_TONES[tone] || STAT_TONES.blue;
  const valueTone = isTextTone ? tone : '';
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${chip}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`mt-1 text-xl font-bold tracking-tight tabular-nums text-slate-900 sm:text-2xl ${valueTone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
};

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

/* ── Empty state with icon circle ── */
export const EmptyState = ({ icon: Icon, message, children }) => (
  <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-slate-500">
    <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-400">
      {Icon ? <Icon className="h-5 w-5" /> : '…'}
    </span>
    <div>{message || children}</div>
  </div>
);

export const ErrorNote = ({ error }) =>
  error ? (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
      <span className="font-medium">{error.response?.data?.message || error.message}</span>
    </div>
  ) : null;

/* ── Avatar with deterministic hue from the name ── */
const HUES = ['bg-brand-100 text-brand-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700'];
export const Avatar = ({ user, name, size = 'h-8 w-8', text = 'text-xs', className = '' }) => {
  const n = name || user?.name || '?';
  const img = user?.avatarUrl;
  if (img) return <img src={img} alt="" className={`${size} shrink-0 rounded-full object-cover ${className}`} />;
  const hue = HUES[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
  return <span className={`grid ${size} shrink-0 place-items-center rounded-full font-semibold ${hue} ${text} ${className}`}>{n.charAt(0).toUpperCase()}</span>;
};

/* ── Toolbar with search input (tables/filters) ── */
export const Toolbar = ({ children, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 ${className}`}>{children}</div>
);

export const SearchInput = ({ value, onChange, placeholder = 'Search…' }) => (
  <div className="relative min-w-[200px] flex-1">
    <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
    <input className="input h-9 !pl-8" value={value} onChange={onChange} placeholder={placeholder} />
  </div>
);

export const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-10 shadow-pop sm:rounded-xl sm:p-6 sm:pb-6 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
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
