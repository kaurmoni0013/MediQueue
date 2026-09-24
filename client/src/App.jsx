import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import { RequireAuth, RequireRole } from './components/guards';
import HomeRedirect from './pages/HomeRedirect';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';

import PatientDashboardPage from './pages/patient/DashboardPage';
import DoctorsPage from './pages/patient/DoctorsPage';
import BookAppointmentPage from './pages/patient/BookAppointmentPage';
import MyAppointmentsPage from './pages/patient/MyAppointmentsPage';
import PatientProfilePage from './pages/patient/ProfilePage';

import StaffDashboardPage from './pages/staff/DashboardPage';
import StaffQueuePage from './pages/staff/QueuePage';
import StaffAppointmentsPage from './pages/staff/AppointmentsPage';
import StaffDoctorsPage from './pages/staff/DoctorsPage';
import StaffPatientsPage from './pages/staff/PatientsPage';
import StaffReportsPage from './pages/staff/ReportsPage';

import DoctorDashboardPage from './pages/doctor/DashboardPage';
import DoctorQueuePage from './pages/doctor/QueuePage';
import DoctorAppointmentsPage from './pages/doctor/AppointmentsPage';
import DoctorHistoryPage from './pages/doctor/HistoryPage';
import DoctorProfilePage from './pages/doctor/ProfilePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />

      <Route element={<RequireAuth />}>
        {/* Patient area */}
        <Route element={<RequireRole roles={['PATIENT']} />}>
          <Route path="/patient" element={<AppLayout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={<PatientDashboardPage />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="book" element={<BookAppointmentPage />} />
            <Route path="appointments" element={<MyAppointmentsPage />} />
            <Route path="profile" element={<PatientProfilePage />} />
          </Route>
        </Route>

        {/* Staff area */}
        <Route element={<RequireRole roles={['STAFF']} />}>
          <Route path="/staff" element={<AppLayout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={<StaffDashboardPage />} />
            <Route path="queue" element={<StaffQueuePage />} />
            <Route path="appointments" element={<StaffAppointmentsPage />} />
            <Route path="doctors" element={<StaffDoctorsPage />} />
            <Route path="patients" element={<StaffPatientsPage />} />
            <Route path="reports" element={<StaffReportsPage />} />
          </Route>
        </Route>

        {/* Doctor area */}
        <Route element={<RequireRole roles={['DOCTOR']} />}>
          <Route path="/doctor" element={<AppLayout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={<DoctorDashboardPage />} />
            <Route path="queue" element={<DoctorQueuePage />} />
            <Route path="appointments" element={<DoctorAppointmentsPage />} />
            <Route path="history" element={<DoctorHistoryPage />} />
            <Route path="profile" element={<DoctorProfilePage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}