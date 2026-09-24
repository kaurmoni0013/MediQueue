export default function DashboardCard({ label, value, hint, icon, chip }) {
  return (
    <div className="kpi">
      <div className="kpi-label">
        {icon}
        {label}
      </div>
      {chip ? <div className={`kpi-chip ${chip}`}>{icon}</div> : null}
      <div className="kpi-value">{value}</div>
      {hint ? <div className="kpi-hint">{hint}</div> : null}
    </div>
  );
}