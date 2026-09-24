import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="auth-shell">
      <div className="card card-pad auth-card">
        <div className="state" style={{ padding: 16 }}>
          <div className="state-icon">
            <Compass size={22} />
          </div>
          <div className="state-title">Page not found</div>
          <div className="state-desc">The page you are looking for does not exist.</div>
          <div className="state-action">
            <Link to="/" className="btn btn-primary">
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}