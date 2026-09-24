import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { staffToday } from '../../services/staff.api';
import { setStatus, cancelAppointment } from '../../services/appointments.api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { to12, waitLabel } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import AppointmentDetail from '../../components/AppointmentDetail';
import RescheduleDialog from '../../components/RescheduleDialog';

const ACTIVE = ['SCHEDULED', 'WAITING', 'IN_CONSULT'];

export default function StaffQueuePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [doctorId, setDoctorId] = useState('all');
  const [viewing, setViewing] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);
  const [toCancel, setToCancel] = useState(null);

  const query = useQuery({
    queryKey: ['staff', 'today'],
    queryFn: staffToday,
    refetchInterval: 10000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['staff'] });

  const checkIn = useMutation({
    mutationFn: (id) => setStatus(id, 'WAITING'),
    onSuccess: () => {
      toast.success('Patient checked in.');
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

  const doctors = useMemo(
    () => [...new Map((query.data?.appointments || []).map((a) => [a.doctor?.id, a.doctor])).values()].filter(Boolean),
    [query.data]
  );

  const active = useMemo(
    () =>
      (query.data?.appointments || [])
        .filter((a) => ACTIVE.includes(a.status) && (doctorId === 'all' || a.doctor?.id === doctorId))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [query.data, doctorId]
  );

  const nowServing = active.find((a) => a.status === 'IN_CONSULT');
  const waiting = active.filter((a) => a.status === 'WAITING');
  const scheduled = active.filter((a) => a.status === 'SCHEDULED');

  if (query.isLoading) return <LoadingSpinner label="Loading the queue…" />;
  if (query.isError) return <ErrorState title="Unable to load the queue" onRetry={() => query.refetch()} />;

  return (
    <div>
      <div className="page-header">
        <h1>Live queue</h1>
        <p className="page-sub">Who is waiting, who is next, and how long patients expect to wait.</p>
      </div>

      <div className="flex mb-3" style={{ flexWrap: 'wrap' }}>
        <button className={`btn btn-secondary btn-sm ${doctorId === 'all' ? 'btn-active' : ''}`} onClick={() => setDoctorId('all')}>
          All doctors
        </button>
        {doctors.map((d) => (
          <button key={d.id} className={`btn btn-secondary btn-sm ${doctorId === d.id ? 'btn-active' : ''}`} onClick={() => setDoctorId(d.id)}>
            {d.name}
          </button>
        ))}
      </div>

      {active.length === 0 ? (
        <div className="card">
          <EmptyState title="The queue is empty" description="No active appointments for this selection right now." />
        </div>
      ) : (
        <div className="stack">
          {nowServing ? <QueueGroup title="In consultation" rows={[nowServing]} onView={setViewing} checkIn={checkIn} setRescheduling={setRescheduling} setToCancel={setToCancel} highlight /> : null}
          {waiting.length ? <QueueGroup title={`Waiting (${waiting.length})`} rows={waiting} onView={setViewing} checkIn={checkIn} setRescheduling={setRescheduling} setToCancel={setToCancel} /> : null}
          {scheduled.length ? <QueueGroup title={`Not yet arrived (${scheduled.length})`} rows={scheduled} onView={setViewing} checkIn={checkIn} setRescheduling={setRescheduling} setToCancel={setToCancel} /> : null}
        </div>
      )}

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

function QueueGroup({ title, rows, onView, checkIn, setRescheduling, setToCancel, highlight }) {
  return (
    <section>
      <h2 className="mb-2">{title}</h2>
      <div className="card" style={{ overflow: 'hidden', borderColor: highlight ? 'var(--primary)' : undefined }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Time</th>
                <th>Patient</th>
                <th>Status</th>
                <th>Est. wait</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="num bold">{a.queuePosition ? `#${a.queuePosition}` : '—'}</td>
                  <td className="num nowrap">{to12(a.startTime)}</td>
                  <td>
                    <div className="t-stack">
                      <span className="t-primary">{a.patient?.name}</span>
                      <span className="t-sub">{a.patient?.phone || ''}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="num">{waitLabel(a.estimatedWait)}</td>
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
                            Change
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setToCancel(a)}>
                            Cancel
                          </Button>
                        </>
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
    </section>
  );
}