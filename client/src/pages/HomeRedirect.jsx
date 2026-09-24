import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const home = user.role === 'STAFF' ? '/staff/dashboard' : user.role === 'DOCTOR' ? '/doctor/dashboard' : '/patient/dashboard';
  return <Navigate to={home} replace />;
}