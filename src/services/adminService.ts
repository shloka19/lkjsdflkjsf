import { apiClient } from '../config/api';

export interface AdminStats {
  spaces: {
    total: number;
    byStatus: Record<string, number>;
  };
  bookings: {
    total: number;
    recent: number;
    byStatus: Record<string, number>;
  };
  revenue: {
    total: number;
    monthly: number;
  };
  users: {
    total: number;
    byRole: Record<string, number>;
  };
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    return apiClient.get<AdminStats>('/admin/stats');
  },

  async getUsers(params?: {
    role?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: any[] }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/admin/users${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return apiClient.get<{ users: any[] }>(endpoint);
  },

  async updateUserRole(userId: string, role: string): Promise<{ user: any }> {
    return apiClient.put<{ user: any }>(`/admin/users/${userId}/role`, { role });
  },

  async getRevenueAnalytics(period: 'week' | 'month' | 'year' = 'month'): Promise<{
    period: string;
    data: Array<{ date: string; revenue: number }>;
  }> {
    return apiClient.get<{
      period: string;
      data: Array<{ date: string; revenue: number }>;
    }>(`/admin/analytics/revenue?period=${period}`);
  },

  async getOccupancyAnalytics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byFloor: Record<string, number>;
    bySection: Record<string, number>;
  }> {
    return apiClient.get<{
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      byFloor: Record<string, number>;
      bySection: Record<string, number>;
    }>('/admin/analytics/occupancy');
  },

  async getSystemHealth(): Promise<{
    status: string;
    database: string;
    alerts: Array<{ type: string; message: string }>;
    timestamp: string;
  }> {
    return apiClient.get<{
      status: string;
      database: string;
      alerts: Array<{ type: string; message: string }>;
      timestamp: string;
    }>('/admin/health');
  }
};