import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { telegram, phone, otp } = await req.json();

    if (!otp) {
      return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
    }

    if (!telegram && !phone) {
      return NextResponse.json({ error: 'Telegram or phone is required' }, { status: 400 });
    }

    const contactIdentifier = telegram
      ? telegram.trim().replace(/^@/, '').toLowerCase()
      : phone?.trim().replace(/[\s\-()+]/g, '') || '';
    const contactType = telegram ? 'telegram' : 'phone';

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (supabaseError: unknown) {
      console.error('Supabase configuration error:', supabaseError);
      return NextResponse.json(
        {
          error:
            'Server configuration error. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.',
        },
        { status: 500 }
      );
    }

    await supabase.rpc('clean_expired_otp');

    const { data: otpData, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('contact_identifier', contactIdentifier)
      .eq('code', otp)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    if (new Date(otpData.expires_at) < new Date()) {
      await supabase.from('otp_codes').delete().eq('id', otpData.id);
      return NextResponse.json({ error: 'OTP expired' }, { status: 400 });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await supabase.rpc('clean_expired_sessions');

    const { error: sessionError } = await supabase.from('sessions').insert({
      session_token: sessionToken,
      contact_identifier: contactIdentifier,
      contact_type: contactType,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    await supabase.from('otp_codes').delete().eq('id', otpData.id);

    return NextResponse.json({
      success: true,
      sessionToken,
      expiresAt: expiresAt.getTime(),
    });
  } catch (error: unknown) {
    console.error('Error verifying OTP:', error);
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
