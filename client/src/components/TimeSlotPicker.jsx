import { to12 } from '../utils/format';

/** Grid of time slots. Unavailable slots are disabled by the backend result. */
export default function TimeSlotPicker({ slots, value, onChange }) {
  return (
    <div className="slot-grid">
      {slots.map((slot) => (
        <button
          key={slot.start}
          type="button"
          className={`slot ${value === slot.start ? 'selected' : ''}`}
          disabled={!slot.available}
          onClick={() => onChange(slot.start)}
        >
          {to12(slot.start)}
        </button>
      ))}
    </div>
  );
}