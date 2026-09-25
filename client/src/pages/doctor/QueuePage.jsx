import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { doctorDashboard } from '../../services/doctor.api';
import { startConsultation } from '../../services/appointments.api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { to12, waitLabel } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import AppointmentDetail from '../../components/AppointmentDetail';
import ConsultDialog from '../../components/ConsultDialog';
import { useIsMobile } from '../../hooks/useMedia';

const ACTIVE = ['SCHEDULED', 'WAITING', 'IN_CONSULT'];

export default function DoctorQueuePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [viewing, setViewing] = useState(null);
  const [completing, setCompleting] = useState(null);

  const query = useQuery({
    queryKey: ['doctor', 'today'],
    queryFn: doctorDashboard,
    refetchInterval: 10000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['doctor'] });

  const startMut = useMutation({
    mutationFn: (id) => startConsultation(id),
    onSuccess: () => {
      toast.success('Consultation started.');
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err).message),
  });

  const active = useMemo(
    () => (query.data?.appointments || []).filter((a) => ACTIVE.includes(a.status)).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [query.data]
  );
  const nowServing = active.find((a) => a.status === 'IN_CONSULT');
  const waiting = active.filter((a) => a.status === 'WAITING');
  const scheduled = active.filter((a) => a.status === 'SCHEDULED');

  if (query.isLoading) return <LoadingSpinner label="Loading the queue…" />;
  if (query.isError) return <ErrorState title="Unable to load the queue" onRetry={() => query.refetch()} />;

  return (
    <div>
      <div className="page-header">
        <h1>My queue</h1>
        <p className="page-sub">Active patients for today. Live queue position and wait time.</p>
      </div>

      {active.length === 0 ? (
        <div className="card">
          <EmptyState title="Your queue is empty" description="No active appointments right now." />
        </div>
      ) : (
        <div className="stack">
          {nowServing ? <QueueRows title="In consultation" rows={[nowServing]} onStart={startMut} onView={setViewing} onComplete={setCompleting} highlight /> : null}
          {waiting.length ? <QueueRows title={`Waiting (${waiting.length})`} rows={waiting} onStart={startMut} onView={setViewing} onComplete={setCompleting} /> : null}
          {scheduled.length ? <QueueRows title={`Not yet arrived (${scheduled.length})`} rows={scheduled} onStart={startMut} onView={setViewing} onComplete={setCompleting} /> : null}
        </div>
      )}

      <AppointmentDetail appointment={viewing} open={!!viewing} onClose={() => setViewing(null)} />
      <ConsultDialog appointment={completing} open={!!completing} onClose={() => setCompleting(null)} onDone={invalidate} />
    </div>
  );
}

function QueueRows({ title, rows, onStart, onView, onComplete, highlight }) {
  const isMobile = useIsMobile();

  return (
    <section>
      <h2 className="mb-2">{title}</h2>
      {isMobile ? (
        <div className="m-list">
          {rows.map((a) => (
            <div key={a.id} className={`card card-pad m-card ${highlight ? 'm-card-hl' : ''}`}>
              <div className="m-card-top">
                <span className="m-pos">{a.queuePosition ? `#${a.queuePosition}` : '—'}</span>
                <span className="m-card-when num">{to12(a.startTime)}</span>
                <StatusBadge status={a.status} />
              </div>
              <div className="m-card-name">{a.patient?.name}</div>
              {a.reason ? <div className="m-card-sub">{a.reason}</div> : null}
              <div className="m-card-sub">{a.patient?.phone || ''}</div>
              <div className="m-card-sub">
                Est. wait · <span className="num">{waitLabel(a.estimatedWait)}</span>
              </div>
              <div className="m-card-actions">
                {a.status === 'WAITING' ? (
                  <Button variant="primary" size="sm" disabled={onStart.isPending} onClick={() => onStart.mutate(a.id)}>
                    <Play size={12} /> Start
                  </Button>
                ) : null}
                {a.status === 'IN_CONSULT' ? (
                  <Button variant="primary" size="sm" onClick={() => onComplete(a)}>
                    Complete
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => onView(a)}>
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', borderColor: highlight ? 'var(--primary)' : undefined }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Time</th>
                <th>Patient</th>
                <th>Contact</th>
                <th>Est. wait</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="num bold">{a.queuePosition ? `#${a.queuePosition}` : '—'}</td>
                  <td className="num nowrap">{to12(a.startTime)}</td>
                  <td className="t-primary">
                    {a.patient?.name}
                    <span className="t-sub"> · {a.reason || ''}</span>
                  </td>
                  <td className="t-sub">{a.patient?.phone || ''}</td>
                  <td className="num">{waitLabel(a.estimatedWait)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex-end" style={{ gap: 6 }}>
                      {a.status === 'WAITING' ? (
                        <Button variant="primary" size="sm" disabled={onStart.isPending} onClick={() => onStart.mutate(a.id)}>
                          <Play size={12} /> Start
                        </Button>
                      ) : null}
                      {a.status === 'IN_CONSULT' ? (
                        <Button variant="primary" size="sm" onClick={() => onComplete(a)}>
                          Complete
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => onView(a)}>
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
  );
}