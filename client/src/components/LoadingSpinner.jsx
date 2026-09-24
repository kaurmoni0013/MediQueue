export default function LoadingSpinner({ label }) {
  return (
    <div className="spinner-wrap">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span className="spinner" />
        {label ? <div className="muted small">{label}</div> : null}
      </div>
    </div>
  );
}