import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listDoctors } from '../../services/doctors.api';
import DoctorCard from '../../components/DoctorCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';

export default function StaffDoctorsPage() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ['doctors'], queryFn: listDoctors });

  if (query.isLoading) return <LoadingSpinner label="Loading doctors…" />;
  if (query.isError) return <ErrorState title="Unable to load doctors" onRetry={() => query.refetch()} />;

  return (
    <div>
      <div className="page-header">
        <h1>Doctors</h1>
        <p className="page-sub">Clinic roster with practice details.</p>
      </div>
      <div className="doc-grid">
        {query.data.map((doctor) => (
          <DoctorCard
            key={doctor.id}
            doctor={doctor}
            onBook={(d) => navigate(`/staff/queue`)}
            bookLabel="Manage in queue"
          />
        ))}
      </div>
    </div>
  );
}