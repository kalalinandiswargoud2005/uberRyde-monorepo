'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import ReviewModal from '../components/ReviewModal';
import jsPDF from 'jspdf';

export default function HistoryPage() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // --- FIX #1: Use backticks (`) for the URL ---
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rides/history/${user.id}`);
          if (!response.ok) throw new Error('Could not fetch ride history.');
          const data = await response.json();
          setRides(data);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleReviewSubmit = async (reviewData) => {
    try {
      // --- FIX #2: Use backticks (`) for the URL ---
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });
      if (!response.ok) throw new Error('Failed to submit review.');

      alert('Review submitted successfully!');
      setSelectedRide(null); // Close the modal
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDownloadReceipt = (ride) => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("uberRyde Ride Receipt", 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Ride ID: ${ride.id}`, 14, 40);
    doc.text(`Date: ${new Date(ride.created_at).toLocaleString()}`, 14, 50);
    
    doc.line(14, 60, 196, 60);
    
    doc.setFontSize(16);
    doc.text("Total Fare", 14, 70);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(`₹${ride.fare}`, 196, 70, { align: 'right' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Thank you for riding with uberRyde!", 105, 90, { align: 'center' });
    
    doc.save(`uberryde-receipt-${ride.id.substring(0, 8)}.pdf`);
  };

  if (loading) return <div className="p-8">Loading ride history...</div>;

  return (
    <>
      <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-full">
        <h1 className="text-3xl font-bold mb-6">Your Ride History</h1>
        <div className="space-y-4">
          {rides.length > 0 ? (
            rides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center"
              >
                <div>
                  <p><strong>Date:</strong> {new Date(ride.created_at).toLocaleDateString()}</p>
                  <p><strong>Status:</strong> <span className="font-semibold">{ride.status}</span></p>
                  <p><strong>Fare:</strong> ₹{ride.fare}</p>
                </div>
                <div className="flex gap-2">
                  {ride.status === 'COMPLETED' && (
                    <>
                      <button
                        onClick={() => handleDownloadReceipt(ride)}
                        className="bg-gray-600 text-white font-semibold py-2 px-4 rounded hover:bg-gray-700"
                      >
                        Download Receipt
                      </button>
                      <button
                        onClick={() => setSelectedRide(ride)}
                        className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600"
                      >
                        Leave a Review
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p>You have no past rides.</p>
          )}
        </div>
      </div>

      {selectedRide && (
        <ReviewModal
          ride={selectedRide}
          onClose={() => setSelectedRide(null)}
          onSubmit={handleReviewSubmit}
        />
      )}
    </>
  );
}