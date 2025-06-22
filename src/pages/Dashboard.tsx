import React from 'react';
import { Car, Calendar, CreditCard, Clock, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useParking } from '../context/ParkingContext';
import StatsCard from '../components/Dashboard/StatsCard';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { spaces, bookings, notifications } = useParking();

  // Calculate stats
  const availableSpaces = spaces.filter(s => s.status === 'available').length;
  const occupiedSpaces = spaces.filter(s => s.status === 'occupied').length;
  const reservedSpaces = spaces.filter(s => s.status === 'reserved').length;
  const totalSpaces = spaces.length;
  const occupancyRate = ((occupiedSpaces + reservedSpaces) / totalSpaces * 100).toFixed(1);

  const userBookings = bookings.filter(b => b.userId === user?.id);
  const activeBookings = userBookings.filter(b => b.status === 'active').length;
  const upcomingBookings = userBookings.filter(b => b.status === 'confirmed').length;

  const recentBookings = userBookings
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5);

  const recentNotifications = notifications
    .filter(n => n.userId === user?.id)
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's your parking overview for today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Available Spaces"
          value={availableSpaces}
          icon={Car}
          color="green"
          trend={{
            value: 12,
            isPositive: true,
            label: 'from yesterday'
          }}
        />
        <StatsCard
          title="Your Active Bookings"
          value={activeBookings}
          icon={Calendar}
          color="blue"
        />
        <StatsCard
          title="Upcoming Reservations"
          value={upcomingBookings}
          icon={Clock}
          color="orange"
        />
        <StatsCard
          title="Occupancy Rate"
          value={`${occupancyRate}%`}
          icon={TrendingUp}
          color="purple"
          trend={{
            value: 5,
            isPositive: false,
            label: 'from last week'
          }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bookings */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
            </div>
            <div className="p-6">
              {recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                  <p className="text-gray-600 mb-4">Start by booking a parking space</p>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200">
                    Book Now
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBookings.map((booking) => {
                    const space = spaces.find(s => s.id === booking.spaceId);
                    return (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Car className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              Space {space?.number}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {format(new Date(booking.startTime), 'MMM dd, HH:mm')} - 
                              {format(new Date(booking.endTime), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            booking.status === 'active' ? 'bg-green-100 text-green-800' :
                            booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            booking.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.status}
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            ${booking.totalAmount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              <button className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center">
                <Car className="h-5 w-5 mr-2" />
                Find Parking
              </button>
              <button className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center">
                <Calendar className="h-5 w-5 mr-2" />
                View Bookings
              </button>
              <button className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment History
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Notifications</h2>
            </div>
            <div className="p-6">
              {recentNotifications.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No new notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentNotifications.map((notification) => (
                    <div key={notification.id} className="flex items-start space-x-3">
                      <div className="bg-blue-100 p-1 rounded-full mt-1">
                        <AlertTriangle className="h-3 w-3 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Parking Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Parking Status</h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Available</span>
                <span className="text-sm font-medium text-green-600">{availableSpaces}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Occupied</span>
                <span className="text-sm font-medium text-red-600">{occupiedSpaces}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Reserved</span>
                <span className="text-sm font-medium text-orange-600">{reservedSpaces}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Total</span>
                  <span className="text-sm font-medium text-gray-900">{totalSpaces}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;