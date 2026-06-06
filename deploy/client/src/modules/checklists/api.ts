import { API_BASE_URL } from '../../config/runtime';

// API_BASE_URL already includes /api — checklist routes are mounted under it.
export const API = API_BASE_URL;

const token = () => localStorage.getItem('token');

export const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token()}`,
});
