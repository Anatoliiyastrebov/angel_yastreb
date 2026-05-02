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
import { attachmentPreviewKind } from '@/lib/attachment-preview';
import { phoneToTelHref } from '@/lib/contact-links';
import { ArrowLeft, Loader2, Trash2, CheckCircle, FileText } from 'lucide-react';

function formatFileSize(bytes: unknown): string {
  const n = typeof bytes === 'number' && Number.isFinite(bytes) ? bytes : 0;
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
}

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

  const markedMedicalAttachments = useMemo(() => {
    if (!row?.answers || typeof row.answers !== 'object') return false;
    const fd = (row.answers as Record<string, unknown>).formData;
    if (!fd || typeof fd !== 'object') return false;
    return (fd as Record<string, unknown>).has_medical_documents === 'yes';
  }, [row]);

  return (
    <div className="min-h-screen bg-medical-50">
      <header className="sticky top-0 z-10 border-b border-medical-200 bg-white/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 flex flex-wrap items-center gap-3 justify-between min-w-0">
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

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6 w-full min-w-0">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : error || !row ? (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3">{error}</div>
        ) : (
          <>
            <div className="rounded-2xl border border-medical-200 bg-white shadow-sm p-4 sm:p-6 space-y-4 w-full min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-medical-900">{row.name}</h1>
                  <p className="text-medical-600">
                    {(() => {
                      const tel = phoneToTelHref(row.phone);
                      return tel ? (
                        <a
                          href={tel}
                          className="text-primary-700 underline underline-offset-2 hover:text-primary-900"
                        >
                          {row.phone}
                        </a>
                      ) : (
                        row.phone
                      );
                    })()}
                  </p>
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
                {(attachments.length > 0 || markedMedicalAttachments) && (
                  <div className="rounded-xl border-2 border-primary-200 bg-gradient-to-br from-primary-50/90 to-white px-3 py-3 sm:px-5 sm:py-4 shadow-sm w-full min-w-0 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 min-w-0">
                      <div className="rounded-lg bg-primary-100 p-2 text-primary-700 shrink-0 self-start">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
                        <h2 className="text-lg font-semibold text-medical-900">
                          Анализы, УЗИ и другие документы
                        </h2>
                        {attachments.length === 0 && markedMedicalAttachments && (
                          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            В анкете отмечены вложения, но файлов в базе нет — возможно, bucket не был настроен на
                            момент отправки или загрузка не удалась.
                          </p>
                        )}
                        {attachments.length > 0 && (
                          <ul className="space-y-3 pt-1">
                            {attachments.map((item: unknown, i: number) => {
                              const o =
                                item && typeof item === 'object'
                                  ? (item as Record<string, unknown>)
                                  : {};
                              const filename =
                                typeof o.filename === 'string'
                                  ? o.filename
                                  : String(o.storage_path ?? `файл-${i + 1}`);
                              const storagePath =
                                typeof o.storage_path === 'string' ? o.storage_path : '';
                              const size = o.size;
                              const kind = attachmentPreviewKind(filename);
                              const viewUrl =
                                storagePath && id
                                  ? `/api/admin/submissions/${id}/attachments/view?path=${encodeURIComponent(storagePath)}`
                                  : '';

                              return (
                                <li
                                  key={`${storagePath}-${i}`}
                                  className="rounded-lg border border-medical-200 bg-white overflow-hidden w-full min-w-0"
                                >
                                  <div className="px-3 py-2 border-b border-medical-100 bg-medical-50/60 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between min-w-0">
                                    <span className="text-sm font-medium text-medical-900 min-w-0 break-words [overflow-wrap:anywhere]">
                                      {filename}
                                      <span className="font-normal text-medical-500 ml-2 whitespace-nowrap align-middle">
                                        ({formatFileSize(size)})
                                      </span>
                                    </span>
                                    {!storagePath && (
                                      <span className="text-xs text-amber-700">Нет пути в Storage</span>
                                    )}
                                  </div>
                                  {!storagePath ? null : kind === 'pdf' ? (
                                    <details className="group min-w-0">
                                      <summary className="cursor-pointer px-3 py-2.5 text-sm text-primary-700 hover:bg-medical-50 select-none [list-style:none] [&::-webkit-details-marker]:hidden">
                                        Показать PDF
                                      </summary>
                                      <div className="px-1 pb-2 sm:px-2 w-full min-w-0">
                                        <div className="w-full min-h-[280px] h-[min(85dvh,720px)] sm:h-[min(80dvh,800px)] rounded-md border border-medical-200 bg-medical-100 overflow-hidden">
                                          <iframe
                                            title={filename}
                                            src={viewUrl}
                                            className="block w-full h-full min-h-[280px] border-0"
                                          />
                                        </div>
                                      </div>
                                    </details>
                                  ) : kind === 'docx' ? (
                                    <details className="group min-w-0">
                                      <summary className="cursor-pointer px-3 py-2.5 text-sm text-primary-700 hover:bg-medical-50 select-none [list-style:none] [&::-webkit-details-marker]:hidden">
                                        Показать документ Word (.docx)
                                      </summary>
                                      <div className="px-1 pb-2 sm:px-2 w-full min-w-0">
                                        <div className="w-full min-h-[280px] h-[min(85dvh,720px)] sm:h-[min(80dvh,800px)] rounded-md border border-medical-200 bg-medical-100 overflow-hidden">
                                          <iframe
                                            title={filename}
                                            src={viewUrl}
                                            className="block w-full h-full min-h-[280px] border-0"
                                          />
                                        </div>
                                      </div>
                                    </details>
                                  ) : kind === 'image' ? (
                                    <details className="group min-w-0" open>
                                      <summary className="cursor-pointer px-3 py-2.5 text-sm text-primary-700 hover:bg-medical-50 select-none [list-style:none] [&::-webkit-details-marker]:hidden">
                                        Изображение
                                      </summary>
                                      <div className="px-2 sm:px-3 pb-3 flex justify-center bg-medical-50/40 w-full min-w-0 overflow-x-auto">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={viewUrl}
                                          alt=""
                                          className="w-auto max-w-full h-auto max-h-[min(75dvh,560px)] object-contain rounded-md border border-medical-200"
                                        />
                                      </div>
                                    </details>
                                  ) : (
                                    <p className="px-3 py-3 text-sm text-medical-600 leading-relaxed">
                                      Предпросмотр для этого формата не включён (не PDF, не изображение и не .docx). Файл
                                      хранится в защищённом хранилище и удаляется вместе с заявкой.
                                    </p>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <h2 className="text-lg font-semibold text-medical-900">Ответы анкеты</h2>
                {readableHtml ? (
                  <div
                    className="rounded-xl border border-medical-200 bg-white px-3 sm:px-4 py-4 sm:py-5 text-medical-900 text-sm leading-relaxed shadow-inner [&_b]:font-semibold [&_i]:italic whitespace-pre-line w-full min-w-0 overflow-x-auto break-words [overflow-wrap:anywhere] [&_a]:text-primary-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary-900 [&_a]:break-all sm:[&_a]:break-normal"
                    dangerouslySetInnerHTML={{ __html: readableHtml }}
                  />
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
                    Не удалось собрать текст анкеты (неизвестный тип или формат данных). Ниже — сырые данные.
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
