import { apiClient } from '../config/api';
import { Notification } from '../types';

export const notificationService = {
  async getNotifications(params?: {
    read?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ notifications: Notification[] }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/notifications${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return apiClient.get<{ notifications: Notification[] }>(endpoint);
  },

  async markAsRead(id: string): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/notifications/read-all');
  },

  async deleteNotification(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/notifications/${id}`);
  }
};