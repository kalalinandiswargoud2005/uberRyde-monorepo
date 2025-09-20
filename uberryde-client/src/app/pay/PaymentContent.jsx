'use client'
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import { useSearchParams } from 'next/navigation';

// Load Stripe with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function PaymentContent() {
  const searchParams = useSearchParams();
  const [clientSecret, setClientSecret] = useState('');
  const rideFare = searchParams.get('fare');

  useEffect(() => {
    if (rideFare) {
      fetch('http://localhost:3001/api/create-payment-intent', { // Remember to change this to your live backend URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(parseFloat(rideFare) * 100) }), 
      })
        .then((res) => res.json())
        .then((data) => setClientSecret(data.clientSecret));
    }
  }, [rideFare]);

  const appearance = { theme: 'stripe' };
  const options = { clientSecret, appearance };

  return (
    <>
      <h1 className="text-2xl font-bold mb-4 text-center">Complete Your Payment</h1>
      <p className="text-center text-lg mb-6">Total Amount: <span className="font-bold">₹{rideFare}</span></p>

      {clientSecret && (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm />
        </Elements>
      )}
    </>
  );
}