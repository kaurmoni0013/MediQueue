import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { staffAppointments } from '../../services/staff.api';
import { setStatus, cancelAppointment } from '../../services/appointments.api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { to12, prettyDate } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import AppointmentDetail from '../../components/AppointmentDetail';
import RescheduleDialog from '../../components/RescheduleDialog';

const STATUS_OPTIONS = ['', 'SCHEDULED', 'WAITING', 'IN_CONSULT', 'COMPLETED', 'CANCELLED'];
const PAGE_SIZE = 25;

export default function StaffAppointmentsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatusF] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);
  const [toCancel, setToCancel] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [status, date, debounced]);

  const query = useQuery({
    queryKey: ['staff', 'appointments', { status, date, debounced, page }],
    queryFn: () => staffAppointments({ status: status || undefined, date: date || undefined, search: debounced || undefined, page, limit: PAGE_SIZE }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['staff', 'appointments'] });
  };

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

  const data = query.data;

  return (
    <div>
      <div className="page-header">
        <h1>All appointments</h1>
        <p className="page-sub">Filter across the clinic's full appointment history.</p>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="form-row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="small bold">Status</label>
              <select className="select" value={status} onChange={(e) => setStatusF(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === '' ? 'All statuses' : s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="small bold">Date</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <label className="small bold">Search patient</label>
              <div className="search-box">
                <Search size={14} />
                <input
                  className="input"
                  placeholder="Name or appointment ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <LoadingSpinner label="Loading appointments…" />
      ) : query.isError ? (
        <ErrorState title="Could not load appointments" onRetry={() => query.refetch()} />
      ) : data.appointments.length === 0 ? (
        <div className="card">
          <EmptyState title="No appointments match" description="Try adjusting the filters above." />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="num nowrap">{prettyDate(a.date)}</td>
                    <td className="num nowrap">{to12(a.startTime)}</td>
                    <td>
                      <div className="t-stack">
                        <span className="t-primary">{a.patient?.name}</span>
                        <span className="t-sub">{a.patient?.phone || ''}</span>
                      </div>
                    </td>
                    <td className="t-primary">{a.doctor?.name}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex-end" style={{ gap: 6 }}>
                        {a.status === 'SCHEDULED' ? (
                          <Button variant="primary" size="sm" onClick={() => checkIn.mutate(a.id)} disabled={checkIn.isPending}>
                            Check in
                          </Button>
                        ) : null}
                        {['SCHEDULED', 'WAITING'].includes(a.status) ? (
                          <>
                            <Button variant="secondary" size="sm" onClick={() => setRescheduling(a)}>
                              Reschedule
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => setToCancel(a)}>
                              Cancel
                            </Button>
                          </>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => setViewing(a)}>
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.total > PAGE_SIZE ? (
            <div className="flex-between card-body" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="small muted">
                Page {data.page} of {Math.max(1, Math.ceil(data.total / data.limit))} · {data.total} appointments
              </span>
              <div className="flex">
                <Button variant="secondary" size="sm" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ‹ Prev
                </Button>
                <Button variant="secondary" size="sm" disabled={data.page * data.limit >= data.total} onClick={() => setPage((p) => p + 1)}>
                  Next ›
                </Button>
              </div>
            </div>
          ) : null}
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