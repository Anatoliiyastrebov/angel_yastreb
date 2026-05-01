import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

/** OTP-based session from legacy "My questionnaires" flow (data-request page). */
export async function verifySessionToken(
  token: string
): Promise<{ contact: string; contactType: string } | null> {
  try {
    const supabase = getSupabaseAdmin();

    try {
      await supabase.rpc('clean_expired_sessions');
    } catch {
      /* ignore */
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .select('contact_identifier, contact_type, expires_at')
      .eq('session_token', token)
      .single();

    if (error || !session) return null;

    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('sessions').delete().eq('session_token', token);
      return null;
    }

    await supabase
      .from('sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('session_token', token);

    return {
      contact: session.contact_identifier,
      contactType: session.contact_type,
    };
  } catch (err) {
    console.error('[session] verify failed', err);
    return null;
  }
}
