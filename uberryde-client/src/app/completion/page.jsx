'use client'
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CompletionPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const redirectStatus = searchParams.get('redirect_status');
    setStatus(redirectStatus);
  }, [searchParams]);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
        {status === 'succeeded' ? (
          <div>
            <h1 className="text-2xl font-bold text-green-600 mb-4">Payment Successful!</h1>
            <p className="text-gray-700 mb-6">Thank you for your payment. Your ride is complete.</p>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Payment Failed</h1>
            <p className="text-gray-700 mb-6">There was an issue with your payment. Please try again.</p>
          </div>
        )}
        <Link href="/" className="inline-block bg-black text-white font-bold py-2 px-6 rounded hover:bg-gray-800">
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}