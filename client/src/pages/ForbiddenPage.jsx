import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="auth-shell">
      <div className="card card-pad auth-card">
        <div className="state" style={{ padding: 16 }}>
          <div className="state-icon" style={{ background: 'var(--cancelled-bg)', color: 'var(--danger)' }}>
            <ShieldAlert size={22} />
          </div>
          <div className="state-title">Access restricted</div>
          <div className="state-desc">Your account does not have permission to view this area.</div>
          <div className="state-action">
            <Link to="/" className="btn btn-primary">
              Back to my dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}