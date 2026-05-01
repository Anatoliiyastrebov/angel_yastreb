import { NextRequest, NextResponse } from 'next/server';

import { getConsultantUser } from '@/lib/server/admin-access';
import { writeAuditLog } from '@/lib/server/audit-log';
import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const consultant = await getConsultantUser();
  if (!consultant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from('submissions').select('*').eq('id', id).single();

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ submission: data });
  } catch (e) {
    console.error('[admin/submission] GET', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const consultant = await getConsultantUser();
  if (!consultant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const body = (await req.json()) as { status?: string };
    if (body.status !== 'processed' && body.status !== 'new') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const processed_at =
      body.status === 'processed' ? new Date().toISOString() : null;

    const { data, error } = await admin
      .from('submissions')
      .update({
        status: body.status,
        processed_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('[admin/submission] PATCH', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    await writeAuditLog({
      actor_email: consultant.email,
      action: 'submission_status_update',
      submission_id: id,
      metadata: { status: body.status },
    });

    return NextResponse.json({ submission: data });
  } catch (e) {
    console.error('[admin/submission] PATCH exception', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const consultant = await getConsultantUser();
  if (!consultant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const admin = getSupabaseAdmin();

    const { data: row } = await admin.from('submissions').select('answers').eq('id', id).single();

    const bucket = process.env.SUBMISSION_FILES_BUCKET;
    if (bucket && row?.answers && typeof row.answers === 'object') {
      const att = (row.answers as Record<string, unknown>).attachments;
      if (Array.isArray(att)) {
        const paths: string[] = [];
        for (const a of att) {
          if (typeof a === 'object' && a && 'storage_path' in a) {
            paths.push(String((a as { storage_path: string }).storage_path));
          }
        }
        if (paths.length > 0) {
          await admin.storage.from(bucket).remove(paths);
        }
      }
    }

    const { error } = await admin.from('submissions').delete().eq('id', id);
    if (error) {
      console.error('[admin/submission] DELETE', error);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    await writeAuditLog({
      actor_email: consultant.email,
      action: 'submission_delete',
      submission_id: id,
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/submission] DELETE exception', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
