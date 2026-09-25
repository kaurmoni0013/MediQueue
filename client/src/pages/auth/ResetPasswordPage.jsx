import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Loader2, KeyRound } from 'lucide-react';
import { resetPassword } from '../../services/auth.api';
import { getErrorMessage } from '../../services/api';
import ThemeToggle from '../../components/ThemeToggle';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err).message);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-shell">
        <ThemeToggle className="auth-theme-toggle" />
        <div className="card card-pad auth-card" style={{ textAlign: 'center' }}>
          <div className="state-icon" style={{ margin: '0 auto 10px' }}>
            <KeyRound size={22} />
          </div>
          <h1 style={{ fontSize: 17 }}>Invalid reset link</h1>
          <p className="muted small mt-2">This link is missing its token. Request a fresh one.</p>
          <div className="mt-3">
            <Link to="/forgot-password">Request a new link</Link>
          </div>
        </div>
      </div>
    );
  }

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
        <p className="auth-sub">Choose a new password for your account.</p>

        <div className="card card-pad auth-card">
          {done ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div className="state-icon" style={{ margin: '0 auto 10px' }}>
                <KeyRound size={22} />
              </div>
              <h1 style={{ fontSize: 17, marginBottom: 6 }}>Password updated</h1>
              <p className="muted small">Your password has been changed and old sessions were signed out.</p>
              <div className="mt-3">
                <Link to="/login">Sign in with your new password</Link>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 17, marginBottom: 4 }}>New password</h1>
              <p className="muted small mb-3">At least 8 characters, with a letter and a number.</p>

              <form onSubmit={submit}>
                <div className="field">
                  <label htmlFor="password">New password</label>
                  <input
                    id="password"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="field">
                  <label htmlFor="confirm">Confirm new password</label>
                  <input
                    id="confirm"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {error ? (
                  <div
                    className="hl-box mb-3"
                    style={{ borderLeftColor: 'var(--danger)', background: 'var(--cancelled-bg)', borderColor: 'transparent' }}
                  >
                    {error}
                  </div>
                ) : null}
                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                  {busy ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                  Update password
                </button>
              </form>

              <p className="auth-foot">
                <Link to="/login">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}