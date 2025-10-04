import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

// Response types for login and register
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

// Login function with typed arguments and return
export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>(`${API_URL}/login`, { username, password });
  localStorage.setItem('token', response.data.access_token);
  localStorage.setItem('user_id', response.data.user_id);
  return response.data;
}

// Register function with typed arguments and return
export async function register(
  username: string,
  password: string
): Promise<RegisterResponse> {
  const response = await axios.post<RegisterResponse>(`${API_URL}/register`, { username, password });
  return response.data;
}
