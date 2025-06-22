import React, { useState, useMemo } from 'react';
import { Car, Zap, Armchair as Wheelchair, AlertCircle, Filter, Search } from 'lucide-react';
import { ParkingSpace } from '../../types';
import { useParking } from '../../context/ParkingContext';

interface ParkingMapProps {
  onSpaceSelect?: (space: ParkingSpace) => void;
  selectedSpaceId?: string;
}

const ParkingMap: React.FC<ParkingMapProps> = ({ onSpaceSelect, selectedSpaceId }) => {
  const { spaces } = useParking();
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedSection, setSelectedSection] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const floors = [...new Set(spaces.map(space => space.floor))].sort();
  const sections = [...new Set(spaces.map(space => space.section))].sort();

  const filteredSpaces = useMemo(() => {
    return spaces.filter(space => {
      const matchesFloor = space.floor === selectedFloor;
      const matchesSection = selectedSection === 'all' || space.section === selectedSection;
      const matchesType = filterType === 'all' || space.type === filterType;
      const matchesSearch = searchQuery === '' || 
        space.number.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesFloor && matchesSection && matchesType && matchesSearch;
    });
  }, [spaces, selectedFloor, selectedSection, filterType, searchQuery]);

  const getSpaceIcon = (type: string) => {
    switch (type) {
      case 'electric':
        return <Zap className="h-4 w-4" />;
      case 'disabled':
        return <Wheelchair className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  const getSpaceColor = (space: ParkingSpace) => {
    if (space.id === selectedSpaceId) {
      return 'bg-blue-500 border-blue-600 text-white';
    }
    
    switch (space.status) {
      case 'available':
        switch (space.type) {
          case 'electric':
            return 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200';
          case 'disabled':
            return 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200';
          case 'compact':
            return 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200';
          default:
            return 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200';
        }
      case 'occupied':
        return 'bg-red-100 border-red-300 text-red-800 cursor-not-allowed';
      case 'reserved':
        return 'bg-orange-100 border-orange-300 text-orange-800 cursor-not-allowed';
      case 'maintenance':
        return 'bg-gray-100 border-gray-300 text-gray-800 cursor-not-allowed';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const spaceCounts = useMemo(() => {
    const counts = {
      total: filteredSpaces.length,
      available: filteredSpaces.filter(s => s.status === 'available').length,
      occupied: filteredSpaces.filter(s => s.status === 'occupied').length,
      reserved: filteredSpaces.filter(s => s.status === 'reserved').length,
      maintenance: filteredSpaces.filter(s => s.status === 'maintenance').length
    };
    return counts;
  }, [filteredSpaces]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header and Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Parking Map</h2>
            <p className="text-sm text-gray-600 mt-1">
              Floor {selectedFloor} - {spaceCounts.available} of {spaceCounts.total} spaces available
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search spaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Floor Selection */}
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {floors.map(floor => (
                <option key={floor} value={floor}>Floor {floor}</option>
              ))}
            </select>

            {/* Section Filter */}
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Sections</option>
              {sections.map(section => (
                <option key={section} value={section}>Section {section}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="regular">Regular</option>
              <option value="compact">Compact</option>
              <option value="electric">Electric</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span>Available ({spaceCounts.available})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>Occupied ({spaceCounts.occupied})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
            <span>Reserved ({spaceCounts.reserved})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span>Maintenance ({spaceCounts.maintenance})</span>
          </div>
        </div>
      </div>

      {/* Parking Grid */}
      <div className="p-6">
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
          {filteredSpaces.map((space) => (
            <button
              key={space.id}
              onClick={() => space.status === 'available' && onSpaceSelect?.(space)}
              disabled={space.status !== 'available'}
              className={`
                aspect-square border-2 rounded-lg p-2 transition-all duration-200 transform hover:scale-105
                flex flex-col items-center justify-center text-xs font-medium
                ${getSpaceColor(space)}
                ${space.status === 'available' ? 'cursor-pointer' : ''}
              `}
              title={`${space.number} - ${space.type} - $${space.hourlyRate}/hr - ${space.status}`}
            >
              {getSpaceIcon(space.type)}
              <span className="mt-1 text-xs font-semibold">{space.number}</span>
              <span className="text-xs">${space.hourlyRate}/hr</span>
              {space.status !== 'available' && (
                <AlertCircle className="h-3 w-3 mt-1" />
              )}
            </button>
          ))}
        </div>

        {filteredSpaces.length === 0 && (
          <div className="text-center py-12">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No spaces found</h3>
            <p className="text-gray-600">Try adjusting your filters to see more spaces.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParkingMap;