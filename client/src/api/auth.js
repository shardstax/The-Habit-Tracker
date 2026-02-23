import api from './client.js';

export async function login(payload) {
  const { data } = await api.post('/auth/login', payload);
  localStorage.setItem('token', data.token);
  return data;
}

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  localStorage.setItem('token', data.token);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

export function logout() {
  localStorage.removeItem('token');
}