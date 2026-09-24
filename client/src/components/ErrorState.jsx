import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ title = 'Unable to load this page', description, onRetry }) {
  return (
    <div className="state">
      <div className="state-icon" style={{ background: 'var(--cancelled-bg)', color: 'var(--danger)' }}>
        <AlertTriangle size={22} />
      </div>
      <div className="state-title">{title}</div>
      {description ? <div className="state-desc">{description}</div> : null}
      {onRetry ? (
        <div className="state-action">
          <button className="btn btn-secondary" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}