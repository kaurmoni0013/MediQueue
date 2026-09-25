import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { listDoctors, getAvailability } from '../../services/doctors.api';
import { bookAppointment } from '../../services/appointments.api';
import { getErrorMessage } from '../../services/api';
import { to12, todayKey, dateKeyOffset, prettyDate, waitLabel } from '../../utils/format';
import TimeSlotPicker from '../../components/TimeSlotPicker';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const STEPS = [
  { id: 1, label: 'Doctor' },
  { id: 2, label: 'Date' },
  { id: 3, label: 'Time' },
  { id: 4, label: 'Confirm' },
];

export default function BookAppointmentPage() {
  const [params] = useSearchParams();
  const presetDoctor = params.get('doctor');
  const toast = useToast();

  const [doctorId, setDoctorId] = useState(presetDoctor || '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [reason, setReason] = useState('');
  const [step, setStep] = useState(presetDoctor ? 2 : 1);
  const [booking, setBooking] = useState(false);
  const [done, setDone] = useState(null);
  const [conflict, setConflict] = useState('');

  const doctorsQuery = useQuery({ queryKey: ['doctors'], queryFn: listDoctors });

  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => dateKeyOffset(i)), []);
  const availableDates = useMemo(() => {
    const byId = new Map(doctorsQuery.data?.map((d) => [d.id, d]) || []);
    const doc = byId.get(doctorId);
    if (!doc) return [];
    const set = new Set(doc.availableDays || []);
    return dates.filter((k) => {
      const [y, m, d] = k.split('-').map(Number);
      return set.has(new Date(y, m - 1, d).getDay());
    });
  }, [dates, doctorId, doctorsQuery.data]);

  const availQuery = useQuery({
    queryKey: ['availability', doctorId, date],
    queryFn: () => getAvailability(doctorId, date),
    enabled: !!doctorId && !!date,
  });

  const selectedDoctor = doctorsQuery.data?.find((d) => d.id === doctorId);
  const slots = availQuery.data?.slots || [];
  const availableCount = slots.filter((s) => s.available).length;

  const pickDoctor = (id) => {
    setDoctorId(id);
    setDate('');
    setStartTime('');
    setConflict('');
    setStep(2);
  };

  const pickDate = (d) => {
    setDate(d);
    setStartTime('');
    setConflict('');
    setStep(3);
  };

  const confirm = async () => {
    setBooking(true);
    setConflict('');
    try {
      const appt = await bookAppointment({ doctorId, date, startTime, reason });
      setDone(appt);
      toast.success('Appointment booked successfully.');
    } catch (err) {
      const { message, code } = getErrorMessage(err);
      if (code === 'SLOT_CONFLICT') {
        setConflict(message);
        toast.error(`${message} The slot list has been refreshed — please pick another time.`);
        await availQuery.refetch();
        setStartTime('');
      } else {
        toast.error(message || 'Unable to book the appointment.');
      }
    } finally {
      setBooking(false);
    }
  };

  const reset = () => {
    setDone(null);
    setDoctorId('');
    setDate('');
    setStartTime('');
    setReason('');
    setConflict('');
    setStep(1);
    window.history.replaceState(null, '', '/patient/book');
  };

  if (done) {
    return (
      <div className="card card-pad" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="state" style={{ padding: 16 }}>
          <div className="state-icon" style={{ background: 'var(--completed-bg)', color: 'var(--completed-text)' }}>
            <CheckCircle2 size={26} />
          </div>
          <div className="state-title">Appointment booked</div>
          <div className="state-desc">
            {done.doctor?.name} · {prettyDate(done.date)} at {to12(done.startTime)}. A confirmation is saved to your appointments.
          </div>
          {done.queuePosition ? (
            <div className="small mt-2">
              Queue position <span className="bold">#{done.queuePosition}</span> · estimated wait{' '}
              <span className="bold">{waitLabel(done.estimatedWait)}</span>
            </div>
          ) : null}
          <div className="state-action flex">
            <Button onClick={reset}>Book another</Button>
            <a className="btn btn-secondary" href="/patient/appointments">
              View my appointments
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Book an appointment</h1>
        <p className="page-sub">Pick a doctor, date and an available time. Availability is confirmed by the clinic system at booking.</p>
      </div>

      {/* Stepper */}
      <div className="flex stepper mb-3" style={{ gap: 0 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} className="wizard-step" style={{ flex: '0 0 auto' }}>
            <span className="n">{s.id}</span>
            {s.label}
            {i < STEPS.length - 1 ? <span className="wizard-line" /> : null}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">1 · Select a doctor</span>
          </div>
          <div className="card-body">
            {doctorsQuery.isLoading ? (
              <LoadingSpinner />
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {doctorsQuery.data?.map((d) => (
                  <button
                    key={d.id}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'space-between', textAlign: 'left', padding: 12 }}
                    onClick={() => pickDoctor(d.id)}
                  >
                    <span>
                      <span className="bold">{d.name}</span>
                      <span className="muted"> · {d.specialization}</span>
                    </span>
                    <span className="small muted">{d.consultationDuration} min</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && selectedDoctor && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">2 · Select a date</span>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              ← Change doctor
            </Button>
          </div>
          <div className="card-body">
            <div className="small muted mb-2">
              {selectedDoctor.name} — available days below are shown for the next two weeks.
            </div>
            {availableDates.length === 0 ? (
              <EmptyState title="No available dates" description="This doctor has no sessions in the next two weeks." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                {availableDates.map((d) => (
                  <button
                    key={d}
                    className="btn btn-secondary"
                    style={{ flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}
                    onClick={() => pickDate(d)}
                  >
                    <span className="bold">{d === todayKey() ? 'Today' : prettyDate(d).replace(/, \d{4}$/, '')}</span>
                    <span className="tiny muted">{prettyDate(d).match(/\d{4}$/)?.[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (availQuery.isLoading ? <LoadingSpinner label="Checking availability…" /> : null)}

      {step === 3 && availQuery.isSuccess && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">3 · Select a time</span>
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
              ← Change date
            </Button>
          </div>
          <div className="card-body">
            <div className="small muted mb-3">
              {selectedDoctor.name} on {prettyDate(date)} · {availQuery.data.durationMinutes}-minute slots ·{' '}
              {availableCount > 0 ? `${availableCount} slots available` : 'no slots available'}
            </div>
            {slots.length === 0 ? (
              <EmptyState title="Doctor not available on this date" description="Please choose another date." />
            ) : availableCount === 0 ? (
              <EmptyState title="No available slots on this date" description="All slots are booked. Pick a different date." />
            ) : (
              <TimeSlotPicker slots={slots} value={startTime} onChange={setStartTime} />
            )}
            {conflict ? (
              <div className="hl-box mt-3" style={{ borderLeftColor: 'var(--danger)' }}>
                <div className="bold small" style={{ color: 'var(--danger)' }}>
                  That slot was just taken
                </div>
                {conflict} Please select another time.
              </div>
            ) : null}
            <div className="flex-end mt-3">
              <Button variant="secondary" onClick={() => availQuery.refetch()}>
                <RefreshCw size={13} /> Refresh slots
              </Button>
              <Button variant="primary" disabled={!startTime} onClick={() => setStep(4)}>
                Continue <Clock size={13} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">4 · Confirm appointment</span>
            <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
              ← Change time
            </Button>
          </div>
          <div className="card-body">
            <div className="detail-row">
              <dt>Doctor</dt>
              <dd>
                {selectedDoctor.name} · {selectedDoctor.specialization}
              </dd>
            </div>
            <div className="detail-row">
              <dt>Date</dt>
              <dd>
                {prettyDate(date)} · {to12(startTime)} ({selectedDoctor.consultationDuration} min)
              </dd>
            </div>
            <div className="detail-row">
              <dt>Fee</dt>
              <dd>{selectedDoctor.fees ? `₹${selectedDoctor.fees}` : '—'}</dd>
            </div>
            <div className="field mt-3">
              <label htmlFor="reason">Reason for visit (optional)</label>
              <textarea
                id="reason"
                className="textarea"
                placeholder="e.g. Fever and cough for 3 days"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="hl-box">
              By confirming, the clinic system will reserve this time slot for you. A confirmed slot cannot be double-booked by other patients.
            </div>
            <div className="flex-end mt-3">
              <Button variant="secondary" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button onClick={confirm} disabled={booking} loading={booking}>
                {booking ? 'Booking…' : 'Book appointment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}