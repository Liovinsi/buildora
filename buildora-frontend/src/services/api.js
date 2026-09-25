import axios from 'axios';

const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const api = axios.create({
  baseURL: `${base}/api`,
  timeout: 20000,
});

// Unwrap { success, data } and turn every failure into an Error with a readable message.
api.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  (err) => {
    let message = err.response?.data?.error;
    if (!message) {
      if (err.code === 'ECONNABORTED') message = 'The server took too long to respond. Please try again.';
      else if (!err.response) message = 'Cannot reach the Buildora server. Is the backend running?';
      else if ([502, 503, 504].includes(err.response.status)) {
        // Non-JSON gateway error: in dev this is the Vite proxy failing to reach the backend.
        message = `Cannot reach the Buildora backend (HTTP ${err.response.status} ${err.config?.method?.toUpperCase()} ${err.config?.baseURL}${err.config?.url}). Check that the backend is running and connected to MongoDB.`;
      } else message = `Request failed (${err.response.status})`;
    }
    const error = new Error(message);
    error.status = err.response?.status;
    error.details = err.response?.data?.details;
    return Promise.reject(error);
  }
);
