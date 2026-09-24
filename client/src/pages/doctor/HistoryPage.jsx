import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Stethoscope } from 'lucide-react';
import { doctorPatients, doctorPatientHistory } from '../../services/doctor.api';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { prettyDate, to12, initials } from '../../utils/format';

export default function DoctorHistoryPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const query = useQuery({
    queryKey: ['doctor', 'patients', debounced],
    queryFn: () => doctorPatients(debounced),
  });

  const openHistory = async (p) => {
    setSelected(p);
    setHistory(null);
    setError('');
    try {
      const res = await doctorPatientHistory(p.id);
      setHistory(res);
    } catch (_) {
      setError('Unable to load the patient history.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Patient history</h1>
        <p className="page-sub">Look up patients you have treated and review past consultations.</p>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="search-box">
            <Search size={14} />
            <input className="input" placeholder="Search your patients…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <LoadingSpinner label="Loading patients…" />
      ) : query.isError ? (
        <ErrorState title="Could not load patients" onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <div className="card">
          <EmptyState title="No patients found" description={debounced ? 'Try a different name.' : 'You have not treated any patients yet.'} />
        </div>
      ) : (
        <div className="stack">
          {query.data.map((p) => (
            <div key={p.id} className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="doc-avatar" style={{ width: 40, height: 40, fontSize: 13 }}>
                {initials(p.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div className="bold">{p.name}</div>
                <div className="tiny muted">
                  {p.phone || p.email}
                  {p.gender ? ` · ${p.gender}` : ''}
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => openHistory(p)}>
                View history
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} title={selected?.name} onClose={() => setSelected(null)} width="640px">
        {error ? (
          <ErrorState title={error} onRetry={() => openHistory(selected)} />
        ) : !history ? (
          <LoadingSpinner label="Loading history…" />
        ) : (
          <>
            <p className="small muted mb-3">
              {history.appointments.length} consultation{history.appointments.length === 1 ? '' : 's'} with you at MediQueue.
            </p>
            {history.appointments.length === 0 ? (
              <EmptyState title="No past visits" />
            ) : (
              <div className="stack">
                {history.appointments.map((a) => (
                  <div key={a.id} className="card card-pad">
                    <div className="flex-between mb-2">
                      <div className="small">
                        <span className="bold num">{prettyDate(a.date)}</span> · <span className="num">{to12(a.startTime)}</span>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    {a.reason ? <div className="tiny muted mb-2">{a.reason}</div> : null}
                    {a.status === 'COMPLETED' ? (
                      <>
                        <div className="tiny bold flex" style={{ gap: 6 }}>
                          <Stethoscope size={12} className="muted" /> Notes
                        </div>
                        <p className="tiny note-pre mb-2">{a.notes || 'No notes.'}</p>
                        {a.prescription ? (
                          <>
                            <div className="tiny bold flex" style={{ gap: 6 }}>
                              <Calendar size={12} className="muted" /> Follow-up
                            </div>
                            <p className="tiny note-pre">{a.followUp || '—'}</p>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}