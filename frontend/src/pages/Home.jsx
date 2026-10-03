import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  UserPlus,
  Wallet,
  FileText,
  CalendarCheck,
  Megaphone,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  BellRing,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    icon: UserPlus,
    title: 'Admissions & pupil records',
    body: 'Enroll pupils with auto admission numbers, guardian contacts and full class history — no more paper admission registers.',
  },
  {
    icon: Wallet,
    title: 'Fees, receipts & debtors',
    body: 'Termly fee structures become invoices in one click. Record cash or MoMo payments, print receipts, and always know who owes what.',
  },
  {
    icon: FileText,
    title: 'Report cards in minutes',
    body: 'Enter scores once — Adesuah computes weighted totals, grades, subject and class positions, then prints beautiful A4 report cards.',
  },
  {
    icon: CalendarCheck,
    title: 'Daily attendance',
    body: 'One-tap class registers with present/absent/late records. Attendance appears on every report card automatically.',
  },
  {
    icon: Megaphone,
    title: 'Announcements that reach parents',
    body: 'Send notices to the whole school, one class, or staff only — delivered in-app and by SMS to guardians.',
  },
  {
    icon: ShieldCheck,
    title: 'Your school, your data',
    body: 'Every school gets its own isolated workspace. Your pupils, fees and results are never mixed with another school’s.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Register your school',
    body: 'Create your school workspace with your school name, location and proprietor account. Free to start.',
  },
  {
    n: '2',
    title: 'Everything is set up for you',
    body: 'Classes from KG 1 to JHS 3, the Ghanaian subjects, BECE grading scales and your 3-term calendar — ready on day one.',
  },
  {
    n: '3',
    title: 'Enroll, teach, get paid',
    body: 'Enroll pupils, invite your teachers, take attendance, enter scores and collect fees with printable receipts.',
  },
];

const Logo = ({ dark }) => (
  <span className="flex items-center gap-2">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
      <GraduationCap className="h-5 w-5 text-white" />
    </span>
    <span className={`text-xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
      Adesuah
    </span>
  </span>
);

const Home = () => {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
          <Link to="/" aria-label="Adesuah home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <Link to="/dashboard" className="btn-primary">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">Sign in</Link>
                <Link to="/register" className="btn-primary">Get started</Link>
              </>
            )}
          </div>
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 sm:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium text-slate-600">
              <a href="#features" className="rounded-lg px-3 py-2 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#how" className="rounded-lg px-3 py-2 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>How it works</a>
              <a href="#pricing" className="rounded-lg px-3 py-2 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>Pricing</a>
            </nav>
            <div className="mt-3 flex flex-col gap-2">
              {user ? (
                <Link to="/dashboard" className="btn-primary w-full" onClick={() => setMenuOpen(false)}>
                  Open dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary w-full" onClick={() => setMenuOpen(false)}>Sign in</Link>
                  <Link to="/register" className="btn-primary w-full" onClick={() => setMenuOpen(false)}>Get started</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-brand-100 blur-3xl opacity-60" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:px-6 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <GraduationCap className="h-3.5 w-3.5" />
              Built for Ghanaian private basic schools
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Run your whole school from{' '}
              <span className="text-brand-600">one place.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Adesuah is the school management system for private primary & JHS schools.
              Enroll pupils, track fees, take attendance, enter scores and print
              report cards — no more paper registers and handwritten ledgers.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary px-6 py-3 text-base">
                Register your school — free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="btn-secondary px-6 py-3 text-base">
                Sign in
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {['KG 1 – JHS 3', 'BECE 9-point grading', '3-term calendar', 'Works on any phone'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Product mock */}
          <div className="relative">
            <div className="card overflow-hidden shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-slate-400">adesuah — Rising Stars Academy</span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                {[
                  { label: 'Pupils', value: '412' },
                  { label: 'Attendance', value: '96%' },
                  { label: 'Collected', value: 'GHS 38,400' },
                  { label: 'Debtors', value: '23' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{s.label}</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-800">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 px-4 pb-4">
                {[
                  { name: 'Ama Sarpong', class: 'Primary 4', amount: 'GHS 200', tone: 'text-emerald-600' },
                  { name: 'Kofi Amankwah', class: 'JHS 1', amount: 'GHS 450', tone: 'text-emerald-600' },
                  { name: 'Efua Owusu', class: 'Primary 2', amount: 'GHS 150', tone: 'text-emerald-600' },
                ].map((p) => (
                  <div key={p.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{p.name}</span>
                    <span className="text-xs text-slate-400">{p.class}</span>
                    <span className={`font-semibold ${p.tone}`}>{p.amount}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card absolute -bottom-6 -left-4 hidden w-56 p-4 shadow-lg sm:block">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <BellRing className="h-4 w-4 text-brand-600" /> Fee reminder sent
              </div>
              <p className="mt-1 text-sm text-slate-700">Term 1 fees · 18 guardians notified by SMS</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem strip */}
      <section className="border-y border-slate-100 bg-slate-50 py-8">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <p className="text-center text-sm font-medium text-slate-500">
            Replace the paper admission register · the bursar’s fee ledger · weeks of handwritten report cards ·
            the WhatsApp announcement chaos
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Everything your school office does — digitised
          </h2>
          <p className="mt-3 text-slate-600">
            Designed around how Ghanaian private basic schools actually run, from the admission
            register to the end-of-term broadsheet.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition hover:shadow-md">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <f.icon className="h-5 w-5 text-brand-600" />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-slate-900 py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">Up and running today</h2>
            <p className="mt-3 text-slate-400">
              No installation, no IT person needed. If you can use WhatsApp, you can run Adesuah.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Simple pricing for every school</h2>
            <p className="mt-3 text-slate-600">
              Start free while you set up. Pay only when your school goes live — priced per term,
              not per pupil, so it stays affordable for small schools.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {[
                'Unlimited pupils, classes and staff accounts',
                'All features included — no feature paywalls',
                'Your data is backed up and yours to export',
                'SMS reminders charged at gateway cost',
              ].map((li) => (
                <li key={li} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {li}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-8 text-center shadow-lg">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400">While in launch</p>
            <p className="mt-2 text-5xl font-extrabold text-slate-900">Free</p>
            <p className="mt-2 text-sm text-slate-500">for your first term — every feature included</p>
            <Link to="/register" className="btn-primary mt-6 w-full py-3 text-base">
              Create your school workspace
            </Link>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ClipboardList className="h-3.5 w-3.5" /> Takes about 2 minutes
            </p>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-brand-600">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-14 text-center lg:flex-row lg:px-6 lg:text-left">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to ditch the paper registers?
            </h2>
            <p className="mt-2 text-brand-100">
              Join the private basic schools running admissions, fees and report cards on Adesuah.
            </p>
          </div>
          <Link to="/register" className="btn bg-white px-6 py-3 text-base font-semibold text-brand-700 hover:bg-brand-50">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row lg:px-6">
          <Logo />
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} Adesuah — school management for private basic schools.
          </p>
          <div className="flex gap-5 text-sm text-slate-500">
            <Link to="/login" className="hover:text-slate-800">Sign in</Link>
            <Link to="/register" className="hover:text-slate-800">Register school</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
