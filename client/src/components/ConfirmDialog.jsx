import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', variant = 'danger', onConfirm, onClose, loading }) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  const requiresReason = !!message?.reason;
  const valid = !requiresReason || value.trim().length >= 3;

  const handleConfirm = () => {
    if (requiresReason) {
      if (!valid) {
        setTouched(true);
        return;
      }
      onConfirm(value.trim());
    } else {
      onConfirm();
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep appointment
          </Button>
          <Button variant={variant === 'danger' ? 'danger-solid' : 'primary'} onClick={handleConfirm} loading={loading} disabled={requiresReason && touched && !valid}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="muted" style={{ fontSize: 13.5 }}>
        {message?.body || message}
      </p>
      {requiresReason ? (
        <div className="field mt-3">
          <label htmlFor="cancel-reason">Cancellation reason</label>
          <textarea
            id="cancel-reason"
            className="textarea"
            placeholder="e.g. Schedule conflict, doctor unavailable"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setTouched(true);
            }}
          />
          {touched && !valid ? <div className="field-error">Please provide a reason (at least 3 characters).</div> : null}
          <div className="field-hint">Required. This is recorded on the appointment for the audit trail.</div>
        </div>
      ) : null}
    </Modal>
  );
}