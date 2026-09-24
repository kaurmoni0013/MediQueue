import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  CalendarPlus,
  CalendarClock,
  User as UserIcon,
  Users,
  LogOut,
  ListChecks,
  LineChart,
  Activity,
  Plus,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/format';

const NAV = {
  PATIENT: [
    { to: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patient/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/patient/book', label: 'Book Appointment', icon: CalendarPlus },
    { to: '/patient/appointments', label: 'My Appointments', icon: CalendarClock },
    { to: '/patient/profile', label: 'Profile', icon: UserIcon },
  ],
  STAFF: [
    { to: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/staff/queue', label: "Today's Queue", icon: ListChecks },
    { to: '/staff/appointments', label: 'Appointments', icon: CalendarClock },
    { to: '/staff/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/staff/patients', label: 'Patients', icon: Users },
    { to: '/staff/reports', label: 'Reports', icon: LineChart },
  ],
  DOCTOR: [
    { to: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/doctor/queue', label: "Today's Queue", icon: ListChecks },
    { to: '/doctor/appointments', label: 'Appointments', icon: CalendarClock },
    { to: '/doctor/history', label: 'Patient History', icon: Activity },
    { to: '/doctor/profile', label: 'Profile', icon: UserIcon },
  ],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/doctors', label: 'Manage Doctors', icon: ShieldCheck },
    { to: '/admin/staff', label: 'Manage Staff', icon: Users },
    { to: '/admin/patients', label: 'Manage Patients', icon: UserPlus },
  ],
};

const ROLE_LABEL = { PATIENT: 'Patient Portal', STAFF: 'Clinic Staff', DOCTOR: 'Doctor', ADMIN: 'Admin Console' };
const ROLE_SUB = { PATIENT: 'Patient', STAFF: 'Staff', DOCTOR: 'Doctor', ADMIN: 'Administrator' };

function useHome() {
  const { user } = useAuth();
  if (user?.role === 'STAFF') return '/staff/dashboard';
  if (user?.role === 'DOCTOR') return '/doctor/dashboard';
  if (user?.role === 'ADMIN') return '/admin/dashboard';
  return '/patient/dashboard';
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const home = useHome();
  const items = user ? NAV[user.role] || [] : [];

  const roleLabel = user ? ROLE_LABEL[user.role] : '';
  const roleSub = user ? ROLE_SUB[user.role] : '';

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <Link to={home} className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="brand-mark">
            <Plus size={18} strokeWidth={3} />
          </span>
          <span>
            <div className="brand-name">MediQueue</div>
            <div className="brand-tagline">Clinic operations</div>
          </span>
        </Link>

        <nav className="nav">
          <div className="nav-section">{roleLabel}</div>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">
                <item.icon size={16} />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initials(user?.name)}</div>
            <div className="user-meta">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{roleSub}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLogout} title="Sign out" aria-label="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        {/* Mobile header + inline nav */}
        <header className="mobile-nav">
          <div className="mobile-brand">
            <Link to={home} className="brand" style={{ textDecoration: 'none', color: 'inherit', padding: 0, gap: 8 }}>
              <span className="brand-mark" style={{ width: 28, height: 28 }}>
                <Plus size={16} strokeWidth={3} />
              </span>
              <span className="brand-name">MediQueue</span>
            </Link>
          </div>
          <div className="nav-oneline">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {item.label}
              </NavLink>
            ))}
            <button className="nav-link" onClick={onLogout} style={{ width: 'auto' }}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </header>

        <div className="topbar">
          <div className="status-summary">{today}</div>
        </div>

        <main className="page"><Outlet /></main>
      </div>
    </div>
  );
}