import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Loader2, MailCheck } from 'lucide-react';
import { forgotPassword } from '../../services/auth.api';
import { getErrorMessage } from '../../services/api';
import ThemeToggle from '../../components/ThemeToggle';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err).message);
    } finally {
      setBusy(false);
    }
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
        <p className="auth-sub">Reset your password and get back to the clinic.</p>

        <div className="card card-pad auth-card">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div className="state-icon" style={{ margin: '0 auto 10px' }}>
                <MailCheck size={22} />
              </div>
              <h1 style={{ fontSize: 17, marginBottom: 6 }}>Check your inbox</h1>
              <p className="muted small">
                If an account exists for <b>{email}</b>, a reset link is on its way and stays valid for 30
                minutes.
              </p>
              <div className="mt-3">
                <Link to="/login">Back to sign in</Link>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 17, marginBottom: 4 }}>Forgot password</h1>
              <p className="muted small mb-3">Enter your account email and we will send a reset link.</p>

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
                  Send reset link
                </button>
              </form>

              <p className="auth-foot">
                Remembered it? <Link to="/login">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}