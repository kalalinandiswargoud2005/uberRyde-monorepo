'use client'
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import { useSearchParams } from 'next/navigation'; // Import this hook

// Load Stripe with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function PaymentPage() {
  const searchParams = useSearchParams(); // Initialize the hook
  const [clientSecret, setClientSecret] = useState('');

  // --- Read the real fare from the URL ---
  const rideFare = searchParams.get('fare');

  useEffect(() => {
    // Only create a payment intent if a fare exists in the URL
    if (rideFare) {
      fetch('http://localhost:3001/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Use the dynamic rideFare and convert it to paise
        body: JSON.stringify({ amount: Math.round(parseFloat(rideFare) * 100) }), 
      })
        .then((res) => res.json())
        .then((data) => setClientSecret(data.clientSecret));
    }
  }, [rideFare]);

  const appearance = {
    theme: 'stripe',
  };
  const options = {
    clientSecret,
    appearance,
  };

  if (!rideFare) {
    return <div className="p-8">No fare specified.</div>;
  }

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Complete Your Payment</h1>
        <p className="text-center text-lg mb-6">Total Amount: <span className="font-bold">₹{rideFare}</span></p>
        
        {clientSecret && (
          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm />
          </Elements>
        )}
      </div>
    </div>
  );
}