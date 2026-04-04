import axios from 'axios';

/**
 * API client - baseURL /api is proxied to http://localhost:8000 by Vite
 */
const api = axios.create({
  baseURL: 'http://localhost:8001/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hd_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth API ──────────────────────────────────────────────────────────────────
export const registerUser = async (data) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Chat API
export const sendChatMessage = async (message, history = [], sessionId = null) => {
  const body = { message, history };
  if (sessionId) body.session_id = sessionId;
  const response = await api.post('/chat', body);
  return response.data;
};

export const getChatHistory = async (sessionId) => {
  const response = await api.get(`/chat/history/${sessionId}`);
  return response.data;
};

// Tickets API (chat assistant)
export const createTicket = async (ticketData) => {
  const response = await api.post('/tickets', ticketData);
  return response.data;
};

// Helpdesk Portal dedicated endpoint
export const createHelpdeskTicket = async (ticketData) => {
  const response = await api.post('/helpdesk/ticket', ticketData);
  return response.data;
};

// Quick Incident — one-click minimal ticket
export const createQuickTicket = async (data) => {
  const response = await api.post('/helpdesk/quick-ticket', data);
  return response.data;
};

// My tickets - search by email + type
export const getMyTickets = async (email, ticket_type = null) => {
  const params = { email };
  if (ticket_type) params.ticket_type = ticket_type;
  const response = await api.get('/my-tickets', { params });
  return response.data;
};

// Track a ticket by ID
export const trackTicket = async (ticketId) => {
  const response = await api.get(`/tickets/track/${ticketId}`);
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

export const updateTicketStatus = async (ticketId, status, resolution = null) => {
  const body = { status };
  if (resolution) body.resolution = resolution;
  const response = await api.patch(`/tickets/${ticketId}/status`, body);
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
