import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { doctorAppointments } from '../../services/doctor.api';
import { startConsultation } from '../../services/appointments.api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { to12, prettyDate } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import AppointmentDetail from '../../components/AppointmentDetail';
import ConsultDialog from '../../components/ConsultDialog';

const STATUS_OPTIONS = ['', 'SCHEDULED', 'WAITING', 'IN_CONSULT', 'COMPLETED', 'CANCELLED'];

export default function DoctorAppointmentsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatusF] = useState('');
  const [date, setDate] = useState('');
  const [viewing, setViewing] = useState(null);
  const [completing, setCompleting] = useState(null);

  const query = useQuery({
    queryKey: ['doctor', 'appointments', { status, date }],
    queryFn: () => doctorAppointments({ status: status || undefined, date: date || undefined }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['doctor', 'appointments'] });

  const startMut = useMutation({
    mutationFn: (id) => startConsultation(id),
    onSuccess: () => {
      toast.success('Consultation started.');
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err).message),
  });

  return (
    <div>
      <div className="page-header">
        <h1>My appointments</h1>
        <p className="page-sub">Your full appointment history at the clinic.</p>
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
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <LoadingSpinner label="Loading appointments…" />
      ) : query.isError ? (
        <ErrorState title="Could not load appointments" onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <div className="card">
          <EmptyState title="No appointments match" description="Try clearing the filters." />
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
                  <th>Reason</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((a) => (
                  <tr key={a.id}>
                    <td className="num nowrap">{prettyDate(a.date)}</td>
                    <td className="num nowrap">{to12(a.startTime)}</td>
                    <td className="t-primary">{a.patient?.name}</td>
                    <td className="t-sub">{a.reason || '—'}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex-end" style={{ gap: 6 }}>
                        {a.status === 'WAITING' ? (
                          <Button variant="primary" size="sm" onClick={() => startMut.mutate(a.id)} disabled={startMut.isPending}>
                            <Play size={12} /> Start
                          </Button>
                        ) : null}
                        {a.status === 'IN_CONSULT' ? (
                          <Button variant="primary" size="sm" onClick={() => setCompleting(a)}>
                            Complete
                          </Button>
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
        </div>
      )}

      <AppointmentDetail appointment={viewing} open={!!viewing} onClose={() => setViewing(null)} />
      <ConsultDialog appointment={completing} open={!!completing} onClose={() => setCompleting(null)} onDone={invalidate} />
    </div>
  );
}