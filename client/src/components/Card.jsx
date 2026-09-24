export function Card({ children, className = '', pad = false }) {
  return <div className={`card ${pad ? 'card-pad' : ''} ${className}`}>{children}</div>;
}

export function CardHeader({ title, action, right }) {
  return (
    <div className="card-header">
      <span className="card-title">{title}</span>
      <div className="flex" style={{ gap: 8 }}>
        {action}
        {right}
      </div>
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`card-body ${className}`}>{children}</div>;
}