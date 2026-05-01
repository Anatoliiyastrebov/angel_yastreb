import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export const runtime = 'nodejs';

/** Saves private chat ids when users message the bot (OTP flow). Always returns 200 so Telegram does not retry. */
export async function POST(req: NextRequest) {
  try {
    const update = await req.json().catch(() => ({}));

    const message = update.message || update.edited_message;
    if (message && message.from) {
      const chatType = message.chat.type;
      const chatId = message.chat.id.toString();
      const userId = message.from.id.toString();
      const username = message.from.username?.toLowerCase() || null;
      const firstName = message.from.first_name || null;
      const lastName = message.from.last_name || null;

      if (chatType === 'private' && username) {
        try {
          const supabase = getSupabaseAdmin();
          const { error } = await supabase.from('telegram_chat_ids').upsert(
            {
              contact_identifier: username,
              chat_id: chatId,
              user_id: userId,
              username: message.from.username,
              first_name: firstName,
              last_name: lastName,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'contact_identifier' }
          );

          if (error) console.error('Error saving telegram chat_id:', error);
          else console.log(`Saved private chat_id ${chatId} for user @${username}`);
        } catch (supabaseError: unknown) {
          console.error('Supabase configuration error in webhook:', supabaseError);
        }
      } else if (chatType !== 'private') {
        console.log(`Ignoring non-private chat message (type: ${chatType})`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Error processing Telegram webhook:', error);
    return NextResponse.json({ ok: true });
  }
}
