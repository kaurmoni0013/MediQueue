import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <div className="state">
      <div className="state-icon">
        <Inbox size={22} />
      </div>
      <div className="state-title">{title}</div>
      {description ? <div className="state-desc">{description}</div> : null}
      {action ? <div className="state-action">{action}</div> : null}
    </div>
  );
}