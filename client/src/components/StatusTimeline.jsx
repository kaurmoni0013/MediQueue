import { Check } from 'lucide-react';
import { STATUS_ORDER, STATUS_LABELS } from '../utils/format';

/** Appointment workflow timeline: Scheduled → Waiting → In Consult → Completed. */
export default function StatusTimeline({ status }) {
  const currentIndex = STATUS_ORDER.indexOf(status);
  return (
    <div className="timeline">
      {STATUS_ORDER.map((step, i) => {
        const done = i < currentIndex || status === 'COMPLETED';
        const current = i === currentIndex;
        return (
          <div key={step} className={`tl-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
            <div className="tl-node">
              {done && step !== 'CANCELLED' ? <Check size={14} /> : i + 1}
            </div>
            <span className="tl-label">{STATUS_LABELS[step]}</span>
          </div>
        );
      })}
    </div>
  );
}