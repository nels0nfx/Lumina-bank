import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lumina_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem('lumina_token');
      localStorage.removeItem('lumina_user');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const fmtUSD = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v || 0));

export const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const maskAccount = (n) => (n ? `•••• ${String(n).slice(-4)}` : '');
