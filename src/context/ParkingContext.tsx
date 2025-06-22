import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ParkingSpace, Booking, Notification } from '../types';

interface ParkingState {
  spaces: ParkingSpace[];
  bookings: Booking[];
  notifications: Notification[];
  loading: boolean;
}

interface ParkingContextType extends ParkingState {
  bookSpace: (spaceId: string, startTime: Date, endTime: Date, vehicleNumber?: string) => Promise<string>;
  updateSpaceStatus: (spaceId: string, status: ParkingSpace['status']) => void;
  getAvailableSpaces: () => ParkingSpace[];
  getUserBookings: (userId: string) => Booking[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (notificationId: string) => void;
}

const ParkingContext = createContext<ParkingContextType | undefined>(undefined);

type ParkingAction = 
  | { type: 'SET_SPACES'; payload: ParkingSpace[] }
  | { type: 'UPDATE_SPACE'; payload: { id: string; updates: Partial<ParkingSpace> } }
  | { type: 'ADD_BOOKING'; payload: Booking }
  | { type: 'UPDATE_BOOKING'; payload: { id: string; updates: Partial<Booking> } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_NOTIFICATION'; payload: { id: string; updates: Partial<Notification> } }
  | { type: 'SET_LOADING'; payload: boolean };

const parkingReducer = (state: ParkingState, action: ParkingAction): ParkingState => {
  switch (action.type) {
    case 'SET_SPACES':
      return { ...state, spaces: action.payload };
    case 'UPDATE_SPACE':
      return {
        ...state,
        spaces: state.spaces.map(space =>
          space.id === action.payload.id
            ? { ...space, ...action.payload.updates }
            : space
        )
      };
    case 'ADD_BOOKING':
      return { ...state, bookings: [...state.bookings, action.payload] };
    case 'UPDATE_BOOKING':
      return {
        ...state,
        bookings: state.bookings.map(booking =>
          booking.id === action.payload.id
            ? { ...booking, ...action.payload.updates }
            : booking
        )
      };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'UPDATE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.id
            ? { ...notification, ...action.payload.updates }
            : notification
        )
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

// Mock parking spaces
const mockSpaces: ParkingSpace[] = [
  // Floor 1, Section A
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `A1${i + 1}`,
    number: `A1-${String(i + 1).padStart(2, '0')}`,
    floor: 1,
    section: 'A',
    type: i < 2 ? 'disabled' : i < 6 ? 'compact' : i < 8 ? 'electric' : 'regular',
    status: Math.random() > 0.3 ? 'available' : 'occupied',
    hourlyRate: i < 2 ? 5 : i < 6 ? 8 : i < 8 ? 12 : 10,
    position: { x: (i % 10) * 80 + 20, y: Math.floor(i / 10) * 100 + 50 }
  } as ParkingSpace)),
  // Floor 1, Section B
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `B1${i + 1}`,
    number: `B1-${String(i + 1).padStart(2, '0')}`,
    floor: 1,
    section: 'B',
    type: i < 2 ? 'disabled' : i < 6 ? 'compact' : i < 8 ? 'electric' : 'regular',
    status: Math.random() > 0.3 ? 'available' : 'occupied',
    hourlyRate: i < 2 ? 5 : i < 6 ? 8 : i < 8 ? 12 : 10,
    position: { x: (i % 10) * 80 + 20, y: Math.floor(i / 10) * 100 + 200 }
  } as ParkingSpace)),
  // Floor 2, Section A
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `A2${i + 1}`,
    number: `A2-${String(i + 1).padStart(2, '0')}`,
    floor: 2,
    section: 'A',
    type: i < 2 ? 'disabled' : i < 6 ? 'compact' : i < 8 ? 'electric' : 'regular',
    status: Math.random() > 0.4 ? 'available' : 'occupied',
    hourlyRate: i < 2 ? 5 : i < 6 ? 8 : i < 8 ? 12 : 10,
    position: { x: (i % 10) * 80 + 20, y: Math.floor(i / 10) * 100 + 50 }
  } as ParkingSpace))
];

export const ParkingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(parkingReducer, {
    spaces: mockSpaces,
    bookings: [],
    notifications: [],
    loading: false
  });

  const bookSpace = async (spaceId: string, startTime: Date, endTime: Date, vehicleNumber?: string): Promise<string> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const space = state.spaces.find(s => s.id === spaceId);
    if (!space) throw new Error('Space not found');
    
    const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
    const totalAmount = hours * space.hourlyRate;
    
    const booking: Booking = {
      id: Date.now().toString(),
      userId: 'current-user', // Would come from auth context
      spaceId,
      startTime,
      endTime,
      totalAmount,
      status: 'pending',
      paymentStatus: 'pending',
      vehicleNumber,
      qrCode: `QR-${Date.now()}`
    };
    
    dispatch({ type: 'ADD_BOOKING', payload: booking });
    dispatch({ type: 'UPDATE_SPACE', payload: { id: spaceId, updates: { status: 'reserved' } } });
    dispatch({ type: 'SET_LOADING', payload: false });
    
    return booking.id;
  };

  const updateSpaceStatus = (spaceId: string, status: ParkingSpace['status']) => {
    dispatch({ type: 'UPDATE_SPACE', payload: { id: spaceId, updates: { status } } });
  };

  const getAvailableSpaces = () => {
    return state.spaces.filter(space => space.status === 'available');
  };

  const getUserBookings = (userId: string) => {
    return state.bookings.filter(booking => booking.userId === userId);
  };

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString()
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
  };

  const markNotificationRead = (notificationId: string) => {
    dispatch({ 
      type: 'UPDATE_NOTIFICATION', 
      payload: { id: notificationId, updates: { read: true } } 
    });
  };

  return (
    <ParkingContext.Provider value={{
      ...state,
      bookSpace,
      updateSpaceStatus,
      getAvailableSpaces,
      getUserBookings,
      addNotification,
      markNotificationRead
    }}>
      {children}
    </ParkingContext.Provider>
  );
};

export const useParking = () => {
  const context = useContext(ParkingContext);
  if (!context) {
    throw new Error('useParking must be used within a ParkingProvider');
  }
  return context;
};