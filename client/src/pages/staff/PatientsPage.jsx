import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowLeft } from 'lucide-react';
import { staffPatients, staffPatientHistory } from '../../services/staff.api';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { prettyDate, to12, initials } from '../../utils/format';

const PAGE_SIZE = 25;

export default function StaffPatientsPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [activePatient, setActivePatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debounced]);

  const query = useQuery({
    queryKey: ['staff', 'patients', { debounced, page }],
    queryFn: () => staffPatients({ search: debounced || undefined, page, limit: PAGE_SIZE }),
  });

  const openHistory = async (patient) => {
    setActivePatient(patient);
    setHistory(null);
    setHistoryError('');
    try {
      const res = await staffPatientHistory(patient.id);
      setHistory(res);
    } catch (err) {
      setHistoryError('Unable to load the patient history.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Patients</h1>
        <p className="page-sub">Registered patients and their visit history.</p>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="search-box">
            <Search size={14} />
            <input className="input" placeholder="Search by name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <LoadingSpinner label="Loading patients…" />
      ) : query.isError ? (
        <ErrorState title="Could not load patients" onRetry={() => query.refetch()} />
      ) : query.data.patients.length === 0 ? (
        <div className="card">
          <EmptyState title="No patients found" description="Try a different search term." />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {query.data.patients.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex" style={{ gap: 8 }}>
                        <div className="doc-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                          {initials(p.name)}
                        </div>
                        <div className="t-stack">
                          <span className="t-primary">{p.name}</span>
                          <span className="t-sub">{p.gender || ''}{p.dateOfBirth ? ` · ${p.dateOfBirth}` : ''}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="t-stack">
                        <span className="t-sub">{p.email}</span>
                        <span className="t-sub">{p.phone || '—'}</span>
                      </div>
                    </td>
                    <td className="num">{p.createdAt ? prettyDate(p.createdAt.slice(0, 10)) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Button variant="secondary" size="sm" onClick={() => openHistory(p)}>
                        History
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data.total > PAGE_SIZE ? (
            <div className="flex-between card-body" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="small muted">
                {query.data.total} patients · page {query.data.page}
              </span>
              <div className="flex">
                <Button variant="secondary" size="sm" disabled={query.data.page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ‹ Prev
                </Button>
                <Button variant="secondary" size="sm" disabled={query.data.page * query.data.limit >= query.data.total} onClick={() => setPage((p) => p + 1)}>
                  Next ›
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Modal open={!!activePatient} title={history ? history.patient.name : activePatient?.name} onClose={() => setActivePatient(null)} width="640px">
        {historyError ? (
          <ErrorState title={historyError} onRetry={() => openHistory(activePatient)} />
        ) : !history ? (
          <LoadingSpinner label="Loading history…" />
        ) : (
          <>
            <p className="small muted mb-3">
              {history.patient.email}{history.patient.phone ? ` · ${history.patient.phone}` : ''} · {history.appointments.length} visits at MediQueue
            </p>
            {history.appointments.length === 0 ? (
              <EmptyState title="No visits yet" />
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
                    {a.doctor ? <div className="tiny muted">Dr. {a.doctor.name}</div> : null}
                    {a.reason ? <div className="tiny muted mt-1">{a.reason}</div> : null}
                    {a.status === 'COMPLETED' ? <div className="tiny mt-1 note-pre">{a.notes || 'No notes.'}</div> : null}
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