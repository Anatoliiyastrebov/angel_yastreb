import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/server/verify-session-token';
import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json();

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 401 });
    }

    const session = await verifySessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
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

    const { data: existingRequest } = await supabase
      .from('gdpr_requests')
      .select('id, status, scheduled_delete_at')
      .eq('profile_id', session.contact)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json({
        success: true,
        message: 'GDPR deletion request already exists',
        requestId: existingRequest.id,
        scheduledDeleteAt: existingRequest.scheduled_delete_at,
        status: existingRequest.status,
      });
    }

    const { data: newRequest, error: insertError } = await supabase
      .from('gdpr_requests')
      .insert({
        profile_id: session.contact,
        status: 'pending',
      })
      .select('id, created_at, scheduled_delete_at, status')
      .single();

    if (insertError) {
      console.error('Error creating GDPR request:', insertError);
      return NextResponse.json({ error: 'Failed to create GDPR deletion request' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message:
        'GDPR deletion request created successfully. Your data will be deleted in 7 days (1 week). Only questionnaires older than 1 week will be deleted.',
      requestId: newRequest.id,
      createdAt: newRequest.created_at,
      scheduledDeleteAt: newRequest.scheduled_delete_at,
      status: newRequest.status,
    });
  } catch (error: unknown) {
    console.error('Error creating GDPR request:', error);
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
