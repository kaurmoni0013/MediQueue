import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, Users, Stethoscope, CheckCircle2, Play } from 'lucide-react';
import { staffToday } from '../../services/staff.api';
import { setStatus, cancelAppointment } from '../../services/appointments.api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { to12, waitLabel } from '../../utils/format';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import AppointmentDetail from '../../components/AppointmentDetail';
import RescheduleDialog from '../../components/RescheduleDialog';
import { useAuth } from '../../context/AuthContext';

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const [doctorFilter, setDoctorFilter] = useState('all');
  const [viewing, setViewing] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);
  const [toCancel, setToCancel] = useState(null);

  const query = useQuery({
    queryKey: ['staff', 'today'],
    queryFn: staffToday,
    refetchInterval: 15000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['staff'] });

  const checkIn = useMutation({
    mutationFn: (id) => setStatus(id, 'WAITING'),
    onSuccess: (a) => {
      toast.success(`${a.patient?.name} checked in.`);
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err).message),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }) => cancelAppointment(id, { reason }),
    onSuccess: () => {
      toast.success('Appointment cancelled.');
      invalidate();
      setToCancel(null);
    },
    onError: (err) => toast.error(getErrorMessage(err).message),
  });

  const data = query.data;
  const doctors = useMemo(
    () => [...new Map((data?.appointments || []).map((a) => [a.doctor?.id, a.doctor])).values()].filter(Boolean),
    [data]
  );
  const rows = useMemo(
    () => (doctorFilter === 'all' ? data?.appointments || [] : (data?.appointments || []).filter((a) => a.doctor?.id === doctorFilter)),
    [data, doctorFilter]
  );

  if (query.isLoading) return <LoadingSpinner label="Loading today's schedule…" />;
  if (query.isError) return <ErrorState title="Unable to load today's schedule" onRetry={() => query.refetch()} />;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Front desk · {data?.date}</h1>
        <p className="page-sub">Live view of today's appointments. Queue data refreshes automatically.</p>
      </div>

      <div className="kpi-grid">
        <DashboardCard label="Total today" value={data?.summary?.total || 0} icon={<Users size={13} />} hint="Scheduled + active" />
        <DashboardCard label="Waiting" value={data?.summary?.waiting || 0} icon={<UserCheck size={13} />} />
        <DashboardCard label="In consult" value={data?.summary?.inConsult || 0} icon={<Stethoscope size={13} />} />
        <DashboardCard label="Completed" value={data?.summary?.completed || 0} icon={<CheckCircle2 size={13} />} />
      </div>

      {/* Now serving */}
      <section>
        <h2 className="mb-2">Now in consultation</h2>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {doctors.length === 0 ? (
            <div className="card">
              <EmptyState title="No doctors scheduled today" />
            </div>
          ) : (
            doctors.map((doc) => {
              const serving = data?.nowServing?.[doc.id];
              return (
                <div key={doc.id} className="card card-pad">
                  <div className="flex" style={{ gap: 10 }}>
                    <div className="doc-avatar" style={{ width: 38, height: 38, fontSize: 13 }}>
                      {doc.name?.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="bold">{doc.name}</div>
                      <div className="muted tiny">{doc.specialization}</div>
                    </div>
                  </div>
                  <div className="mt-2" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {serving ? (
                      <>
                        <div className="flex-between">
                          <span className="bold">{serving.patient?.name}</span>
                          <StatusBadge status="IN_CONSULT" />
                        </div>
                        <div className="tiny muted">Since {serving.consultStartedAt ? to12(serving.consultStartedAt) : serving.startTime}</div>
                      </>
                    ) : (
                      <div className="tiny muted">No patient in consultation</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Today's appointments */}
      <section>
        <div className="flex-between mb-2">
          <h2>Today's appointments</h2>
          <div className="flex" style={{ flexWrap: 'wrap' }}>
            <button className={`btn btn-secondary btn-sm ${doctorFilter === 'all' ? 'btn-active' : ''}`} onClick={() => setDoctorFilter('all')}>
              All doctors
            </button>
            {doctors.map((d) => (
              <button key={d.id} className={`btn btn-secondary btn-sm ${doctorFilter === d.id ? 'btn-active' : ''}`} onClick={() => setDoctorFilter(d.id)}>
                {d.name.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState title="No appointments at this time" description="New bookings appear here automatically." />
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Status</th>
                    <th>Queue</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td className="num nowrap">{to12(a.startTime)}</td>
                      <td>
                        <div className="t-stack">
                          <span className="t-primary">{a.patient?.name}</span>
                          <span className="t-sub">{a.patient?.phone || ''}</span>
                        </div>
                      </td>
                      <td className="t-primary">{a.doctor?.name}</td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="num">
                        {['SCHEDULED', 'WAITING', 'IN_CONSULT'].includes(a.status) && a.queuePosition
                          ? `#${a.queuePosition} · ${waitLabel(a.estimatedWait)}`
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex-end" style={{ gap: 6 }}>
                          {a.status === 'SCHEDULED' ? (
                            <Button variant="primary" size="sm" onClick={() => checkIn.mutate(a.id)} disabled={checkIn.isPending}>
                              <Play size={12} /> Check in
                            </Button>
                          ) : null}
                          {['SCHEDULED', 'WAITING'].includes(a.status) ? (
                            <>
                              <Button variant="secondary" size="sm" onClick={() => setRescheduling(a)}>
                                Reschedule
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => setToCancel(a)}>
                                Cancel
                              </Button>
                            </>
                          ) : null}
                          <Button variant="ghost" size="sm" onClick={() => setViewing(a)}>
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <AppointmentDetail appointment={viewing} open={!!viewing} onClose={() => setViewing(null)} />
      <RescheduleDialog appointment={rescheduling} open={!!rescheduling} onClose={() => setRescheduling(null)} onDone={invalidate} />
      <ConfirmDialog
        open={!!toCancel}
        title={`Cancel appointment for ${toCancel?.patient?.name}?`}
        confirmLabel="Yes, cancel"
        variant="danger"
        message={{ body: `${toCancel?.doctor?.name} · ${toCancel?.date} · ${toCancel?.startTime ? to12(toCancel.startTime) : ''}`, reason: true }}
        onClose={() => setToCancel(null)}
        onConfirm={(reason) => cancelMut.mutate({ id: toCancel.id, reason })}
        loading={cancelMut.isPending}
      />
    </div>
  );
}