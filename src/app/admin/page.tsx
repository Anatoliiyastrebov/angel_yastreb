'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import { Loader2, LogOut, Search, ChevronRight } from 'lucide-react';

type Row = {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  status: string;
  questionnaire_type: string | null;
  language: string | null;
};

export default function AdminHomePage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (status === 'new' || status === 'processed') params.set('status', status);
      const res = await fetch(`/api/admin/submissions?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load');
        setRows([]);
        return;
      }
      setRows(data.submissions || []);
      setTotal(data.total ?? 0);
    } catch {
      setError('Network error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-medical-50">
      <header className="sticky top-0 z-10 border-b border-medical-200 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-medical-900">Submissions</h1>
            <p className="text-sm text-medical-600">{total} total</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-2 text-sm text-medical-700 hover:text-medical-900 border border-medical-300 rounded-lg px-3 py-2"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-medical-400" />
            <input
              placeholder="Search name or phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-medical-300 bg-white"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-medical-300 bg-white px-3 py-2 text-medical-900"
          >
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="processed">Processed</option>
          </select>
          <button type="button" onClick={() => load()} className="btn-primary px-4 py-2 rounded-lg">
            Apply
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-xl border border-medical-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-medical-100/80 text-medical-800">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Received</th>
                    <th className="text-left font-medium px-4 py-3">Name</th>
                    <th className="text-left font-medium px-4 py-3">Phone</th>
                    <th className="text-left font-medium px-4 py-3">Type</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-medical-100 hover:bg-medical-50/80">
                      <td className="px-4 py-3 text-medical-700 whitespace-nowrap">
                        {format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="px-4 py-3 font-medium text-medical-900">{r.name}</td>
                      <td className="px-4 py-3 text-medical-700">{r.phone}</td>
                      <td className="px-4 py-3 text-medical-600">{r.questionnaire_type}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.status === 'processed'
                              ? 'bg-success-100 text-success-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/submissions/${r.id}`}
                          className="inline-flex items-center gap-1 text-primary-600 hover:underline"
                        >
                          Open <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <div className="text-center py-12 text-medical-600">No submissions match filters.</div>
              )}
            </div>

            <div className="md:hidden space-y-3">
              {rows.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/submissions/${r.id}`}
                  className="block rounded-xl border border-medical-200 bg-white p-4 shadow-sm active:scale-[0.99] transition-transform"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-medical-900">{r.name}</p>
                      <p className="text-sm text-medical-600">{r.phone}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === 'processed'
                          ? 'bg-success-100 text-success-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-medical-500 mt-2">
                    {format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')} · {r.questionnaire_type}
                  </p>
                </Link>
              ))}
              {rows.length === 0 && (
                <div className="text-center py-12 text-medical-600">No submissions match filters.</div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
