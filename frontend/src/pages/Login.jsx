import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap } from 'lucide-react';

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
      <Link to="/" className="mb-6 flex items-center gap-2 text-slate-500 transition hover:text-slate-700">
        <GraduationCap className="h-5 w-5" />
        <span className="text-sm font-medium">Back to home</span>
      </Link>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="mt-3 text-2xl font-bold text-slate-800">Adesuah</h1>
          <p className="text-sm text-slate-500">Sign in to your school account</p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
          <div>
            <label className="label">Email or phone</label>
            <input
              className="input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@school.edu.gh"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
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
  );
};

export default Login;
