import { STATUS_LABELS } from '../utils/format';

export default function StatusBadge({ status, withDot = true, label }) {
  const cls = `badge badge-${String(status || '').toLowerCase().replace(/_/g, '-')}`;
  return (
    <span className={cls}>
      {withDot ? <span className="badge-dot" /> : null}
      {label || STATUS_LABELS[status] || status}
    </span>
  );
}