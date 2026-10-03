import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, CheckCircle2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await login(identifier, password);
      window.location.href = res.user?.role === 'PARENT' ? '/portal' : '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-black/10 blur-2xl" />
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="text-2xl font-bold tracking-tight">Adesuah</span>
        </Link>
        <div className="relative">
          <h1 className="text-4xl font-extrabold leading-tight">
            Your whole school,
            <br />
            one calm system.
          </h1>
          <p className="mt-4 max-w-md text-brand-100">
            Admissions, fees, attendance, results and parent communication — built for
            Ghanaian private basic schools.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-brand-50">
            {['Fee reminders and receipts that parents actually get', 'Report cards in minutes, not weekends', 'Teachers see only their own classes'].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-brand-200">Trusted by private primary & JHS schools across Ghana</p>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-brand-600" />
              <span className="text-xl font-bold">Adesuah</span>
            </Link>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to your school account to continue.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
            <div>
              <label className="label">Email or phone number</label>
              <input
                className="input h-11"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@school.edu.gh"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input h-11" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button className="btn-primary h-11 w-full text-base" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-center text-sm text-slate-500">
              New school?{' '}
              <Link to="/register" className="font-medium text-brand-600 hover:underline">
                Register your school
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
