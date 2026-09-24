import { CalendarDays } from 'lucide-react';
import { initials } from '../utils/format';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorCard({ doctor, onBook, actionLabel = 'Book Appointment' }) {
  const todayDOW = new Date().getDay();
  const todayDay = doctor.availableDays?.includes(todayDOW);
  const nextDayAvailable = [...(doctor.availableDays || [])].sort((a, b) => (a - todayDOW + 7) % 7 - (b - todayDOW + 7) % 7)[0];

  return (
    <div className="card doc-card">
      <div className="doc-card-head">
        <div className="doc-avatar">{initials(doctor.name)}</div>
        <div className="doc-meta" style={{ flex: 1 }}>
          <div className="doc-name">{doctor.name}</div>
          <div className="doc-spec">
            {doctor.specialization} · {doctor.experienceYears} years experience
          </div>
        </div>
        {todayDay ? (
          <span className="badge badge-completed">Available today</span>
        ) : (
          <span className="badge badge-neutral">Next: {DAY_NAMES[nextDayAvailable] || '—'}</span>
        )}
      </div>
      <div className="doc-body">
        <div className="doc-row">
          <dt>Consultation duration</dt>
          <dd>{doctor.consultationDuration} min</dd>
        </div>
        <div className="doc-row">
          <dt>Consultation fee</dt>
          <dd>{doctor.fees ? `₹${doctor.fees}` : '—'}</dd>
        </div>
        <div className="doc-row">
          <dt>Working hours</dt>
          <dd>
            {doctor.availability?.[0]?.ranges?.map((r) => `${r.start}–${r.end}`).join(', ') || '—'}
          </dd>
        </div>
        <div className="doc-row">
          <dt>Available days</dt>
          <dd>{DAY_NAMES.filter((_, i) => doctor.availableDays?.includes(i)).join(', ') || '—'}</dd>
        </div>
        {doctor.bio ? <p className="tiny muted mt-2">{doctor.bio}</p> : null}
      </div>
      <div className="doc-footer">
        <button className="btn btn-primary" onClick={() => onBook(doctor)}>
          <CalendarDays size={14} />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}