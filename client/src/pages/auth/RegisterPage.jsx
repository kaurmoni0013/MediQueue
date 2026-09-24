import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone, password: form.password });
      navigate('/patient/dashboard');
    } catch (err) {
      setError(getErrorMessage(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div>
        <div className="auth-logo">
          <span className="brand-mark">
            <Plus size={20} strokeWidth={3} />
          </span>
          <span className="auth-title">MediQueue</span>
        </div>
        <p className="auth-sub">Create a patient account to book clinic appointments.</p>

        <div className="card card-pad auth-card">
          <h1 style={{ fontSize: 17, marginBottom: 4 }}>Create account</h1>
          <p className="muted small mb-3">Registered as a patient.</p>

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="r-name">Full name</label>
              <input id="r-name" className="input" required value={form.name} onChange={set('name')} placeholder="e.g. Rahul Mehta" />
            </div>
            <div className="field">
              <label htmlFor="r-email">Email address</label>
              <input id="r-email" className="input" type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
            </div>
            <div className="field">
              <label htmlFor="r-phone">Phone (optional)</label>
              <input id="r-phone" className="input" value={form.phone} onChange={set('phone')} placeholder="+91 …" />
            </div>
            <div className="field">
              <label htmlFor="r-password">Password</label>
              <input id="r-password" className="input" type="password" required value={form.password} onChange={set('password')} placeholder="At least 8 characters" />
              <div className="field-hint">Use a mix of letters and numbers.</div>
            </div>
            <div className="field">
              <label htmlFor="r-confirm">Confirm password</label>
              <input id="r-confirm" className="input" type="password" required value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" />
            </div>
            {error ? (
              <div className="hl-box mb-3" style={{ borderLeftColor: 'var(--danger)', background: 'var(--cancelled-bg)', borderColor: 'transparent' }}>
                {error}
              </div>
            ) : null}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" style={{ animation: 'spin 0.8s linear infinite' }} /> : <UserPlus size={15} />}
              Create account
            </button>
          </form>

          <p className="auth-foot">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}