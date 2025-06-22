import { apiClient } from '../config/api';
import { User } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'customer' | 'staff' | 'admin';
  phone?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    apiClient.setToken(response.token);
    return response;
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData);
    apiClient.setToken(response.token);
    return response;
  },

  async refreshToken(token: string): Promise<{ token: string }> {
    return apiClient.post<{ token: string }>('/auth/refresh', { token });
  },

  logout() {
    apiClient.clearToken();
  },

  async getCurrentUser(): Promise<{ user: User }> {
    return apiClient.get<{ user: User }>('/users/profile');
  },

  async updateProfile(data: { name?: string; phone?: string }): Promise<{ user: User }> {
    return apiClient.put<{ user: User }>('/users/profile', data);
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/users/password', data);
  }
};