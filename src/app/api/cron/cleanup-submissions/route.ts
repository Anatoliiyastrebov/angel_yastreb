import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export const runtime = 'nodejs';

/** Deletes submissions older than RETENTION_DAYS (default 90). Invoke via Vercel Cron with Authorization: Bearer CRON_SECRET */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = Number(process.env.SUBMISSION_RETENTION_DAYS);
  const retention = Number.isFinite(days) && days > 0 ? days : 90;
  const cutoff = new Date(Date.now() - retention * 24 * 60 * 60 * 1000).toISOString();

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('submissions').delete().lt('created_at', cutoff);

    if (error) {
      console.error('[cron] cleanup failed', error);
      return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }

    console.info('[cron] deleted submissions with created_at before', cutoff);
    return NextResponse.json({ ok: true, cutoff });
  } catch (e) {
    console.error('[cron] cleanup exception', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
