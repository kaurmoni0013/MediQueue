import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stethoscope, ArrowRight, Play, CheckCircle2, Hourglass } from 'lucide-react';
import { doctorDashboard } from '../../services/doctor.api';
import { startConsultation, completeConsultation } from '../../services/appointments.api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { to12, waitLabel } from '../../utils/format';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import AppointmentDetail from '../../components/AppointmentDetail';
import ConsultDialog from '../../components/ConsultDialog';

export default function DoctorDashboardPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [viewing, setViewing] = useState(null);
  const [completing, setCompleting] = useState(null);

  const query = useQuery({
    queryKey: ['doctor', 'today'],
    queryFn: doctorDashboard,
    refetchInterval: 15000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['doctor'] });

  const startMut = useMutation({
    mutationFn: (id) => startConsultation(id),
    onSuccess: (a) => {
      toast.success(`Consultation started for ${a.patient?.name}.`);
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err).message),
  });

  const data = query.data;

  if (query.isLoading) return <LoadingSpinner label="Loading your day…" />;
  if (query.isError) return <ErrorState title="Unable to load today's schedule" onRetry={() => query.refetch()} />;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Today's schedule</h1>
        <p className="page-sub">{data.date} · {data.appointments.length} appointments</p>
      </div>

      <div className="kpi-grid">
        <DashboardCard label="Waiting" value={data.summary.waiting} icon={<Hourglass size={13} />} />
        <DashboardCard label="In consult" value={data.summary.inConsult} icon={<Stethoscope size={13} />} />
        <DashboardCard label="Completed" value={data.summary.completed} icon={<CheckCircle2 size={13} />} hint="So far today" />
      </div>

      {/* Current patient */}
      <section>
        <h2 className="mb-2">{data.nowServing ? 'Current patient' : 'Up next'}</h2>
        {(data.nowServing || data.nextUp) ? (
          <div className="card" style={{ borderColor: data.nowServing ? 'var(--primary)' : undefined }}>
            <div className="card-body flex-between" style={{ flexWrap: 'wrap' }}>
              <div className="flex" style={{ gap: 14 }}>
                <div className="doc-avatar" style={{ width: 48, height: 48, fontSize: 16 }}>
                  {(data.nowServing || data.nextUp).patient?.name?.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="bold" style={{ fontSize: 16 }}>
                    {(data.nowServing || data.nextUp).patient?.name}
                  </div>
                  <div className="muted small">
                    {to12((data.nowServing || data.nextUp).startTime)} · #{data.nowServing?.queuePosition || data.nextUp?.queuePosition}
                    {data.nowServing ? '' : ` · est. {waitLabel(data.nextUp.estimatedWait)}`}
                  </div>
                  {data.nowServing ? null : (
                    <div className="tiny muted">After the current consultation finishes.</div>
                  )}
                </div>
              </div>
              <div className="flex" style={{ gap: 8 }}>
                {data.nowServing ? (
                  <Button variant="primary" onClick={() => setCompleting(data.nowServing)}>
                    Complete consultation <ArrowRight size={14} />
                  </Button>
                ) : data.nextUp?.status === 'WAITING' ? (
                  <Button variant="primary" onClick={() => startMut.mutate(data.nextUp.id)} disabled={startMut.isPending}>
                    <Play size={14} /> Start consultation
                  </Button>
                ) : (
                  <span className="muted small">Awaiting check-in</span>
                )}
                <Button variant="secondary" onClick={() => setViewing(data.nowServing || data.nextUp)}>
                  View
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <EmptyState title="No active appointments" description="Your queue is clear right now." />
          </div>
        )}
      </section>

      {/* Today list */}
      <section>
        <h2 className="mb-2">All appointments today</h2>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="num nowrap">{to12(a.startTime)}</td>
                    <td className="t-primary">{a.patient?.name}</td>
                    <td className="t-sub">{a.patient?.phone || a.patient?.email || '—'}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex-end" style={{ gap: 6 }}>
                        {a.status === 'WAITING' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={startMut.isLoading}
                            onClick={() => startMut.mutate(a.id)}
                          >
                            <Play size={12} /> Start
                          </Button>
                        ) : null}
                        {a.status === 'IN_CONSULT' ? (
                          <Button variant="primary" size="sm" onClick={() => setCompleting(a)}>
                            Complete
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => setViewing(a)}>
                          Detail
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AppointmentDetail appointment={viewing} open={!!viewing} onClose={() => setViewing(null)} />
      <ConsultDialog appointment={completing} open={!!completing} onClose={() => setCompleting(null)} onDone={invalidate} />
    </div>
  );
}