import axios from 'axios';

const api = axios.create({
  // Point to your backend API server on port 5000:
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// Attach the JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Give every caller a consistent, human-readable message to fall back on.
// Previously, any request that never got a response at all (backend down,
// wrong VITE_API_URL, CORS block, DNS/connection failure) left
// `err.response` undefined, so `err.response?.data?.message` was undefined
// too and every page fell back to its own generic "Something went wrong"
// string with zero information in it. This attaches a specific,
// diagnosis-friendly message in that case so it's obvious it's a
// connectivity problem rather than a real validation/server error.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.friendlyMessage = `Can't reach the server at ${api.defaults.baseURL}. Make sure the backend is running and VITE_API_URL is set correctly.`;
    } else {
      error.friendlyMessage = error.response.data?.message || `Server error (${error.response.status}).`;
    }
    return Promise.reject(error);
  }
);

export default api;
