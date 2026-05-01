import { Suspense } from 'react';
import Anketa from '@/views/Anketa';

export default function AnketaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-medical-600">Loading…</div>}>
      <Anketa />
    </Suspense>
  );
}
