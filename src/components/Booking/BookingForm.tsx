import React, { useState } from 'react';
import { Calendar, Clock, Car, CreditCard, QrCode } from 'lucide-react';
import { ParkingSpace } from '../../types';
import { useParking } from '../../context/ParkingContext';
import { useAuth } from '../../context/AuthContext';
import { format, addHours, differenceInHours } from 'date-fns';

interface BookingFormProps {
  space: ParkingSpace;
  onBookingComplete: (bookingId: string) => void;
  onCancel: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ space, onBookingComplete, onCancel }) => {
  const { bookSpace, loading } = useParking();
  const { user } = useAuth();
  const [bookingData, setBookingData] = useState({
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration: 1,
    vehicleNumber: '',
    paymentMethod: 'card' as 'card' | 'paypal' | 'wallet'
  });

  const startTime = new Date(bookingData.startTime);
  const endTime = addHours(startTime, bookingData.duration);
  const totalAmount = bookingData.duration * space.hourlyRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const bookingId = await bookSpace(
        space.id,
        startTime,
        endTime,
        bookingData.vehicleNumber || undefined
      );
      onBookingComplete(bookingId);
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setBookingData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Book Parking Space</h2>
          <p className="text-sm text-gray-600 mt-1">
            Space {space.number} - {space.type} parking
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Space Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-900">Space {space.number}</span>
              <span className="text-sm text-gray-600">Floor {space.floor}, Section {space.section}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 capitalize">{space.type} parking</span>
              <span className="font-semibold text-blue-600">${space.hourlyRate}/hour</span>
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Start Time
            </label>
            <input
              type="datetime-local"
              name="startTime"
              value={bookingData.startTime}
              onChange={handleChange}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              Duration (hours)
            </label>
            <select
              name="duration"
              value={bookingData.duration}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                <option key={hour} value={hour}>
                  {hour} hour{hour > 1 ? 's' : ''}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-600 mt-1">
              End time: {format(endTime, 'MMM dd, yyyy HH:mm')}
            </p>
          </div>

          {/* Vehicle Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Car className="h-4 w-4 inline mr-2" />
              Vehicle Number (Optional)
            </label>
            <input
              type="text"
              name="vehicleNumber"
              value={bookingData.vehicleNumber}
              onChange={handleChange}
              placeholder="e.g., ABC-1234"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="h-4 w-4 inline mr-2" />
              Payment Method
            </label>
            <select
              name="paymentMethod"
              value={bookingData.paymentMethod}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="card">Credit/Debit Card</option>
              <option value="paypal">PayPal</option>
              <option value="wallet">Digital Wallet</option>
            </select>
          </div>

          {/* Booking Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{bookingData.duration} hours</span>
              </div>
              <div className="flex justify-between">
                <span>Rate:</span>
                <span>${space.hourlyRate}/hour</span>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-2 font-semibold">
                <span>Total Amount:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Booking...
                </div>
              ) : (
                <>
                  <QrCode className="h-4 w-4 inline mr-2" />
                  Book Space
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;