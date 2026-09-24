import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      const publicPaths = ['/login', '/register'];
      if (!publicPaths.some((p) => window.location.pathname.startsWith(p))) {
        localStorage.removeItem('mq_token');
        localStorage.removeItem('mq_user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(err);
  }
);

/** Normalises API errors into a friendly message + machine code. */
export function getErrorMessage(err) {
  if (err.response && err.response.data) {
    const d = err.response.data;
    if (d.message) return { message: d.message, code: d.code };
  }
  if (!err.response) {
    return { message: 'Unable to reach the server. Check that the backend is running.', code: 'NETWORK' };
  }
  return { message: 'Request failed. Please try again.', code: 'ERROR' };
}

export default api;