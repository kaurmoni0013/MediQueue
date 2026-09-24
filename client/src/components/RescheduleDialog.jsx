import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from './Modal';
import TimeSlotPicker from './TimeSlotPicker';
import Button from './Button';
import { getAvailability } from '../services/doctors.api';
import { rescheduleAppointment } from '../services/appointments.api';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../services/api';
import { prettyDate, dateKeyOffset, todayKey, to12 } from '../utils/format';
import EmptyState from './EmptyState';

/** Staff: pick a new date + slot for an existing appointment. */
export default function RescheduleDialog({ appointment, open, onClose, onDone }) {
  const toast = useToast();
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => dateKeyOffset(i)), []);

  const availQuery = useQuery({
    queryKey: ['availability', appointment?.doctor?.id, date],
    queryFn: () => getAvailability(appointment.doctor.id, date),
    enabled: open && !!appointment && !!date,
  });

  const reset = () => {
    setDate('');
    setStartTime('');
    setError('');
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await rescheduleAppointment(appointment.id, date, startTime);
      toast.success('Appointment rescheduled.');
      reset();
      onDone?.();
    } catch (err) {
      const { message, code } = getErrorMessage(err);
      if (code === 'SLOT_CONFLICT') {
        setError(`${message} Please pick another time.`);
        await availQuery.refetch();
        setStartTime('');
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const slots = availQuery.data?.slots || [];
  const availableCount = slots.filter((s) => s.available).length;

  return (
    <Modal open={open} title="Reschedule appointment" onClose={close}>
      {appointment ? (
        <>
          <p className="small muted mb-3">
            {appointment.patient?.name} · {appointment.doctor?.name} · currently {prettyDate(appointment.date)} at{' '}
            {to12(appointment.startTime)}
          </p>

          <label className="small bold">New date</label>
          <div className="mt-1 mb-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6 }}>
            {dates.map((d) => (
              <button
                key={d}
                className={`btn btn-secondary btn-sm ${date === d ? 'btn-active' : ''}`}
                onClick={() => {
                  setDate(d);
                  setStartTime('');
                  setError('');
                }}
              >
                {prettyDate(d)}
              </button>
            ))}
          </div>

          {date ? (
            availQuery.isLoading ? (
              <div className="tiny muted">Checking availability…</div>
            ) : availQuery.isError ? (
              <ErrorState small title="Could not load availability" onRetry={() => availQuery.refetch()} />
            ) : availableCount === 0 ? (
              <EmptyState small title="No slots available" description="Choose another date." />
            ) : (
              <>
                <label className="small bold">Available slot</label>
                <div className="mt-1">
                  <TimeSlotPicker slots={slots} value={startTime} onChange={setStartTime} />
                </div>
              </>
            )
          ) : null}

          {error ? (
            <div className="hl-box mt-3" style={{ borderLeftColor: 'var(--danger)' }}>
              {error}
            </div>
          ) : null}

          <div className="flex-end mt-3">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!date || !startTime || busy} onClick={submit} loading={busy}>
              Confirm new slot
            </Button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}