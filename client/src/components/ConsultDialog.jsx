import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { completeConsultation } from '../services/appointments.api';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../services/api';
import { to12 } from '../utils/format';

/** Doctor: record clinical output and finish an IN_CONSULT appointment. */
export default function ConsultDialog({ appointment, open, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ notes: '', prescription: '', followUp: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && appointment) {
      setForm({ notes: appointment.notes || '', prescription: appointment.prescription || '', followUp: appointment.followUp || '' });
      setError('');
    }
  }, [open, appointment]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await completeConsultation(appointment.id, form);
      toast.success('Consultation completed. Summary saved.');
      onClose();
      onDone?.();
    } catch (err) {
      setError(getErrorMessage(err).message);
    } finally {
      setBusy(false);
    }
  };

  const valid = form.notes.trim() || form.prescription.trim();

  return (
    <Modal open={open} title="Complete consultation" width="620px" onClose={() => !busy && onClose()}>
      {appointment ? (
        <>
          <p className="small muted mb-3">
            {appointment.patient?.name} · {to12(appointment.startTime)}
          </p>
          <div className="field">
            <label htmlFor="c-notes">Clinical notes</label>
            <textarea
              id="c-notes"
              className="textarea"
              placeholder="Symptoms, findings, diagnosis…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="c-rx">Prescription</label>
            <textarea
              id="c-rx"
              className="textarea"
              placeholder="Medicine · dosage · schedule"
              value={form.prescription}
              onChange={(e) => setForm((f) => ({ ...f, prescription: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="c-fu">Follow-up (optional)</label>
            <input
              id="c-fu"
              className="input"
              placeholder="e.g. Review in 2 weeks"
              value={form.followUp}
              onChange={(e) => setForm((f) => ({ ...f, followUp: e.target.value }))}
            />
          </div>
          {error ? (
            <div className="hl-box" style={{ borderLeftColor: 'var(--danger)', margin: '10px 0' }}>
              {error}
            </div>
          ) : null}
          <div className="flex-end mt-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} disabled={!valid} onClick={submit}>
              Save & complete
            </Button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}