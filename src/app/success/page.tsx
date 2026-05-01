import { Suspense } from 'react';
import Success from '@/views/Success';

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-medical-50 text-medical-600">Loading…</div>
      }
    >
      <Success />
    </Suspense>
  );
}
