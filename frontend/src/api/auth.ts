// src/api/auth.ts
import axios from 'axios';

// Use VITE_API_URL from .env.local (e.g., "/api")
// In production, this should be an absolute URL if your frontend/backend are on different domains
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create an axios instance with base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // unless you use cookies
});

// Optional: Add request/response interceptors here if needed

// Response types
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
}

export interface RegisterResponse {
  id: string;
  username: string;
  created_at: string;
}

// Login function
export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/login', { username, password });
  localStorage.setItem('token', response.data.access_token);
  localStorage.setItem('user_id', response.data.user_id);
  return response.data;
}

// Register function
export async function register(
  username: string,
  password: string
): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/register', { username, password });
  return response.data;
}

// 🔻 NEW: Google Login function
export interface GoogleLoginResponse {
  access_token: string;
  user_id: string;
  token_type?: string;
}

export async function googleLogin(idToken: string): Promise<GoogleLoginResponse> {
  const response = await apiClient.post<GoogleLoginResponse>('/auth/google', {
    id_token: idToken,
  });
  localStorage.setItem('token', response.data.access_token);
  localStorage.setItem('user_id', response.data.user_id);
  return response.data;
}