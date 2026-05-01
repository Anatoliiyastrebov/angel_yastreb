import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/server/verify-session-token';
import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
  try {
    const { sessionToken, questionnaireId } = await req.json();

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 401 });
    }

    const session = await verifySessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    if (!questionnaireId) {
      return NextResponse.json({ error: 'Questionnaire ID required' }, { status: 400 });
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e: unknown) {
      console.error('Supabase configuration error:', e);
      return NextResponse.json(
        {
          error:
            'Server configuration error. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.',
        },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('questionnaires')
      .delete()
      .eq('contact_identifier', session.contact)
      .eq('questionnaire_id', questionnaireId)
      .select();

    if (error) {
      console.error('Error deleting questionnaire:', error);
      return NextResponse.json({ error: 'Failed to delete questionnaire' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting questionnaire:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('Supabase URL and Service Role Key')) {
      return NextResponse.json(
        { error: 'Server configuration error. Please check environment variables.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
