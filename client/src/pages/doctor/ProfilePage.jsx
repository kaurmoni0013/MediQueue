import { useQuery } from '@tanstack/react-query';
import { CreditCard, GraduationCap, BriefcaseMedical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listDoctors } from '../../services/doctors.api';
import { to12 } from '../../utils/format';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['doctors'], queryFn: listDoctors });

  if (query.isLoading) return <LoadingSpinner label="Loading your profile…" />;
  if (query.isError) return <ErrorState title="Unable to load your profile" onRetry={() => query.refetch()} />;

  const me = query.data.find((d) => d.id === user.id);
  if (!me) return <ErrorState title="Profile not found" />;

  return (
    <div>
      <div className="page-header">
        <h1>My profile</h1>
        <p className="page-sub">Your practice details as listed in the clinic directory.</p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <section>
          <div className="card card-pad">
            <div className="flex" style={{ gap: 16, alignItems: 'center', marginBottom: 18 }}>
              <div className="doc-avatar" style={{ width: 64, height: 64, fontSize: 22 }}>
                {me.name?.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="bold" style={{ fontSize: 17 }}>
                  {me.name}
                </div>
                <div className="muted small">
                  {me.specialization} · {me.experienceYears} yrs experience
                </div>
              </div>
            </div>

            <div className="detail-row">
              <dt>
                <GraduationCap size={14} /> Qualification
              </dt>
              <dd>{me.qualification || '—'}</dd>
            </div>
            <div className="detail-row">
              <dt>
                <BriefcaseMedical size={14} /> Session length
              </dt>
              <dd>{me.consultationDuration} min</dd>
            </div>
            <div className="detail-row">
              <dt>
                <CreditCard size={14} /> Consultation fee
              </dt>
              <dd>{me.fees ? `₹${me.fees}` : '—'}</dd>
            </div>
            {me.bio ? <p className="small mt-3 note-pre">{me.bio}</p> : null}
          </div>
        </section>

        <section>
          <h2 className="mb-2">Weekly availability</h2>
          <div className="card card-pad">
            {me.availability.map((a) => (
              <div key={a.day} className="detail-row">
                <dt>{DAYS[a.day]}</dt>
                <dd>{a.ranges.map((r) => `${to12(r.start)} – ${to12(r.end)}`).join(' · ')}</dd>
              </div>
            ))}
          </div>
          <p className="tiny muted mt-2">Slots are generated within these sessions. Booked times are excluded automatically.</p>
        </section>
      </div>
    </div>
  );
}