import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export function RequireAuth() {
  const { user, initializing } = useAuth();
  if (initializing) return <LoadingSpinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireRole({ roles }) {
  const { user, initializing } = useAuth();
  if (initializing) return <LoadingSpinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}