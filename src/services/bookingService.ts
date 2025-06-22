import { apiClient } from '../config/api';
import { Booking } from '../types';

export interface CreateBookingRequest {
  spaceId: string;
  startTime: string;
  endTime: string;
  vehicleNumber?: string;
}

export const bookingService = {
  async getBookings(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ bookings: Booking[] }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/bookings${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return apiClient.get<{ bookings: Booking[] }>(endpoint);
  },

  async getBookingById(id: string): Promise<{ booking: Booking }> {
    return apiClient.get<{ booking: Booking }>(`/bookings/${id}`);
  },

  async createBooking(bookingData: CreateBookingRequest): Promise<{ booking: Booking }> {
    return apiClient.post<{ booking: Booking }>('/bookings', bookingData);
  },

  async updateBooking(
    id: string, 
    updates: { status?: string; vehicleNumber?: string }
  ): Promise<{ booking: Booking }> {
    return apiClient.put<{ booking: Booking }>(`/bookings/${id}`, updates);
  },

  async cancelBooking(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/bookings/${id}`);
  },

  async getAllBookings(params?: {
    status?: string;
    spaceId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ bookings: Booking[] }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/bookings/admin/all${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return apiClient.get<{ bookings: Booking[] }>(endpoint);
  }
};