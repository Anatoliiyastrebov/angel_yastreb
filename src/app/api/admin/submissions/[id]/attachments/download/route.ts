import { NextRequest, NextResponse } from 'next/server';

import { getConsultantUser } from '@/lib/server/admin-access';
import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Одноразовая подписанная ссылка на файл в Storage (только для вложений этой заявки). */
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
    console.error('[attachment download] supabase', e);
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

  const allowed = att.some((a) => {
    if (!a || typeof a !== 'object') return false;
    return String((a as { storage_path?: string }).storage_path) === storagePath;
  });

  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(bucket)
    .createSignedUrl(storagePath, 3600);

  if (signErr || !signed?.signedUrl) {
    console.error('[attachment download] sign', signErr);
    return NextResponse.json({ error: 'Could not create download link' }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
