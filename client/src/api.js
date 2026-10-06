import axios from 'axios';

// Vite proxies /api to the Express server (see vite.config.js), so there is
// one place to change the backend address and no CORS surprises.
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || '/api' });

// Pull the server's error message out of axios errors for display.
export function errorMessage(err) {
  return err?.response?.data?.error || err?.message || 'Unknown error';
}
