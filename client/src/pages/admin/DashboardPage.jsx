import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Stethoscope, UserCheck, CalendarClock, Clock, CheckCircle2, XCircle, Activity, ArrowRight } from 'lucide-react';
import { adminSummary } from '../../services/admin.api';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import { initials, todayKey, prettyDate } from '../../utils/format';

const STATUS_ORDER = ['SCHEDULED', 'WAITING', 'IN_CONSULT', 'COMPLETED', 'CANCELLED'];

const FLOW = {
  SCHEDULED: { key: 'SCHEDULED', color: 'var(--scheduled-text)', bg: 'var(--scheduled-bg)' },
  WAITING: { key: 'WAITING', color: 'var(--waiting-text)', bg: 'var(--waiting-bg)' },
  IN_CONSULT: { key: 'IN_CONSULT', color: 'var(--in-consult-text)', bg: 'var(--in-consult-bg)' },
  COMPLETED: { key: 'COMPLETED', color: 'var(--completed-text)', bg: 'var(--completed-bg)' },
  CANCELLED: { key: 'CANCELLED', color: 'var(--cancelled-text)', bg: 'var(--cancelled-bg)' },
};

export default function AdminDashboardPage() {
  const query = useQuery({ queryKey: ['admin', 'summary'], queryFn: adminSummary, refetchInterval: 30000 });

  const flow = useMemo(() => {
    if (!query.data) return null;
    const today = query.data.today || {};
    const total = today.total || 0;
    const segments = STATUS_ORDER.map((status) => {
      const count = today.byStatus?.[status] ?? 0;
      return { ...FLOW[status], count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
    });
    return { total, segments };
  }, [query.data]);

  if (query.isLoading) return <LoadingSpinner label="Loading admin overview…" />;
  if (query.isError) return <ErrorState title="Unable to load admin overview" onRetry={() => query.refetch()} />;

  const { counts = {}, today = {}, recentPatients = [] } = query.data;
  const totalUsers = (counts.doctors || 0) + (counts.staff || 0) + (counts.patients || 0);
  const todayByDoctor = today.byDoctor || [];

  return (
    <div className="stack">
      <div className="dash-hero">
        <div className="hero-pill">
          <span className="hero-dots"><i /><i /><i /></span>
          Live overview
        </div>
        <h1>Welcome back, admin</h1>
        <p className="page-sub">
          Clinic overview for {prettyDate(todayKey())}. Here is what is happening today across every department.
        </p>
      </div>

      <div className="kpi-grid">
        <DashboardCard label="Patients" value={counts.patients ?? 0} icon={<Users size={13} />} hint="Registered" chip="c-info" />
        <DashboardCard label="Doctors" value={counts.doctors ?? 0} icon={<Stethoscope size={13} />} hint="On the roster" chip="c-primary" />
        <DashboardCard label="Staff" value={counts.staff ?? 0} icon={<UserCheck size={13} />} hint="Front desk" chip="c-success" />
        <DashboardCard label="Total users" value={totalUsers} icon={<Activity size={13} />} hint="Across all roles" chip="c-cancelled" />
        <DashboardCard label="Today's visits" value={today.total ?? 0} icon={<CalendarClock size={13} />} hint={`${today.active ?? 0} currently in flow`} chip="c-consult" />
        <DashboardCard label="Waiting now" value={flow.segments.find((s) => s.key === 'WAITING').count} icon={<Clock size={13} />} hint="Patients in the queue" chip="c-wait" />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.9fr 1fr' }}>
        <section className="card">
          <div className="card-header">
            <div className="panel-title">Today's flow <span className="muted">· status breakdown</span></div>
            <StatusBadge status="WAITING" />
          </div>
          <div className="card-body">
            <div className="flow-segments">
              {flow.segments.map((s) =>
                s.count > 0 ? (
                  <i key={s.key} style={{ width: `${s.pct}%`, background: s.color }} title={`${s.key}: ${s.count}`} />
                ) : null
              )}
            </div>
            {flow.segments.map((s) => (
              <div key={s.key} className="flow-row">
                <span className="dot" style={{ background: s.color }} />
                <span className="flow-label">{s.key.replace('_', ' ')}</span>
                <span className="flow-pct">{s.pct}%</span>
                <span className="flow-count">{s.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="panel-title">Quick actions</div>
          </div>
          <div className="card-body quick-actions">
            <Link to="/admin/doctors" className="quick-action">
              <span className="chip"><Stethoscope size={14} /></span>
              Manage doctors
              <span className="qa-sub">{counts.doctors ?? 0} on roster <ArrowRight size={11} /></span>
            </Link>
            <Link to="/admin/staff" className="quick-action">
              <span className="chip"><UserCheck size={14} /></span>
              Manage staff
              <span className="qa-sub">{counts.staff ?? 0} accounts <ArrowRight size={11} /></span>
            </Link>
            <Link to="/admin/patients" className="quick-action">
              <span className="chip"><Users size={14} /></span>
              Manage patients
              <span className="qa-sub">{counts.patients ?? 0} registered <ArrowRight size={11} /></span>
            </Link>
          </div>
        </section>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.9fr 1fr' }}>
        <section className="card">
          <div className="card-header">
            <div className="panel-title">Today by doctor <span className="muted">· appointment load</span></div>
          </div>
          <div className="card-body stack" style={{ gap: 10 }}>
            {todayByDoctor.length === 0 && <p className="muted small">No appointments scheduled today yet.</p>}
            {todayByDoctor.map((doc) => {
              const done = doc.COMPLETED || 0;
              const active = (doc.SCHEDULED || 0) + (doc.WAITING || 0) + (doc.IN_CONSULT || 0);
              return (
                <div key={doc.doctorId} className="doctor-card">
                  <div className="avatar">{initials(doc.name)}</div>
                  <div>
                    <div className="dc-name">{doc.name}</div>
                    <div className="dc-sub">{done} completed · {active} active</div>
                  </div>
                  <div className="dc-counts">
                    <div><b>{doc.total}</b><span>total</span></div>
                    <div><b className="bold" style={{ color: 'var(--waiting-text)' }}>{doc.WAITING || 0}</b><span>waiting</span></div>
                    <div><b className="bold" style={{ color: 'var(--in-consult-text)' }}>{doc.IN_CONSULT || 0}</b><span>in consult</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="panel-title">Recent registrations</div>
          </div>
          <div className="card-body">
            {recentPatients.length === 0 && <p className="muted small">No patients registered yet.</p>}
            {recentPatients.map((p) => (
              <div key={p.id} className="recent-row">
                <div className="avatar">{initials(p.name)}</div>
                <div className="rr-name">{p.name}</div>
                <div className="rr-mail">{p.email}</div>
                <div className="rr-when">
                  {p.isActive ? <CheckCircle2 size={12} style={{ color: 'var(--completed-text)' }} /> : <XCircle size={12} style={{ color: 'var(--cancelled-text)' }} />}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}