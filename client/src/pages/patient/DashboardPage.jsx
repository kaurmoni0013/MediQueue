import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, CheckCircle2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { myAppointments, getAppointment } from '../../services/appointments.api';
import { prettyDateTime, to12, waitLabel, prettyDate, initials } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import DashboardCard from '../../components/DashboardCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import AppointmentDetail from '../../components/AppointmentDetail';
import Button from '../../components/Button';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [viewing, setViewing] = useState(null);

  const upcoming = useQuery({
    queryKey: ['patient', 'upcoming'],
    queryFn: () => myAppointments('upcoming'),
    refetchInterval: 30000,
  });

  const completed = useQuery({
    queryKey: ['patient', 'completed'],
    queryFn: () => myAppointments('completed'),
  });

  const next = useMemo(
    () =>
      upcoming.data
        ?.slice()
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0] || null,
    [upcoming.data]
  );

  // Live status polling for the next appointment (queue position + wait).
  const live = useQuery({
    queryKey: ['patient', 'live', next?.id],
    queryFn: () => getAppointment(next.id),
    enabled: !!next,
    refetchInterval: 12000,
  });
  const liveAppt = live.data || next;

  if (upcoming.isLoading) return <LoadingSpinner label="Loading your appointments…" />;
  if (upcoming.isError) return <ErrorState title="Unable to load your dashboard" description="We could not reach the appointment service. Please try again." onRetry={() => upcoming.refetch()} />;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="page-sub">Here is an overview of your care at MediQueue Clinic.</p>
      </div>

      <div className="kpi-grid">
        <DashboardCard label="Upcoming" value={upcoming.data?.length || 0} icon={<CalendarClock size={13} />} />
        <DashboardCard label="Completed" value={completed.data?.length || 0} icon={<CheckCircle2 size={13} />} />
        <DashboardCard label="Doctor" value={liveAppt?.doctor ? liveAppt.doctor.name.split(' ')[1] : '—'} icon={<UserIcon size={13} />} hint={liveAppt?.doctor?.specialization || ''} />
      </div>

      {/* Next appointment */}
      {next ? (
        <section>
          <h2 className="mb-2">Next appointment</h2>
          <div className="card">
            <div className="card-body" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: '1 1 260px' }}>
                <div className="doc-avatar" style={{ width: 52, height: 52, fontSize: 18 }}>
                  {initials(liveAppt.doctor?.name)}
                </div>
                <div>
                  <div className="bold" style={{ fontSize: 16 }}>
                    {liveAppt.doctor?.name}
                  </div>
                  <div className="muted small">{liveAppt.doctor?.specialization}</div>
                  <div className="mt-2">
                    <StatusBadge status={liveAppt.status} />
                  </div>
                </div>
              </div>

              <div className="small" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20, flex: '0 0 auto' }}>
                <div className="muted tiny bold" style={{ textTransform: 'uppercase', letterSpacing: 0.04 }}>
                  When
                </div>
                <div className="t-primary" style={{ fontSize: 15 }}>
                  {prettyDateTime(liveAppt.date, liveAppt.startTime)}
                </div>
                <div className="muted small mt-2">Duration {liveAppt.doctor?.durationMinutes || 15} minutes</div>
              </div>

              {['SCHEDULED', 'WAITING', 'IN_CONSULT'].includes(liveAppt.status) && (
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20, flex: '0 0 auto' }}>
                  <div className="muted tiny bold" style={{ textTransform: 'uppercase', letterSpacing: 0.04, marginBottom: 6 }}>
                    Queue
                  </div>
                  <div className="t-primary" style={{ fontSize: 15 }}>
                    #{liveAppt.queuePosition ?? '—'} &nbsp;·&nbsp; wait {waitLabel(liveAppt.estimatedWait)}
                  </div>
                  <div className="wait-note mt-2">Updated live. Based on current queue and average consultation duration.</div>
                </div>
              )}

              <div className="flex-end" style={{ alignItems: 'flex-end', flexDirection: 'column', justifyContent: 'center', marginLeft: 'auto' }}>
                <Button variant="primary" onClick={() => setViewing(liveAppt)}>
                  View appointment <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="card">
          <EmptyState
            title="No upcoming appointments"
            description="Book a consultation with one of our doctors to get started."
            action={
              <Link to="/patient/book" className="btn btn-primary">
                Book an appointment
              </Link>
            }
          />
        </div>
      )}

      <section>
        <div className="flex-between mb-2">
          <h2>Upcoming appointments</h2>
          <Link to="/patient/appointments" className="small">
            View all
          </Link>
        </div>
        {upcoming.data && upcoming.data.length > 0 ? (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Doctor</th>
                    <th>Status</th>
                    <th>Queue</th>
                    <th>Wait</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {upcoming.data.map((a) => (
                    <tr key={a.id}>
                      <td className="num nowrap">
                        {to12(a.startTime)} · {prettyDate(a.date)}
                      </td>
                      <td className="t-primary">{a.doctor?.name}</td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="num">{a.queuePosition ? `#${a.queuePosition}` : '—'}</td>
                      <td className="num">{waitLabel(a.estimatedWait)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Button variant="ghost" size="sm" onClick={() => setViewing(a)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-2">Recent completed consultations</h2>
        {completed.data && completed.data.length > 0 ? (
          <div className="grid-2">
            {completed.data.slice(0, 3).map((a) => (
              <div key={a.id} className="card card-pad">
                <div className="flex-between">
                  <div className="bold">{a.doctor?.name}</div>
                  <StatusBadge status="COMPLETED" />
                </div>
                <div className="muted small mb-2">{prettyDate(a.date)} · {to12(a.startTime)}</div>
                {a.prescription ? (
                  <p className="tiny muted" style={{ whiteSpace: 'pre-wrap' }}>
                    <span className="bold">Rx:</span> {a.prescription.length > 120 ? `${a.prescription.slice(0, 120)}…` : a.prescription}
                  </p>
                ) : (
                  <p className="tiny muted">No prescription recorded.</p>
                )}
                <div className="mt-2">
                  <Button variant="secondary" size="sm" onClick={() => setViewing(a)}>
                    View summary
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState title="No completed consultations yet" description="Visit summaries and prescriptions will appear here." />
          </div>
        )}
      </section>

      <AppointmentDetail appointment={viewing} open={!!viewing} onClose={() => setViewing(null)} />
    </div>
  );
}