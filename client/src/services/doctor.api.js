import api from './api';

export const doctorDashboard = () => api.get('/doctor/appointments/today').then((r) => r.data);
export const doctorQueue = () => api.get('/doctor/queue').then((r) => r.data);
export const doctorAppointments = (params) => api.get('/doctor/appointments', { params }).then((r) => r.data.appointments);
export const doctorPatients = (search) =>
  api.get('/doctor/patients', { params: search ? { search } : {} }).then((r) => r.data.patients);
export const doctorPatientHistory = (id) => api.get(`/doctor/patients/${id}/history`).then((r) => r.data);