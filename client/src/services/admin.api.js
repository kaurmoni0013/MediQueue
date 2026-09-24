import api from './api';

export const adminSummary = () => api.get('/admin/summary').then((r) => r.data);
export const adminListDoctors = () => api.get('/admin/doctors').then((r) => r.data);
export const adminGetDoctor = (id) => api.get(`/admin/doctors/${id}`).then((r) => r.data);
export const adminCreateDoctor = (payload) => api.post('/admin/doctors', payload).then((r) => r.data);
export const adminUpdateDoctor = (id, payload) => api.patch(`/admin/doctors/${id}`, payload).then((r) => r.data);
export const adminSetDoctorActive = (id, isActive) => api.patch(`/admin/doctors/${id}/active`, { isActive }).then((r) => r.data);
export const adminListStaff = () => api.get('/admin/staff').then((r) => r.data);
export const adminCreateStaff = (payload) => api.post('/admin/staff', payload).then((r) => r.data);
export const adminUpdateStaff = (id, payload) => api.patch(`/admin/staff/${id}`, payload).then((r) => r.data);
export const adminSetStaffActive = (id, isActive) => api.patch(`/admin/staff/${id}/active`, { isActive }).then((r) => r.data);
export const adminListPatients = (params) => api.get('/admin/patients', { params }).then((r) => r.data);
export const adminSetPatientActive = (id, isActive) => api.patch(`/admin/patients/${id}/active`, { isActive }).then((r) => r.data);