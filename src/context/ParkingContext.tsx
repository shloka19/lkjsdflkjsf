import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { ParkingSpace, Booking, Notification } from '../types';
import { parkingService } from '../services/parkingService';
import { bookingService } from '../services/bookingService';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

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
  refreshSpaces: () => Promise<void>;
  refreshBookings: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const ParkingContext = createContext<ParkingContextType | undefined>(undefined);

type ParkingAction = 
  | { type: 'SET_SPACES'; payload: ParkingSpace[] }
  | { type: 'UPDATE_SPACE'; payload: { id: string; updates: Partial<ParkingSpace> } }
  | { type: 'SET_BOOKINGS'; payload: Booking[] }
  | { type: 'ADD_BOOKING'; payload: Booking }
  | { type: 'UPDATE_BOOKING'; payload: { id: string; updates: Partial<Booking> } }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
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
    case 'SET_BOOKINGS':
      return { ...state, bookings: action.payload };
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
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
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

export const ParkingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [state, dispatch] = useReducer(parkingReducer, {
    spaces: [],
    bookings: [],
    notifications: [],
    loading: false
  });

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      refreshSpaces();
      refreshBookings();
      refreshNotifications();
    }
  }, [isAuthenticated]);

  const refreshSpaces = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const { spaces } = await parkingService.getSpaces();
      dispatch({ type: 'SET_SPACES', payload: spaces });
    } catch (error) {
      console.error('Failed to fetch spaces:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const refreshBookings = async () => {
    if (!isAuthenticated) return;
    
    try {
      const { bookings } = await bookingService.getBookings();
      dispatch({ type: 'SET_BOOKINGS', payload: bookings });
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const refreshNotifications = async () => {
    if (!isAuthenticated) return;
    
    try {
      const { notifications } = await notificationService.getNotifications();
      dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const bookSpace = async (spaceId: string, startTime: Date, endTime: Date, vehicleNumber?: string): Promise<string> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const { booking } = await bookingService.createBooking({
        spaceId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        vehicleNumber
      });
      
      dispatch({ type: 'ADD_BOOKING', payload: booking });
      dispatch({ type: 'UPDATE_SPACE', payload: { id: spaceId, updates: { status: 'reserved' } } });
      
      return booking.id;
    } catch (error) {
      console.error('Failed to book space:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
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

  return (
    <ParkingContext.Provider value={{
      ...state,
      bookSpace,
      updateSpaceStatus,
      getAvailableSpaces,
      getUserBookings,
      refreshSpaces,
      refreshBookings,
      refreshNotifications
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