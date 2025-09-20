'use client'
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { supabase } from '@/lib/supabase/client';
import { MapPin, Star } from 'lucide-react';

const socket = io('http://localhost:3001');

export default function DriverDashboard() {
  const [availableRides, setAvailableRides] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [driver, setDriver] = useState(null);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setDriver({ id: user.id });
        socket.emit('join-driver-room', user.id);
      }
    };
    setup();

    socket.on('new-ride-request', (newRide) => {
      setAvailableRides((prev) => [newRide, ...prev]);
    });

    return () => socket.off('new-ride-request');
  }, []);

  useEffect(() => {
    let locationInterval;
    if (driver) {
      locationInterval = setInterval(() => {
        const simulatedLocation = {
          lat: 28.6139 + (Math.random() - 0.5) * 0.1,
          lng: 77.2090 + (Math.random() - 0.5) * 0.1,
        };
        socket.emit('update-driver-location', {
          driverId: driver.id,
          location: simulatedLocation,
        });
      }, 5000);
    }
    return () => clearInterval(locationInterval);
  }, [driver]);

  const handleRideAction = async (rideId, action) => {
    try {
      const response = await fetch(`http://localhost:3001/api/rides/${rideId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const partialUpdate = await response.json();
      if (!response.ok) throw new Error(partialUpdate.error || `Failed to ${action} ride.`);
      
      // Correctly merge the update without losing existing ride data
      setMyRides(prev => prev.map(r => r.id === rideId ? { ...r, ...partialUpdate } : r));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleAcceptRide = async (ride) => {
    if (!driver) return alert('You must be logged in.');
    try {
      const response = await fetch(`http://localhost:3001/api/rides/${ride.id}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driver.id }),
      });
      const acceptedRide = await response.json();
      if (!response.ok) throw new Error(acceptedRide.error || 'Failed to accept ride.');

      setAvailableRides((prev) => prev.filter((r) => r.id !== ride.id));
      setMyRides((prev) => [acceptedRide, ...prev]);
      setActiveTab('my-rides');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const RideCard = ({ ride, onAccept }) => {
    const buttonMap = {
      'ACCEPTED': { text: 'Start Trip', action: 'start', className: 'bg-blue-500 hover:bg-blue-600' },
      'IN_PROGRESS': { text: 'End Trip', action: 'complete', className: 'bg-green-500 hover:bg-green-600' },
    };
    const buttonInfo = buttonMap[ride.status];

    return (
      <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100">
        <div className="p-5">
          <div className="flex justify-between items-start">
            <span className={`px-3 py-1 text-xs font-semibold text-white rounded-full ${ride.status === 'COMPLETED' ? 'bg-green-500' : 'bg-indigo-500'}`}>
              {ride.status.replace('_', ' ')}
            </span>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800">₹{ride.fare}</p>
              <p className="text-xs text-gray-400">Fare</p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-400" /> Pickup: {JSON.stringify(ride.pickup_location)}</div>
            <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-400" /> Dropoff: {JSON.stringify(ride.destination_location)}</div>
          </div>
        </div>
        {(onAccept || buttonInfo) && (
          <div className="bg-gray-50 p-4">
            {onAccept && <button onClick={() => onAccept(ride)} className="w-full bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-600 transition">Accept Ride</button>}
            {buttonInfo && <button onClick={() => handleRideAction(ride.id, buttonInfo.action)} className={`w-full text-white font-bold py-2.5 px-4 rounded-lg transition ${buttonInfo.className}`}>{buttonInfo.text}</button>}
          </div>
        )}
      </div>
    );
  };
  
  const totalEarnings = myRides
    .filter(r => r.status === 'COMPLETED')
    .reduce((sum, r) => sum + parseFloat(r.fare || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Driver Dashboard</h1>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-700">Today's Earnings</p>
              <p className="text-3xl font-bold text-green-800">₹{totalEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-indigo-700">Completed Trips</p>
              <p className="text-3xl font-bold text-indigo-800">{myRides.filter(r => r.status === 'COMPLETED').length}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-700">Your Rating</p>
              <p className="text-3xl font-bold text-yellow-800 flex items-center justify-center">5.0 <Star size={24} className="ml-1 text-yellow-400 fill-current" /></p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <nav className="flex space-x-4 border-b border-gray-200">
            <button onClick={() => setActiveTab('available')} className={`py-3 px-4 font-medium text-sm rounded-t-lg transition ${activeTab === 'available' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}>
              Available Rides ({availableRides.length})
            </button>
            <button onClick={() => setActiveTab('my-rides')} className={`py-3 px-4 font-medium text-sm rounded-t-lg transition ${activeTab === 'my-rides' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}>
              My Rides ({myRides.length})
            </button>
          </nav>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'available' && (availableRides.length > 0 ? availableRides.map(ride => <RideCard key={ride.id} ride={ride} onAccept={handleAcceptRide} />) : <p className="text-gray-500 col-span-full">Waiting for ride requests...</p>)}
          {activeTab === 'my-rides' && (myRides.length > 0 ? myRides.map(ride => <RideCard key={ride.id} ride={ride} />) : <p className="text-gray-500 col-span-full">You have no active or completed rides.</p>)}
        </div>
      </div>
    </div>
  );
}