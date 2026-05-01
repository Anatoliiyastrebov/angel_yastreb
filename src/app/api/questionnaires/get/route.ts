import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { verifySessionToken } from '@/lib/server/verify-session-token';
import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export const runtime = 'nodejs';

function decrypt(encryptedText: string, encryptionKey: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function GET(req: NextRequest) {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    console.error('ENCRYPTION_KEY missing');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const sessionToken = req.nextUrl.searchParams.get('sessionToken');
  if (!sessionToken) {
    return NextResponse.json({ error: 'Session token required' }, { status: 401 });
  }

  const session = await verifySessionToken(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: questionnaireRows, error } = await supabase
      .from('questionnaires')
      .select('encrypted_data')
      .eq('contact_identifier', session.contact)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('[questionnaires/get]', error);
      return NextResponse.json({ error: 'Failed to fetch questionnaires' }, { status: 500 });
    }

    const questionnaires: unknown[] = [];
    for (const row of questionnaireRows || []) {
      try {
        const decrypted = decrypt(row.encrypted_data as string, ENCRYPTION_KEY);
        questionnaires.push(JSON.parse(decrypted));
      } catch (err) {
        console.error('[questionnaires/get] decrypt error', err);
      }
    }

    return NextResponse.json({
      success: true,
      questionnaires,
    });
  } catch (e) {
    console.error('[questionnaires/get]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
