import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const authClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inyectar token en cada request
authClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('monetix-auth');
    if (raw) {
      try {
        const { state } = JSON.parse(raw);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch {}
    }
  }
  return config;
});

// Redirigir a /login si el token expira
authClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login?session=expired';
    }
    return Promise.reject(err);
  },
);
