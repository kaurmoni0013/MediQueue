import api from './api';

export const staffToday = () => api.get('/staff/appointments/today').then((r) => r.data);
export const staffQueue = (doctorId) =>
  api.get('/staff/queue', { params: doctorId ? { doctorId } : {} }).then((r) => r.data);
export const staffAppointments = (params) => api.get('/staff/appointments', { params }).then((r) => r.data);
export const staffPatients = (params) => api.get('/staff/patients', { params }).then((r) => r.data);
export const staffPatientHistory = (id) => api.get(`/staff/patients/${id}/history`).then((r) => r.data);
export const staffSummary = () => api.get('/staff/summary').then((r) => r.data);