import api from './api';

export const listDoctors = () => api.get('/doctors').then((r) => r.data.doctors);
export const getDoctor = (id) => api.get(`/doctors/${id}`).then((r) => r.data.doctor);
export const getAvailability = (id, date) =>
  api.get(`/doctors/${id}/availability`, { params: { date } }).then((r) => r.data);