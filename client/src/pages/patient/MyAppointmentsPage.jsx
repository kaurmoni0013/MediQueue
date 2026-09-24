import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { myAppointments, cancelAppointment } from '../../services/appointments.api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { prettyDate, to12, waitLabel } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import AppointmentDetail from '../../components/AppointmentDetail';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function MyAppointmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const qc = useQueryClient();

  const initialTab = (location.state?.tab || 'upcoming');
  const [tab, setTab] = useState(TABS.some((t) => t.key === initialTab) ? initialTab : 'upcoming');
  const [viewing, setViewing] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const [reason, setReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const query = useQuery({
    queryKey: ['patient', tab],
    queryFn: () => myAppointments(tab),
  });

  const cancelMut = useMutation({
    mutationFn: (id) => cancelAppointment(id, { reason }),
    onSuccess: () => {
      toast.success('Appointment cancelled.');
      qc.invalidateQueries({ queryKey: ['patient'] });
      setToCancel(null);
      setReason('');
      setCancelError('');
    },
    onError: (err) => setCancelError(getErrorMessage(err).message),
  });

  const canCancel = (a) => a.status === 'SCHEDULED';

  return (
    <div>
      <div className="page-header">
        <h1>My appointments</h1>
        <p className="page-sub">Track, manage and cancel your clinic visits.</p>
      </div>

      <div className="tabs mb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`btn btn-tab ${tab === t.key ? 'btn-tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className="tab-count">{query.isLoading ? '…' : (query.data || []).length}</span>
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <LoadingSpinner label="Loading appointments…" />
      ) : query.isError ? (
        <ErrorState title="Could not load appointments" onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <div className="card">
          <EmptyState
            title={`No ${tab === 'upcoming' ? 'upcoming' : tab} appointments`}
            description={tab === 'upcoming' ? 'Book a consultation to get started.' : undefined}
            action={
              tab === 'upcoming' ? (
                <Button onClick={() => navigate('/patient/book')}>Book an appointment</Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="stack">
          {query.data.map((a) => (
            <div key={a.id} className="card card-pad appointment-card">
              <div className="flex flex-between" style={{ gap: 12, flexWrap: 'wrap' }}>
                <div className="flex" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <div
                    className="doc-avatar"
                    style={{ width: 42, height: 42, fontSize: 14 }}
                  >
                    {a.doctor?.name?.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="bold">{a.doctor?.name}</div>
                    <div className="muted small">{a.doctor?.specialization}</div>
                    <div className="small mt-1">
                      {prettyDate(a.date)} · {to12(a.startTime)}
                    </div>
                    {a.reason ? <div className="tiny muted mt-1">{a.reason}</div> : null}
                  </div>
                </div>

                <div className="flex" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
                  <StatusBadge status={a.status} />
                  {['SCHEDULED', 'WAITING', 'IN_CONSULT'].includes(a.status) && a.queuePosition ? (
                    <span className="small num">
                      #{a.queuePosition} · {waitLabel(a.estimatedWait)}
                    </span>
                  ) : null}
                  <Button variant="secondary" size="sm" onClick={() => setViewing(a)}>
                    Details
                  </Button>
                  {canCancel(a) ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setToCancel(a);
                        setReason('');
                        setCancelError('');
                      }}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AppointmentDetail appointment={viewing} open={!!viewing} onClose={() => setViewing(null)} />

      <ConfirmDialog
        open={!!toCancel}
        title="Cancel this appointment?"
        confirmLabel="Yes, cancel"
        tone="danger"
        onClose={() => setToCancel(null)}
        onConfirm={() => cancelMut.mutate(toCancel.id)}
        busy={cancelMut.isPending}
      >
        {toCancel ? (
          <>
            <p className="small mb-3">
              {toCancel.doctor?.name}, {prettyDate(toCancel.date)} at {to12(toCancel.startTime)}.
            </p>
            <label className="small bold" htmlFor="cancel-reason">
              Reason for cancellation
            </label>
            <input
              id="cancel-reason"
              className="input mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Better now, no longer needed"
            />
            {cancelError ? (
              <div className="hl-box mt-3" style={{ borderLeftColor: 'var(--danger)' }}>
                {cancelError}
              </div>
            ) : null}
          </>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}