import { Suspense } from 'react';
import PaymentContent from './PaymentContent';

export default function PaymentPage() {
  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <Suspense fallback={<p className="text-center text-gray-700">Loading Payment Form...</p>}>
          <PaymentContent />
        </Suspense>
      </div>
    </div>
  );
}