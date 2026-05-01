import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server-auth';

export function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getConsultantUser(): Promise<{ email: string; id: string } | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email || !user.id) {
    return null;
  }

  const emails = parseAdminEmails();
  if (emails.length > 0 && !emails.includes(user.email.toLowerCase())) {
    return null;
  }

  return { email: user.email, id: user.id };
}
