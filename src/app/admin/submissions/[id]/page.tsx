'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import {
  generateMarkdown,
  type FormData as QFormData,
  type FormAdditionalData,
  type ContactData,
} from '@/lib/form-utils';
import { getQuestionnaire, type QuestionnaireType } from '@/lib/questionnaire-data';
import type { Language } from '@/lib/translations';
import { ArrowLeft, Loader2, Trash2, CheckCircle } from 'lucide-react';

type Submission = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string;
  answers: Record<string, unknown>;
  status: string;
  processed_at: string | null;
  questionnaire_type: string | null;
  language: string | null;
};

export default function AdminSubmissionDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();

  const [row, setRow] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Заявка не найдена');
        setRow(null);
        return;
      }
      setRow(data.submission);
    } catch {
      setError('Ошибка сети');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function markProcessed() {
    if (!id) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'processed' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Не удалось обновить');
        return;
      }
      setRow(data.submission);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!id || !confirm('Удалить эту заявку безвозвратно?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Не удалось удалить');
        return;
      }
      router.replace('/admin');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  const readableHtml = useMemo(() => {
    if (!row?.answers || typeof row.answers !== 'object') return null;
    const a = row.answers as Record<string, unknown>;
    const rawType = row.questionnaire_type || a.questionnaireType;
    const types: QuestionnaireType[] = ['infant', 'child', 'woman', 'man'];
    if (typeof rawType !== 'string' || !types.includes(rawType as QuestionnaireType)) {
      return null;
    }
    const langRaw = row.language || 'ru';
    const lang = (['ru', 'en', 'de'].includes(String(langRaw)) ? langRaw : 'ru') as Language;
    try {
      const sections = getQuestionnaire(rawType as QuestionnaireType);
      const formData = (a.formData && typeof a.formData === 'object' ? a.formData : {}) as QFormData;
      const additionalData = (
        a.additionalData && typeof a.additionalData === 'object' ? a.additionalData : {}
      ) as FormAdditionalData;
      const contactData = (
        a.contactData && typeof a.contactData === 'object' ? a.contactData : {}
      ) as ContactData;
      return generateMarkdown(
        rawType as QuestionnaireType,
        sections,
        formData,
        additionalData,
        contactData,
        lang
      );
    } catch {
      return null;
    }
  }, [row]);

  const attachments = useMemo(() => {
    if (!row?.answers || typeof row.answers !== 'object') return [];
    const att = (row.answers as Record<string, unknown>).attachments;
    return Array.isArray(att) ? att : [];
  }, [row]);

  return (
    <div className="min-h-screen bg-medical-50">
      <header className="sticky top-0 z-10 border-b border-medical-200 bg-white/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3 justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-medical-700 hover:text-medical-900 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Все заявки
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="text-sm text-medical-600 hover:text-medical-900"
          >
            Выйти
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : error || !row ? (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3">{error}</div>
        ) : (
          <>
            <div className="rounded-2xl border border-medical-200 bg-white shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-medical-900">{row.name}</h1>
                  <p className="text-medical-600">{row.phone}</p>
                  <p className="text-sm text-medical-500 mt-2">
                    Получено {format(new Date(row.created_at), 'dd.MM.yyyy HH:mm')} · тип:{' '}
                    {row.questionnaire_type ?? '—'} · язык: {row.language ?? '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.status !== 'processed' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => markProcessed()}
                      className="inline-flex items-center gap-2 rounded-lg bg-success-600 text-white px-4 py-2 text-sm font-medium hover:bg-success-700 disabled:opacity-60"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Отметить обработанной
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove()}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-300 text-red-700 px-4 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-medical-900">Ответы анкеты</h2>
                {readableHtml ? (
                  <div
                    className="rounded-xl border border-medical-200 bg-white px-4 py-5 text-medical-900 text-sm leading-relaxed shadow-inner [&_b]:font-semibold [&_i]:italic whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: readableHtml }}
                  />
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
                    Не удалось собрать текст анкеты (неизвестный тип или формат данных). Ниже — сырые данные.
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className="rounded-xl border border-medical-200 bg-medical-50/80 px-4 py-3 text-sm">
                    <p className="font-medium text-medical-900 mb-2">Вложения</p>
                    <ul className="list-disc list-inside text-medical-700 space-y-1">
                      {attachments.map((item: unknown, i: number) => {
                        const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
                        const name = typeof o.filename === 'string' ? o.filename : String(o.storage_path ?? i);
                        return <li key={i}>{name}</li>;
                      })}
                    </ul>
                  </div>
                )}

                <details className="rounded-xl border border-medical-100 bg-medical-50/50 text-sm">
                  <summary className="cursor-pointer px-4 py-3 font-medium text-medical-700 select-none">
                    Технические данные (JSON)
                  </summary>
                  <div className="px-4 pb-4 overflow-x-auto">
                    <pre className="text-xs text-medical-800 whitespace-pre-wrap break-words font-mono leading-relaxed">
                      {JSON.stringify(row.answers, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
