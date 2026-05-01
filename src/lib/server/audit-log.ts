import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export async function writeAuditLog(entry: {
  actor_email: string;
  action: string;
  submission_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (process.env.ADMIN_AUDIT_LOG_ENABLED !== 'true') {
    return;
  }

  try {
    const admin = getSupabaseAdmin();
    await admin.from('admin_audit_logs').insert({
      actor_email: entry.actor_email,
      action: entry.action,
      submission_id: entry.submission_id ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (err) {
    console.error('[audit] insert failed', err);
  }
}
