'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function DriverApplicationPage() {
  const [vehicle, setVehicle] = useState({
    make: '',
    model: '',
    year: '',
    license_plate: '',
    vehicle_type: 'Sedan',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setVehicle({ ...vehicle, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to apply.');
      setLoading(false);
      return;
    }

    try {
      // --- THIS IS THE FIX ---
      // Use backticks (`) to correctly insert the backend URL
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/driver/vehicle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vehicle, driver_id: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit application.');
      }

      alert('Application submitted successfully! Your account is pending approval.');
      router.push('/driver');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Driver Application</h1>
        <p className="text-gray-600 mb-6">Please provide your vehicle details.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="make" value={vehicle.make} onChange={handleChange} placeholder="Make (e.g., Maruti Suzuki)" required className="w-full p-3 border rounded text-black" />
          <input name="model" value={vehicle.model} onChange={handleChange} placeholder="Model (e.g., Swift)" required className="w-full p-3 border rounded text-black" />
          <input name="year" type="number" value={vehicle.year} onChange={handleChange} placeholder="Year (e.g., 2022)" required className="w-full p-3 border rounded text-black" />
          <input name="license_plate" value={vehicle.license_plate} onChange={handleChange} placeholder="License Plate (e.g., MH 12 AB 3456)" required className="w-full p-3 border rounded text-black" />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
            <select name="vehicle_type" value={vehicle.vehicle_type} onChange={handleChange} className="w-full p-3 border rounded text-black bg-white">
              <option>Sedan</option>
              <option>SUV</option>
              <option>Hatchback</option>
              <option>Auto</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-black text-white font-bold p-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition">
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}