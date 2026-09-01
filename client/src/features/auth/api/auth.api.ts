import { api } from '../../../services/api';
import {
  AuthResponse,
  RegisterResponse,
  MessageResponse,
  User,
} from '../types/auth.types';
import {
  RegisterFormValues,
  LoginFormValues,
  ForgotPasswordFormValues,
  ResetPasswordFormValues,
  ChangePasswordFormValues,
} from '../schemas/auth.schemas';

export const authApi = {
  register: async (data: Omit<RegisterFormValues, 'confirmPassword'>): Promise<RegisterResponse> => {
    const response = await api.post<{ success: true; data: RegisterResponse }>('/auth/register', data);
    return response.data.data;
  },

  login: async (data: LoginFormValues): Promise<AuthResponse> => {
    const response = await api.post<{ success: true; data: AuthResponse }>('/auth/login', data);
    return response.data.data;
  },

  refresh: async (): Promise<AuthResponse> => {
    const response = await api.post<{ success: true; data: AuthResponse }>('/auth/refresh');
    return response.data.data;
  },

  logout: async (): Promise<MessageResponse> => {
    const response = await api.post<{ success: true; data: MessageResponse }>('/auth/logout');
    return response.data.data;
  },

  logoutAll: async (): Promise<MessageResponse> => {
    const response = await api.post<{ success: true; data: MessageResponse }>('/auth/logout-all');
    return response.data.data;
  },

  verifyEmail: async (token: string): Promise<MessageResponse> => {
    const response = await api.post<{ success: true; data: MessageResponse }>('/auth/verify-email', { token });
    return response.data.data;
  },

  resendVerification: async (email: string): Promise<MessageResponse> => {
    const response = await api.post<{ success: true; data: MessageResponse }>('/auth/resend-verification', { email });
    return response.data.data;
  },

  forgotPassword: async (data: ForgotPasswordFormValues): Promise<MessageResponse> => {
    const response = await api.post<{ success: true; data: MessageResponse }>('/auth/forgot-password', data);
    return response.data.data;
  },

  resetPassword: async (token: string, data: ResetPasswordFormValues): Promise<MessageResponse> => {
    const response = await api.post<{ success: true; data: MessageResponse }>('/auth/reset-password', {
      token,
      newPassword: data.newPassword,
    });
    return response.data.data;
  },

  changePassword: async (data: ChangePasswordFormValues): Promise<MessageResponse> => {
    const response = await api.post<{ success: true; data: MessageResponse }>('/auth/change-password', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    return response.data.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await api.get<{ success: true; data: { user: User } }>('/auth/me');
    return response.data.data;
  },

  getPermissions: async (): Promise<{ role: string; permissions: string[] }> => {
    const response = await api.get<{ success: true; data: { role: string; permissions: string[] } }>('/auth/permissions');
    return response.data.data;
  },
};
