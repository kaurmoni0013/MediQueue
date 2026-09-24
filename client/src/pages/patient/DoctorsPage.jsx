import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listDoctors } from '../../services/doctors.api';
import DoctorCard from '../../components/DoctorCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';

export default function DoctorsPage() {
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState('all');

  const query = useQuery({ queryKey: ['doctors'], queryFn: listDoctors });

  const specialties = useMemo(
    () => [...new Set((query.data || []).map((d) => d.specialization))].sort(),
    [query.data]
  );

  const filtered = useMemo(
    () => (specialty === 'all' ? query.data || [] : (query.data || []).filter((d) => d.specialization === specialty)),
    [query.data, specialty]
  );

  const onBook = (doctor) => navigate(`/patient/book?doctor=${doctor.id}`);

  if (query.isLoading) return <LoadingSpinner label="Loading doctors…" />;
  if (query.isError) return <ErrorState title="Unable to load the doctor directory" description="Please check your connection and try again." onRetry={() => query.refetch()} />;

  return (
    <div>
      <div className="page-header">
        <h1>Our doctors</h1>
        <p className="page-sub">Browse specialists, check availability, and book a consultation.</p>
      </div>

      <div className="flex mb-3" style={{ flexWrap: 'wrap' }}>
        <button className={`btn ${specialty === 'all' ? 'btn-primary' : 'btn-secondary'}`} size="sm" onClick={() => setSpecialty('all')}>
          All specialties
        </button>
        {specialties.map((s) => (
          <button key={s} className={`btn ${specialty === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSpecialty(s)}>
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="No doctors found" description="Try a different specialty filter." />
        </div>
      ) : (
        <div className="doc-grid">
          {filtered.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} onBook={onBook} />
          ))}
        </div>
      )}
    </div>
  );
}