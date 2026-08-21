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

export default api;