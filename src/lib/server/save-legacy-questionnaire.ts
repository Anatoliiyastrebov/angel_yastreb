import 'server-only';

import crypto from 'crypto';

import { verifySessionToken } from '@/lib/server/verify-session-token';
import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

function encrypt(text: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export async function saveLegacyQuestionnaire(body: {
  sessionToken?: string;
  questionnaire?: Record<string, unknown>;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    console.error('ENCRYPTION_KEY environment variable is required');
    return { status: 500, body: { error: 'Server configuration error. ENCRYPTION_KEY is not set.' } };
  }

  try {
    const { sessionToken, questionnaire } = body;

    if (!questionnaire || typeof questionnaire.id !== 'string') {
      return { status: 400, body: { error: 'Questionnaire data required' } };
    }

    let contactIdentifier: string;
    let contactType: string;

    if (sessionToken) {
      const session = await verifySessionToken(sessionToken);
      if (!session) {
        return { status: 401, body: { error: 'Invalid or expired session' } };
      }
      contactIdentifier = session.contact;
      contactType = session.contactType;
    } else {
      const cd = questionnaire.contactData as Record<string, string> | undefined;
      if (!cd) {
        return { status: 400, body: { error: 'Contact data required when not authenticated' } };
      }
      const { telegram, phone } = cd;

      if (phone && phone.trim()) {
        contactIdentifier = phone.trim().replace(/[\s\-()+]/g, '');
        contactType = 'phone';
      } else if (telegram && telegram.trim()) {
        contactIdentifier = telegram.trim().replace(/^@/, '').toLowerCase();
        contactType = 'telegram';
      } else {
        return { status: 400, body: { error: 'Phone or Telegram is required in contact data' } };
      }
    }

    const encryptedData = encrypt(JSON.stringify(questionnaire), ENCRYPTION_KEY);

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (supabaseError: unknown) {
      console.error('Supabase configuration error:', supabaseError);
      return {
        status: 500,
        body: {
          error:
            'Server configuration error. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.',
        },
      };
    }

    const { data: existing } = await supabase
      .from('questionnaires')
      .select('id')
      .eq('contact_identifier', contactIdentifier)
      .eq('questionnaire_id', questionnaire.id)
      .single();

    if (existing) {
      const { error: updateError } = await supabase
        .from('questionnaires')
        .update({
          encrypted_data: encryptedData,
          questionnaire_type: questionnaire.type,
          language: questionnaire.language,
          submitted_at: questionnaire.submittedAt || Date.now(),
          telegram_message_id: questionnaire.telegramMessageId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating questionnaire:', updateError);
        return { status: 500, body: { error: 'Failed to update questionnaire' } };
      }
    } else {
      const { error: insertError } = await supabase.from('questionnaires').insert({
        questionnaire_id: questionnaire.id,
        contact_identifier: contactIdentifier,
        contact_type: contactType,
        encrypted_data: encryptedData,
        questionnaire_type: questionnaire.type,
        language: questionnaire.language,
        submitted_at: questionnaire.submittedAt || Date.now(),
        telegram_message_id: questionnaire.telegramMessageId ?? null,
      });

      if (insertError) {
        console.error('Error saving questionnaire:', insertError);
        return { status: 500, body: { error: 'Failed to save questionnaire' } };
      }
    }

    return { status: 200, body: { success: true, id: questionnaire.id } };
  } catch (error: unknown) {
    console.error('Error saving questionnaire:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('Supabase URL and Service Role Key')) {
      return {
        status: 500,
        body: { error: 'Server configuration error. Please check environment variables.' },
      };
    }

    return { status: 500, body: { error: 'Internal server error' } };
  }
}
