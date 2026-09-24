import { useQuery } from '@tanstack/react-query';
import { Users, Stethoscope, UserCheck, CalendarClock, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { adminSummary } from '../../services/admin.api';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import { todayKey, prettyDate } from '../../utils/format';

const STATUS_ORDER = ['SCHEDULED', 'WAITING', 'IN_CONSULT', 'COMPLETED', 'CANCELLED'];

export default function AdminDashboardPage() {
  const query = useQuery({ queryKey: ['admin', 'summary'], queryFn: adminSummary, refetchInterval: 30000 });

  if (query.isLoading) return <LoadingSpinner label="Loading admin overview…" />;
  if (query.isError) return <ErrorState title="Unable to load admin overview" onRetry={() => query.refetch()} />;

  const { counts, today } = query.data;
  const totalUsers = (counts?.doctors || 0) + (counts?.staff || 0) + (counts?.patients || 0);

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Admin console</h1>
        <p className="page-sub">Clinic overview for {prettyDate(todayKey())}. Team members and activity at a glance.</p>
      </div>

      <div className="kpi-grid grid-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <DashboardCard label="Total users" value={totalUsers} icon={<Users size={13} />} hint="Across all roles" />
        <DashboardCard label="Doctors" value={counts?.doctors ?? 0} icon={<Stethoscope size={13} />} hint="On roster" />
        <DashboardCard label="Staff" value={counts?.staff ?? 0} icon={<UserCheck size={13} />} hint="Front desk" />
        <DashboardCard label="Patients" value={counts?.patients ?? 0} icon={<Users size={13} />} hint="Registered" />
        <DashboardCard label="Today's visits" value={today?.total ?? 0} icon={<CalendarClock size={13} />} hint={`${today?.active ?? 0} currently active`} />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 6 }}>
        <section>
          <h2 className="mb-2">Today by status</h2>
          <div className="card">
            {STATUS_ORDER.map((status) => {
              const count = today?.byStatus?.[status] ?? 0;
              return (
                <div key={status} className="flex-between" style={{ padding: '10px 2px', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex" style={{ gap: 10 }}>
                    <StatusBadge status={status} />
                    {status === 'COMPLETED' ? <CheckCircle2 size={14} style={{ color: 'var(--completed-text)' }} /> : status === 'CANCELLED' ? <XCircle size={14} style={{ color: 'var(--cancelled-text)' }} /> : <Clock size={14} className="muted" />}
                  </div>
                  <span className="num bold">{count}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2">Quick actions</h2>
          <div className="card stack" style={{ gap: 10 }}>
            <p className="muted small" style={{ lineHeight: 1.5 }}>
              From here you can manage the clinic team — add new doctors, create staff accounts, and oversee registered patients.
            </p>
            <div className="flex" style={{ flexWrap: 'wrap', gap: 10 }}>
              <a className="btn btn-primary" href="/admin/doctors" style={{ textDecoration: 'none' }}>
                <Stethoscope size={13} /> Manage doctors
              </a>
              <a className="btn btn-secondary" href="/admin/staff" style={{ textDecoration: 'none' }}>
                <UserCheck size={13} /> Manage staff
              </a>
              <a className="btn btn-secondary" href="/admin/patients" style={{ textDecoration: 'none' }}>
                <Users size={13} /> Manage patients
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}