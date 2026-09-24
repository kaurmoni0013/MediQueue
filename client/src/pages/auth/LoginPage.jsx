import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import ThemeToggle from '../../components/ThemeToggle';

const DEMO = [
  { role: 'Patient', email: 'patient@mediqueue.com', password: 'Patient1234' },
  { role: 'Staff', email: 'staff@mediqueue.com', password: 'Staff1234' },
  { role: 'Doctor', email: 'ananya@mediqueue.com', password: 'Doctor1234' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const homeFor = (role) => (role === 'STAFF' ? '/staff/dashboard' : role === 'DOCTOR' ? '/doctor/dashboard' : '/patient/dashboard');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      navigate(homeFor(user.role));
    } catch (err) {
      setError(getErrorMessage(err).message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (demo) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setError('');
  };

  return (
    <div className="auth-shell">
      <ThemeToggle className="auth-theme-toggle" />
      <div>
        <div className="auth-logo">
          <span className="brand-mark">
            <Plus size={20} strokeWidth={3} />
          </span>
          <span className="auth-title">MediQueue</span>
        </div>
        <p className="auth-sub">Appointments organized. Queues predictable. Patients informed.</p>

        <div className="card card-pad auth-card">
          <h1 style={{ fontSize: 17, marginBottom: 4 }}>Sign in</h1>
          <p className="muted small mb-3">Use your clinic account to continue.</p>

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@mediqueue.com"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error ? (
              <div className="hl-box mb-3" style={{ borderLeftColor: 'var(--danger)', background: 'var(--cancelled-bg)', borderColor: 'transparent' }}>
                {error}
              </div>
            ) : null}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" style={{ animation: 'spin 0.8s linear infinite' }} /> : <LogIn size={15} />}
              Sign in
            </button>
          </form>

          <div className="mt-3">
            <div className="tiny bold muted mb-2">Demo accounts</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {DEMO.map((d) => (
                <button key={d.role} type="button" className="btn btn-secondary btn-block" style={{ justifyContent: 'space-between' }} onClick={() => fillDemo(d)}>
                  <span>{d.role}</span>
                  <span className="muted small">{d.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="auth-foot">
            New patient? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}