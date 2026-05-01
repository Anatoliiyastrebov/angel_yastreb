import { NextRequest, NextResponse } from 'next/server';

import { getConsultantUser } from '@/lib/server/admin-access';
import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const consultant = await getConsultantUser();
  if (!consultant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const status = searchParams.get('status');
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

  try {
    const admin = getSupabaseAdmin();
    let query = admin
      .from('submissions')
      .select(
        'id, created_at, updated_at, name, phone, status, processed_at, questionnaire_type, language',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === 'new' || status === 'processed') {
      query = query.eq('status', status);
    }

    if (q) {
      const safe = q.replace(/%/g, '').replace(/_/g, '').slice(0, 80);
      const pattern = `%${safe}%`;
      query = query.or(`name.ilike.${pattern},phone.ilike.${pattern}`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[admin/submissions] list error', error);
      return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }

    return NextResponse.json({ submissions: data ?? [], total: count ?? 0 });
  } catch (e) {
    console.error('[admin/submissions] GET exception', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
