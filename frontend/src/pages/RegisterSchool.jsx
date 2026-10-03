import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap } from 'lucide-react';

const RegisterSchool = () => {
  const { registerSchool } = useAuth();
  const [form, setForm] = useState({
    name: '',
    city: '',
    phone: '',
    gesRegNumber: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await registerSchool({
        school: {
          name: form.name,
          city: form.city,
          phone: form.phone,
          gesRegNumber: form.gesRegNumber,
        },
        owner: {
          name: form.ownerName,
          email: form.ownerEmail,
          phone: form.ownerPhone,
          password: form.password,
        },
      });
      window.location.href = res.user?.role === 'PARENT' ? '/portal' : '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-brand-600" />
          <h1 className="mt-2 text-xl font-bold">Register your school on Adesuah</h1>
          <p className="text-sm text-slate-500">
            Your school gets its own secure workspace. Classes, subjects, grading and a 3-term
            calendar are set up automatically.
          </p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="label">School name *</label>
              <input className="input" value={form.name} onChange={set('name')} required placeholder="e.g. Rising Stars Academy" />
            </div>
            <div>
              <label className="label">City / town</label>
              <input className="input" value={form.city} onChange={set('city')} />
            </div>
            <div>
              <label className="label">School phone</label>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="02xxxxxxxx" />
            </div>
            <div className="col-span-2">
              <label className="label">GES registration number (optional)</label>
              <input className="input" value={form.gesRegNumber} onChange={set('gesRegNumber')} />
            </div>
          </div>

          <hr />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2 text-sm font-medium text-slate-600">Proprietor / Head account</div>
            <div>
              <label className="label">Your name *</label>
              <input className="input" value={form.ownerName} onChange={set('ownerName')} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.ownerPhone} onChange={set('ownerPhone')} />
            </div>
            <div>
              <label className="label">Email (used to sign in) *</label>
              <input className="input" type="email" value={form.ownerEmail} onChange={set('ownerEmail')} required />
            </div>
            <div>
              <label className="label">Password * (min 8 characters)</label>
              <input className="input" type="password" value={form.password} onChange={set('password')} required minLength={8} />
            </div>
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating school workspace…' : 'Create school workspace'}
          </button>
          <p className="text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterSchool;
