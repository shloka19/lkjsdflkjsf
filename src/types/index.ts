export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'staff';
  phone?: string;
  createdAt: Date;
}

export interface ParkingSpace {
  id: string;
  number: string;
  floor: number;
  section: string;
  type: 'regular' | 'compact' | 'disabled' | 'electric';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  hourlyRate: number;
  position: { x: number; y: number };
}

export interface Booking {
  id: string;
  userId: string;
  spaceId: string;
  startTime: Date;
  endTime: Date;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  qrCode?: string;
  vehicleNumber?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: 'card' | 'paypal' | 'wallet' | 'cash';
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'booking' | 'payment' | 'reminder' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}