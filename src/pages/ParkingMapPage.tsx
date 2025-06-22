import React, { useState } from 'react';
import { ParkingSpace } from '../types';
import ParkingMap from '../components/Parking/ParkingMap';
import BookingForm from '../components/Booking/BookingForm';

const ParkingMapPage: React.FC = () => {
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const handleSpaceSelect = (space: ParkingSpace) => {
    setSelectedSpace(space);
    setShowBookingForm(true);
  };

  const handleBookingComplete = (bookingId: string) => {
    setShowBookingForm(false);
    setSelectedSpace(null);
    // Could show success message or redirect
    console.log('Booking completed:', bookingId);
  };

  const handleBookingCancel = () => {
    setShowBookingForm(false);
    setSelectedSpace(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Parking Map</h1>
        <p className="text-gray-600 mt-1">
          Select an available parking space to make a reservation
        </p>
      </div>

      <ParkingMap 
        onSpaceSelect={handleSpaceSelect}
        selectedSpaceId={selectedSpace?.id}
      />

      {showBookingForm && selectedSpace && (
        <BookingForm
          space={selectedSpace}
          onBookingComplete={handleBookingComplete}
          onCancel={handleBookingCancel}
        />
      )}
    </div>
  );
};

export default ParkingMapPage;