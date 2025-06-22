import { apiClient } from '../config/api';
import { Payment } from '../types';

export interface ProcessPaymentRequest {
  bookingId: string;
  method: 'card' | 'paypal' | 'wallet' | 'cash';
  amount: number;
}

export const paymentService = {
  async getPayments(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ payments: Payment[] }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/payments${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return apiClient.get<{ payments: Payment[] }>(endpoint);
  },

  async getPaymentById(id: string): Promise<{ payment: Payment }> {
    return apiClient.get<{ payment: Payment }>(`/payments/${id}`);
  },

  async processPayment(paymentData: ProcessPaymentRequest): Promise<{ payment: Payment }> {
    return apiClient.post<{ payment: Payment }>('/payments', paymentData);
  },

  async refundPayment(id: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/payments/${id}/refund`);
  }
};