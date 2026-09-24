import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Power } from 'lucide-react';
import { adminListPatients, adminSetPatientActive } from '../../services/admin.api';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { initials, fromNow, prettyDate } from '../../utils/format';

export default function AdminPatientsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['admin', 'patients', debounced, page],
    queryFn: () => adminListPatients({ search: debounced, page, limit: 20 }),
    keepPreviousData: true,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'patients'] });

  const activeMut = useMutation({
    mutationFn: ({ id, isActive }) => adminSetPatientActive(id, isActive),
    onSuccess: (r) => {
      toast.success(`${r.name} ${r.isActive ? 'reactivated' : 'deactivated'}.`);
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err).message),
  });

  const runSearch = () => {
    setDebounced(search.trim());
    setPage(1);
  };

  if (query.isLoading) return <LoadingSpinner label="Loading patients…" />;
  if (query.isError) return <ErrorState title="Unable to load patients" onRetry={() => query.refetch()} />;

  const { patients, pagination } = query.data;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Manage patients</h1>
        <p className="page-sub">Registered patient accounts. Search by name, email or phone.</p>
      </div>

      <form
        className="flex"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
      >
        <div className="field" style={{ margin: 0, flex: 1 }}>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patients…" />
        </div>
        <Button onClick={runSearch}>
          <Search size={14} /> Search
        </Button>
      </form>

      {patients.length === 0 ? (
        <div className="card">
          <EmptyState title="No patients found" description={debounced ? 'Try a different search term.' : 'Patients appear here as they register.'} />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>DOB</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex" style={{ gap: 10 }}>
                        <div className="doc-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                          {initials(p.name)}
                        </div>
                        <span className="t-primary" style={{ alignSelf: 'center' }}>
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="t-stack">
                        <span className="t-primary">{p.email}</span>
                        <span className="t-sub">{p.phone || '—'}</span>
                      </div>
                    </td>
                    <td className="muted">{p.dateOfBirth ? prettyDate(p.dateOfBirth.replaceAll('/', '-')) : '—'}</td>
                    <td className="muted tiny">{fromNow(p.createdAt) || '—'}</td>
                    <td>{p.isActive ? <StatusBadge status="SCHEDULED" label="Active" /> : <StatusBadge status="CANCELLED" label="Deactivated" />}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        variant={p.isActive ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => activeMut.mutate({ id: p.id, isActive: !p.isActive })}
                        disabled={activeMut.isPending}
                      >
                        <Power size={12} /> {p.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination && pagination.pages > 1 ? (
        <div className="flex" style={{ gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" disabled={!pagination.page || pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="muted small" style={{ alignSelf: 'center' }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}