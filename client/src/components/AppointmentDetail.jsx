import Modal from './Modal';
import StatusBadge from './StatusBadge';
import StatusTimeline from './StatusTimeline';
import { prettyDate, to12, waitLabel, fromNow } from '../utils/format';
import { FileText, Pill, Calendar, User as UserIcon, Hourglass } from 'lucide-react';

/* Read-only appointment detail used across all three portals. */
export default function AppointmentDetail({ appointment, open, onClose }) {
  if (!appointment) return null;
  const active = ['SCHEDULED', 'WAITING', 'IN_CONSULT'].includes(appointment.status);

  return (
    <Modal open={open} title="Appointment details" onClose={onClose}>
      <div className="flex-between mb-2">
        <StatusBadge status={appointment.status} />
        <span className="tiny muted">ID {appointment.id.slice(-6).toUpperCase()}</span>
      </div>

      {active && (
        <>
          <StatusTimeline status={appointment.status} />
          <div className="wait-note mb-2 mt-2">Queue position and wait are updated from live clinic data.</div>
        </>
      )}

      <div className="detail-row">
        <dt>
          <Calendar size={14} /> Date
        </dt>
        <dd>
          {prettyDate(appointment.date)} · {to12(appointment.startTime)}
        </dd>
      </div>
      <div className="detail-row">
        <dt>
          <UserIcon size={14} /> Doctor
        </dt>
        <dd>
          {appointment.doctor?.name} · {appointment.doctor?.specialization}
        </dd>
      </div>
      {appointment.reason ? (
        <div className="detail-row">
          <dt>Reason for visit</dt>
          <dd>{appointment.reason}</dd>
        </div>
      ) : null}
      {appointment.queuePosition ? (
        <div className="detail-row">
          <dt>
            <Hourglass size={14} /> Queue position
          </dt>
          <dd>#{appointment.queuePosition}</dd>
        </div>
      ) : null}
      {appointment.queuePosition ? (
        <div className="detail-row">
          <dt>Estimated wait</dt>
          <dd>
            {waitLabel(appointment.estimatedWait)}
            <div className="wait-note">Based on current queue and average consultation duration.</div>
          </dd>
        </div>
      ) : null}
      {appointment.checkedInAt ? (
        <div className="detail-row">
          <dt>Checked in</dt>
          <dd>{fromNow(appointment.checkedInAt)}</dd>
        </div>
      ) : null}
      {appointment.cancellationReason ? (
        <div className="detail-row">
          <dt>Cancellation reason</dt>
          <dd>{appointment.cancellationReason}</dd>
        </div>
      ) : null}

      {(appointment.notes || appointment.prescription || appointment.followUp) && appointment.status === 'COMPLETED' ? (
        <div className="mt-3">
          <div className="card card-pad" style={{ background: 'var(--surface-subtle)' }}>
            <div className="flex" style={{ gap: 8, marginBottom: 8 }}>
              <FileText size={14} className="muted" />
              <span className="bold small">Clinical notes</span>
            </div>
            <p className="small" style={{ whiteSpace: 'pre-wrap' }}>
              {appointment.notes || '—'}
            </p>
            {appointment.prescription ? (
              <>
                <div className="flex" style={{ gap: 8, margin: '12px 0 8px' }}>
                  <Pill size={14} className="muted" />
                  <span className="bold small">Prescription</span>
                </div>
                <p className="small" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font)' }}>
                  {appointment.prescription}
                </p>
              </>
            ) : null}
            {appointment.followUp ? (
              <p className="small muted mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                <span className="bold">Follow-up:</span> {appointment.followUp}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}