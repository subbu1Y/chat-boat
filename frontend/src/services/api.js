import axios from 'axios';

/**
 * API client - baseURL /api is proxied to http://localhost:8000 by Vite
 */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Chat API
export const sendChatMessage = async (message, history = []) => {
  const response = await api.post('/chat', { message, history });
  return response.data;
};

// Tickets API
export const createTicket = async (ticketData) => {
  const response = await api.post('/tickets', ticketData);
  return response.data;
};

export const getTickets = async (limit = 10) => {
  const response = await api.get(`/tickets?limit=${limit}`);
  return response.data;
};

export const getAllTickets = async () => {
  const response = await api.get('/tickets/all');
  return response.data;
};

// Dashboard API
export const getDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data;
};

// Config API
export const getConfig = async () => {
  const response = await api.get('/config');
  return response.data;
};

export default api;
