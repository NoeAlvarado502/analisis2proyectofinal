import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:4000/api`;
  }
  return 'http://localhost:4000/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and parse errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const base = import.meta.env.BASE_URL || '/';
        const loginPath = `${base.replace(/\/$/, '')}/login`;
        const currentPath = window.location.pathname.replace(/\/$/, '');
        if (!currentPath.endsWith('/login')) {
          window.location.href = loginPath;
        }
      }

      // Return standardized error from backend format
      const errorPayload = {
        status,
        code: data?.error?.code || 'ERROR',
        message: data?.error?.message || error.message || 'Error en la petición',
        details: data?.error?.details || null
      };
      return Promise.reject(errorPayload);
    }

    return Promise.reject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor',
      details: null
    });
  }
);

export default api;
