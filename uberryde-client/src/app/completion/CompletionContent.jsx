'use client'
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CompletionContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const redirectStatus = searchParams.get('redirect_status');
    setStatus(redirectStatus);
  }, [searchParams]);

  if (status === 'succeeded') {
    return (
      <>
        <h1 className="text-2xl font-bold text-green-600 mb-4">Payment Successful!</h1>
        <p className="text-gray-700 mb-6">Thank you for your payment. Your ride is complete.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-red-600 mb-4">Payment Failed</h1>
      <p className="text-gray-700 mb-6">There was an issue with your payment. Please try again.</p>
    </>
  );
}