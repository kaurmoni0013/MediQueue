import api from './api';

export const bookAppointment = (payload) => api.post('/appointments', payload).then((r) => r.data.appointment);
export const myAppointments = (tab) => api.get('/appointments/my', { params: { tab } }).then((r) => r.data.appointments);
export const getAppointment = (id) => api.get(`/appointments/${id}`).then((r) => r.data.appointment);
export const getAppointmentHistory = (id) => api.get(`/appointments/${id}/history`).then((r) => r.data.history);
export const setStatus = (id, newStatus) => api.patch(`/appointments/${id}/status`, { newStatus }).then((r) => r.data.appointment);
export const cancelAppointment = (id, reason) =>
  api.patch(`/appointments/${id}/cancel`, { reason }).then((r) => r.data.appointment);
export const rescheduleAppointment = (id, date, startTime) =>
  api.patch(`/appointments/${id}/reschedule`, { date, startTime }).then((r) => r.data.appointment);
export const startConsultation = (id) => api.patch(`/appointments/${id}/start-consultation`).then((r) => r.data.appointment);
export const completeConsultation = (id, payload) =>
  api.patch(`/appointments/${id}/complete-consultation`, payload).then((r) => r.data.appointment);