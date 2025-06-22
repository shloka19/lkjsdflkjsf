import { apiClient } from '../config/api';
import { ParkingSpace } from '../types';

export interface SpaceFilters {
  floor?: number;
  section?: string;
  type?: string;
  status?: string;
  available?: boolean;
}

export const parkingService = {
  async getSpaces(filters?: SpaceFilters): Promise<{ spaces: ParkingSpace[] }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/spaces${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<{ spaces: ParkingSpace[] }>(endpoint);
  },

  async getSpaceById(id: string): Promise<{ space: ParkingSpace }> {
    return apiClient.get<{ space: ParkingSpace }>(`/spaces/${id}`);
  },

  async createSpace(spaceData: {
    number: string;
    floor: number;
    section: string;
    type: 'regular' | 'compact' | 'disabled' | 'electric';
    hourlyRate: number;
    position: { x: number; y: number };
  }): Promise<{ space: ParkingSpace }> {
    return apiClient.post<{ space: ParkingSpace }>('/spaces', spaceData);
  },

  async updateSpace(id: string, updates: Partial<ParkingSpace>): Promise<{ space: ParkingSpace }> {
    return apiClient.put<{ space: ParkingSpace }>(`/spaces/${id}`, updates);
  },

  async deleteSpace(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/spaces/${id}`);
  },

  async getSpaceAvailability(
    id: string, 
    startDate: string, 
    endDate: string
  ): Promise<{ spaceId: string; bookings: any[] }> {
    return apiClient.get<{ spaceId: string; bookings: any[] }>(
      `/spaces/${id}/availability?startDate=${startDate}&endDate=${endDate}`
    );
  }
};