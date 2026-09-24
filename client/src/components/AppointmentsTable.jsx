import Button from './Button';
import StatusBadge from './StatusBadge';
import { prettyDate, to12 } from '../utils/format';
import { Eye } from 'lucide-react';

/**
 * Dense, reusable appointment table.
 * Columns: Time | Patient | Doctor | Status | Queue | Actions
 */
export default function AppointmentsTable({ appointments, onView, onManage, queueColumn = true }) {
  if (!appointments.length) return null;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Patient</th>
            <th>Doctor</th>
            <th>Status</th>
            {queueColumn ? <th>Queue</th> : null}
            <th style={{ textAlign: 'right' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a.id}>
              <td className="num nowrap">{to12(a.startTime)}</td>
              <td>
                <div className="t-stack">
                  <span className="t-primary">{a.patient?.name || '—'}</span>
                  <span className="t-sub">{a.patient?.phone || a.patient?.email || ''}</span>
                </div>
              </td>
              <td className="t-primary">{a.doctor?.name || '—'}</td>
              <td>
                <StatusBadge status={a.status} />
              </td>
              {queueColumn ? <td className="num">{a.queuePosition ? `#${a.queuePosition}` : '—'}</td> : null}
              <td style={{ textAlign: 'right' }}>
                <Button variant="secondary" size="sm" onClick={() => onView(a)}>
                  <Eye size={13} />
                  {onManage ? 'View' : 'View'}
                </Button>
                {onManage ? (
                  <Button variant="ghost" size="sm" onClick={() => onManage(a)} style={{ marginLeft: 6 }}>
                    Manage
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}