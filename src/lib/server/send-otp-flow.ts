import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export async function sendOtpFlow(body: {
  telegram?: string;
  phone?: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  try {
    const { telegram, phone } = body;

    if (!telegram && !phone) {
      return { status: 400, body: { error: 'Telegram or phone is required' } };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const contactIdentifier = telegram ? telegram.trim().replace(/^@/, '').toLowerCase() : phone?.trim().replace(/[\s\-\(\)]/g, '') || '';
    const contactType = telegram ? 'telegram' : 'phone';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean expired OTPs first
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
    
    // Clean expired OTPs (ignore errors - this is just cleanup)
    try {
      await supabase.rpc('clean_expired_otp');
    } catch (rpcError) {
      console.warn('Could not clean expired OTPs:', rpcError);
    }

    // Delete any existing OTP for this contact
    try {
      await supabase
        .from('otp_codes')
        .delete()
        .eq('contact_identifier', contactIdentifier);
    } catch (deleteError) {
      console.warn('Could not delete existing OTP:', deleteError);
      // Continue anyway - we'll insert new OTP
    }

    // Store OTP in Supabase
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        contact_identifier: contactIdentifier,
        contact_type: contactType,
        code: otp,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      // Log error server-side only, don't expose details to client
      console.error('Error storing OTP:', insertError);
      return { status: 500, body: { error: 'Failed to store OTP' } };
    }

    // Send OTP via Telegram Bot API
    let chatId: string | null = null;
    let otpSent = false;
    
    if (contactType === 'telegram' && telegram) {
      const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
      
      if (BOT_TOKEN) {
        try {
          // Remove @ if present and normalize username
          const telegramUsername = telegram.trim().replace(/^@/, '').toLowerCase();
          
          // Try to find chat_id and user_id from database (saved via webhook when user messages bot in private chat)
          let userId: string | null = null;
          try {
            const { data: chatIdData, error: chatIdError } = await supabase
              .from('telegram_chat_ids')
              .select('chat_id, user_id')
              .eq('contact_identifier', telegramUsername)
              .maybeSingle(); // Use maybeSingle instead of single to avoid error if no row found
            
            if (!chatIdError && chatIdData) {
              // ONLY use user_id for private messages - never use chat_id alone as it might be a group
              // If user_id is not set, we need to find it via getUpdates (only private chats)
              if (chatIdData.user_id) {
                userId = chatIdData.user_id;
                chatId = chatIdData.chat_id; // Keep for reference but don't use for sending
              } else {
                // Old record without user_id - might be from group, so ignore it and search via getUpdates
                console.warn(`Found chat_id for @${telegramUsername} but no user_id - might be from group. Searching for private chat...`);
                userId = null;
                chatId = null;
              }
            } else if (chatIdError && chatIdError.code !== 'PGRST116') {
              // PGRST116 is "not found" error, which is expected - log other errors
              console.warn('Error fetching chat_id from database:', chatIdError);
            }
          } catch (dbError: unknown) {
            // Table might not exist if migration not applied - this is OK, we'll use fallback
            const err =
              dbError && typeof dbError === 'object'
                ? (dbError as { code?: string; message?: string })
                : {};
            if (err.code === '42P01' || err.message?.includes('does not exist')) {
              console.warn('telegram_chat_ids table does not exist - migration may not be applied. Using fallback method.');
            } else {
              console.warn('Could not fetch chat_id from database:', dbError);
            }
          }
          
          // Fallback: Try to get chat_id from bot's recent updates
          // This is a backup method if webhook hasn't saved it yet
          if (!chatId) {
            try {
              const updatesResponse = await fetch(
                `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=100`,
                {
                  method: 'GET',
                }
              );
              const updatesData = await updatesResponse.json();
              
              if (updatesData.ok && updatesData.result && Array.isArray(updatesData.result)) {
                // Search for user in recent updates (check last 100 messages)
                // Only use PRIVATE chats to ensure OTP goes to personal messages
                for (const update of updatesData.result) {
                  const message = update.message || update.edited_message;
                  const chatType = message?.chat?.type;
                  
                  // Only process private chats
                  if (message?.from?.username?.toLowerCase() === telegramUsername && chatType === 'private') {
                    const foundChatId = message.chat.id.toString();
                    const foundUserId = message.from.id.toString();
                    
                    // Use user_id for sending (more reliable for private messages)
                    userId = foundUserId;
                    chatId = foundChatId;
                    
                    // Save to database for future use
                    try {
                      const { error: saveError } = await supabase
                        .from('telegram_chat_ids')
                        .upsert({
                          contact_identifier: telegramUsername,
                          chat_id: foundChatId,
                          user_id: foundUserId,
                          username: message.from.username,
                          first_name: message.from.first_name || null,
                          last_name: message.from.last_name || null,
                        }, {
                          onConflict: 'contact_identifier',
                        });
                      
                      if (saveError) {
                        // Table might not exist if migration not applied - this is OK
                        if (saveError.code === '42P01' || saveError.message?.includes('does not exist')) {
                          console.warn('telegram_chat_ids table does not exist - migration may not be applied.');
                        } else {
                          console.warn('Could not save chat_id to database:', saveError);
                        }
                      }
                    } catch (saveError: unknown) {
                      const se =
                        saveError && typeof saveError === 'object'
                          ? (saveError as { code?: string; message?: string })
                          : {};
                      if (se.code === '42P01' || se.message?.includes('does not exist')) {
                        console.warn('telegram_chat_ids table does not exist - migration may not be applied.');
                      } else {
                        console.warn('Could not save chat_id to database:', saveError);
                      }
                    }
                    
                    break;
                  }
                }
              }
            } catch (updatesError) {
              console.warn('Could not fetch bot updates to find chat_id:', updatesError);
            }
          }
          
          // ONLY send if we have user_id (guaranteed to be private chat)
          // Never use chat_id alone as it might be a group ID
          if (userId) {
            try {
              const telegramResponse = await fetch(
                `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: userId,
                    text: [
                      `Ваш код подтверждения: *${otp}*`,
                      'Действителен 10 минут.',
                      '',
                      `Your verification code: *${otp}*`,
                      'Valid for 10 minutes.',
                      '',
                      `Ihr Bestätigungscode: *${otp}*`,
                      '10 Minuten gültig.',
                    ].join('\n'),
                    parse_mode: 'Markdown',
                  }),
                }
              );

              const telegramData = await telegramResponse.json();
              
              if (telegramData.ok) {
                otpSent = true;
                console.log(`OTP sent successfully to private chat (user_id: ${userId})`);
              } else {
                console.error('Telegram API error when sending OTP:', telegramData);
              }
            } catch (sendError) {
              console.error('Error sending message to Telegram:', sendError);
            }
          } else {
            // No chat_id found - user needs to start conversation with bot first in PRIVATE chat
            console.warn(`Could not find private chat_id for @${telegramUsername}. User needs to start a PRIVATE conversation with bot first (not in a group).`);
            // OTP is still stored in database, user can contact admin if needed
          }
        } catch (telegramError) {
          // Log but don't fail - OTP is stored and can be retrieved manually if needed
          console.error('Error sending OTP via Telegram:', telegramError);
        }
      } else {
        console.warn('TELEGRAM_BOT_TOKEN / VITE_TELEGRAM_BOT_TOKEN not set - OTP not sent via Telegram');
      }
    }
    
    // For phone numbers, SMS sending would require integration with Twilio, AWS SNS, etc.
    // For now, phone OTP codes are stored in database but not sent automatically
    if (contactType === 'phone') {
      console.log(`OTP for phone ${contactIdentifier}: ${otp} (SMS sending not implemented - requires Twilio/AWS SNS integration)`);
    }
    
    return {
      status: 200,
      body: {
        success: true,
        message:
          contactType === 'telegram'
            ? otpSent
              ? 'OTP sent successfully. Please check your Telegram messages.'
              : 'OTP generated successfully. To receive the code, please find the bot in Telegram and send it /start (or any message), then try requesting the code again.'
            : 'OTP generated successfully. SMS sending is not yet implemented.',
      },
    };
  } catch (error: unknown) {
    console.error('Error sending OTP:', error);
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
