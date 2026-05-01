import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateMarkdown } from '@/lib/form-utils';
import type { QuestionnaireType } from '@/lib/questionnaire-data';
import { getQuestionnaire } from '@/lib/questionnaire-data';
import { getSupabaseAdmin } from '@/lib/supabase/server-admin';
import { rateLimitSubmission } from '@/lib/server/rate-limit';
import { sanitizeAnswersJson } from '@/lib/server/sanitize-answers';
import { sendSubmissionNotification } from '@/lib/server/telegram-notify';
import { verifyTurnstileToken } from '@/lib/server/turnstile';
import {
  buildDisplayName,
  normalizePhone,
  validateSubmissionPayload,
  type SubmissionPayload,
} from '@/lib/server/validate-submission';
import type { Language } from '@/lib/translations';

export const runtime = 'nodejs';

function clientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

const baseSchema = z.object({
  questionnaireType: z.enum(['infant', 'child', 'woman', 'man']),
  language: z.enum(['ru', 'en', 'de']),
  consentAccepted: z.literal(true),
  formData: z.record(z.any()),
  additionalData: z.record(z.any()),
  contactData: z.record(z.any()),
  website: z.string().optional(),
  turnstileToken: z.string().optional(),
});

async function parseBody(req: NextRequest): Promise<{ payload: z.infer<typeof baseSchema>; files: File[] }> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    const honeypot = fd.get('website');
    if (honeypot != null && String(honeypot).trim() !== '') {
      throw Object.assign(new Error('bad_request'), { code: 'HONEYPOT' });
    }
    const meta = fd.get('metadata');
    if (typeof meta !== 'string') {
      throw Object.assign(new Error('bad_request'), { code: 'METADATA' });
    }
    const raw = JSON.parse(meta) as unknown;
    const payload = baseSchema.parse(raw);
    const files = fd.getAll('files').filter((x): x is File => x instanceof File && x.size > 0);
    return { payload, files };
  }

  const raw = await req.json();
  const payload = baseSchema.parse(raw);
  if (payload.website != null && payload.website.trim() !== '') {
    throw Object.assign(new Error('bad_request'), { code: 'HONEYPOT' });
  }
  return { payload, files: [] };
}

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 8;

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const limited = rateLimitSubmission(ip);
    if (limited.ok === false) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.', retryAfterSec: limited.retryAfterSec },
        { status: 429 }
      );
    }

    let payload: z.infer<typeof baseSchema>;
    let files: File[];
    try {
      const parsed = await parseBody(req);
      payload = parsed.payload;
      files = parsed.files;
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
      if (code === 'HONEYPOT') {
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      console.warn('[submissions] bad request', e);
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const turnOk = await verifyTurnstileToken(payload.turnstileToken);
    if (!turnOk) {
      const secretSet = !!(process.env.TURNSTILE_SECRET_KEY || '').trim();
      const msg =
        secretSet && !payload.turnstileToken
          ? 'На сервере включён Turnstile (TURNSTILE_SECRET_KEY), но форма не отправляет токен. Уберите TURNSTILE_SECRET_KEY из .env или добавьте виджет Turnstile и передайте токен.'
          : 'Проверка бота не прошла (Turnstile).';
      return NextResponse.json({ error: msg }, { status: 403 });
    }

    const submissionPayload: SubmissionPayload = {
      questionnaireType: payload.questionnaireType as QuestionnaireType,
      language: payload.language as Language,
      consentAccepted: payload.consentAccepted,
      formData: payload.formData,
      additionalData: payload.additionalData,
      contactData: payload.contactData,
    };

    const { errors } = validateSubmissionPayload(submissionPayload);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 422 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: 'Too many files' }, { status: 400 });
    }
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: 'File too large' }, { status: 400 });
      }
    }

    const sections = getQuestionnaire(submissionPayload.questionnaireType);
    const markdown = generateMarkdown(
      submissionPayload.questionnaireType,
      sections,
      submissionPayload.formData,
      submissionPayload.additionalData,
      submissionPayload.contactData,
      submissionPayload.language
    );

    const name = buildDisplayName(submissionPayload.formData);
    const phone = normalizePhone(submissionPayload.contactData);

    const attachmentsMeta: Array<{ storage_path: string; filename: string; size: number }> = [];
    const bucket = process.env.SUBMISSION_FILES_BUCKET;

    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch (cfgErr) {
      console.error('[submissions] Supabase server env missing', cfgErr);
      return NextResponse.json(
        {
          error:
            'Сервер не настроен: в .env.local нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY (ключ service_role из Supabase → Settings → API). После правки перезапустите npm run dev.',
        },
        { status: 500 }
      );
    }

    const { data: inserted, error: insertError } = await admin
      .from('submissions')
      .insert({
        name,
        phone,
        status: 'new',
        questionnaire_type: submissionPayload.questionnaireType,
        language: submissionPayload.language,
        answers: sanitizeAnswersJson({
          formData: submissionPayload.formData,
          additionalData: submissionPayload.additionalData,
          contactData: submissionPayload.contactData,
          questionnaireType: submissionPayload.questionnaireType,
          markdownSummaryLength: markdown.length,
          attachments: [],
        }),
      })
      .select('id')
      .single();

    if (insertError || !inserted?.id) {
      console.error('[submissions] insert failed', insertError);
      return NextResponse.json({ error: 'Could not save submission' }, { status: 500 });
    }

    const submissionId = inserted.id as string;

    if (bucket && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
        const path = `${submissionId}/${Date.now()}_${i}_${safeName}`;
        const buf = Buffer.from(await file.arrayBuffer());
        const { error: upErr } = await admin.storage.from(bucket).upload(path, buf, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });
        if (upErr) {
          console.error('[submissions] storage upload failed', upErr);
        } else {
          attachmentsMeta.push({ storage_path: path, filename: file.name, size: file.size });
        }
      }

      const mergedAnswers = sanitizeAnswersJson({
        formData: submissionPayload.formData,
        additionalData: submissionPayload.additionalData,
        contactData: submissionPayload.contactData,
        questionnaireType: submissionPayload.questionnaireType,
        markdownSummaryLength: markdown.length,
        attachments: attachmentsMeta,
      });

      await admin.from('submissions').update({ answers: mergedAnswers }).eq('id', submissionId);
    }

    const vercelHost = process.env.VERCEL_URL?.replace(/^https?:\/\//, '');
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      (vercelHost ? `https://${vercelHost}` : '') ||
      'http://localhost:3001';
    const dashboardUrl = `${baseUrl}/admin/submissions/${submissionId}`;

    const tg = await sendSubmissionNotification({
      submissionId,
      dashboardUrl,
      questionnaireType: submissionPayload.questionnaireType,
      patientDisplayName: name,
    });
    if (!tg.ok) {
      console.warn('[submissions] telegram notify failed', tg.error);
    }

    return NextResponse.json({ ok: true, id: submissionId });
  } catch (err) {
    console.error('[submissions] POST error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
