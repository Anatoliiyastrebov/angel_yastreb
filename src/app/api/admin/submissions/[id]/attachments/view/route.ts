import { NextRequest, NextResponse } from 'next/server';

import { attachmentPreviewKind, guessMimeFromFilename } from '@/lib/attachment-preview';
import { getConsultantUser } from '@/lib/server/admin-access';
import { docxBlobToSafeHtmlPage } from '@/lib/server/docx-preview-html';
import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

function asciiFilenameFallback(name: string): string {
  const cleaned = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '');
  return cleaned.slice(0, 180) || 'file';
}

/**
 * Просмотр вложения через сервер (без редиректа на URL Storage).
 * PDF и изображения — как есть; DOCX конвертируется в безопасный HTML для iframe.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const consultant = await getConsultantUser();
  if (!consultant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: submissionId } = await ctx.params;
  const storagePath = req.nextUrl.searchParams.get('path');

  if (!storagePath?.trim()) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  if (storagePath.includes('..') || storagePath.startsWith('/') || storagePath.includes('\\')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  if (!storagePath.startsWith(`${submissionId}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const bucket = process.env.SUBMISSION_FILES_BUCKET?.trim();
  if (!bucket) {
    return NextResponse.json(
      { error: 'SUBMISSION_FILES_BUCKET is not configured on the server' },
      { status: 503 }
    );
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    console.error('[attachment view] supabase', e);
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { data: row, error: rowErr } = await admin
    .from('submissions')
    .select('answers')
    .eq('id', submissionId)
    .maybeSingle();

  if (rowErr || !row?.answers || typeof row.answers !== 'object') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const att = (row.answers as Record<string, unknown>).attachments;
  if (!Array.isArray(att)) {
    return NextResponse.json({ error: 'No attachments' }, { status: 404 });
  }

  const meta = att.find((a) => {
    if (!a || typeof a !== 'object') return false;
    return String((a as { storage_path?: string }).storage_path) === storagePath;
  }) as { storage_path?: string; filename?: string } | undefined;

  if (!meta) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const filename =
    typeof meta.filename === 'string' && meta.filename.trim()
      ? meta.filename.trim()
      : storagePath.split('/').pop() ?? 'file';

  const kind = attachmentPreviewKind(filename);
  if (kind === 'none') {
    return NextResponse.json(
      {
        error:
          'Для этого типа файла предпросмотр отключён. Прямая выдача файла на устройство не выполняется.',
      },
      { status: 415 }
    );
  }

  const { data: blob, error: dlErr } = await admin.storage.from(bucket).download(storagePath);

  if (dlErr || !blob) {
    console.error('[attachment view] download', dlErr);
    return NextResponse.json({ error: 'Could not read file from storage' }, { status: 500 });
  }

  const noStore = {
    'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
  } as const;

  if (kind === 'docx') {
    try {
      const html = await docxBlobToSafeHtmlPage(blob);
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': 'inline',
          ...noStore,
        },
      });
    } catch (e) {
      console.error('[attachment view] docx', e);
      return NextResponse.json(
        {
          error:
            'Не удалось открыть документ Word. Поддерживается предпросмотр .docx; старый .doc не конвертируется. Проверьте, что файл не повреждён.',
        },
        { status: 422 }
      );
    }
  }

  const mime = guessMimeFromFilename(filename);
  const fallback = asciiFilenameFallback(filename);

  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `inline; filename="${fallback}"`,
      ...noStore,
    },
  });
}
