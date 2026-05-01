'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import { Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/admin';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === 'forbidden' ? 'Access denied for this account.' : null
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }
      router.replace(nextPath.startsWith('/admin') ? nextPath : '/admin');
      router.refresh();
    } catch {
      setError('Could not sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-medical-50 via-white to-primary-50">
      <div className="w-full max-w-md rounded-2xl border border-medical-200 bg-white/90 backdrop-blur shadow-card p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-medical-900">Consultant login</h1>
          <p className="text-sm text-medical-600 mt-1">Protected dashboard — Supabase Auth</p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-medical-800 mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-medical-300 px-3 py-2 text-medical-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-medical-800 mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-medical-300 px-3 py-2 text-medical-900"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Sign in
          </button>
        </form>

        <p className="text-center text-sm text-medical-600">
          <Link href="/" className="text-primary-600 hover:underline">
            Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
