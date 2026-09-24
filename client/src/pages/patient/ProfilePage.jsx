import { CalendarClock, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { prettyDate } from '../../utils/format';

export default function PatientProfilePage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
        <p className="page-sub">Your account details at MediQueue Clinic.</p>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card-body">
          <div className="flex" style={{ gap: 16, alignItems: 'center', marginBottom: 18 }}>
            <div className="doc-avatar" style={{ width: 64, height: 64, fontSize: 22 }}>
              {user?.name?.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="bold" style={{ fontSize: 17 }}>
                {user?.name}
              </div>
              <div className="muted small">Patient</div>
            </div>
          </div>

          <div className="detail-row">
            <dt>
              <Mail size={14} /> Email
            </dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="detail-row">
            <dt>
              <Phone size={14} /> Phone
            </dt>
            <dd>{user?.phone || 'Not provided'}</dd>
          </div>
          <div className="detail-row">
            <dt>
              <CalendarClock size={14} /> Member since
            </dt>
            <dd>{user?.createdAt ? prettyDate(user.createdAt.slice(0, 10)) : '—'}</dd>
          </div>
        </div>
      </div>

      <p className="tiny muted mt-3" style={{ maxWidth: 520 }}>
        For security, account details can only be updated by the clinic front desk. If any information is incorrect, please
        ask the staff to update your record.
      </p>
    </div>
  );
}