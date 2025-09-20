import { Suspense } from 'react';
import Link from 'next/link';
import CompletionContent from './CompletionContent';

export default function CompletionPage() {
  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
        <Suspense fallback={<p>Loading payment status...</p>}>
          <CompletionContent />
        </Suspense>
        <Link href="/" className="inline-block mt-6 bg-black text-white font-bold py-2 px-6 rounded hover:bg-gray-800">
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}