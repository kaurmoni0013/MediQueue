import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, Stethoscope, CheckCircle2, XCircle, CalendarX } from 'lucide-react';
import { staffSummary } from '../../services/staff.api';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import { STATUS_LABELS } from '../../utils/format';

const ORDER = ['SCHEDULED', 'WAITING', 'IN_CONSULT', 'COMPLETED', 'CANCELLED'];

export default function StaffReportsPage() {
  const query = useQuery({ queryKey: ['staff', 'report'], queryFn: staffSummary });

  if (query.isLoading) return <LoadingSpinner label="Crunching today's numbers…" />;
  if (query.isError) return <ErrorState title="Unable to load the report" onRetry={() => query.refetch()} />;

  const s = query.data;
  const max = Math.max(1, ...ORDER.map((k) => s[k] || 0));

  return (
    <div>
      <div className="page-header">
        <h1>Operations report</h1>
        <p className="page-sub">Live snapshot of {s.date} for the clinic.</p>
      </div>

      <div className="kpi-grid">
        <DashboardCard label="Total appointments" value={s.total} icon={<Users size={13} />} />
        <DashboardCard label="Waiting" value={s.waiting} icon={<UserCheck size={13} />} />
        <DashboardCard label="In consult" value={s.inConsult} icon={<Stethoscope size={13} />} />
        <DashboardCard label="Completed" value={s.completed} icon={<CheckCircle2 size={13} />} />
        <DashboardCard label="Cancelled" value={s.cancelled} icon={<XCircle size={13} />} />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <section>
          <h2 className="mb-2">Status distribution</h2>
          <div className="card card-pad">
            {ORDER.map((k) => (
              <div key={k} className="mb-2">
                <div className="flex-between small mb-1">
                  <span className="flex" style={{ gap: 6 }}>
                    <StatusBadge status={k} />
                  </span>
                  <span className="num bold">{s[k]}</span>
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${(s[k] / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2">Per doctor · today</h2>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Waiting</th>
                    <th>In consult</th>
                    <th>Finished</th>
                    <th>Queue</th>
                  </tr>
                </thead>
                <tbody>
                  {s.perDoctor.map((d) => (
                    <tr key={d.doctorId}>
                      <td className="t-primary">{d.name}</td>
                      <td className="num">{d.waiting}</td>
                      <td className="num">{d.inConsult}</td>
                      <td className="num">{d.total - d.waiting - d.inConsult}</td>
                      <td className="num">#{d.queueLength}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}