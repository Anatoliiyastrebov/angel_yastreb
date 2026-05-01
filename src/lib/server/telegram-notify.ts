import 'server-only';

import type { QuestionnaireType } from '@/lib/questionnaire-data';

function botToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
}

function chatId(): string | undefined {
  return process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID;
}

/** Russian labels for consultants (Telegram preview only). */
const QUESTIONNAIRE_RU: Record<QuestionnaireType, string> = {
  infant: 'для младенцев',
  child: 'детская',
  woman: 'женская',
  man: 'мужская',
};

function normalizeHttpUrl(raw: string): string {
  const u = raw.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u.replace(/^\/\//, '')}`;
}

/**
 * Ссылка в Telegram для localhost почти никогда не кликабельна на телефоне.
 * Задайте TELEGRAM_PUBLIC_APP_URL=https://ваш-домен.vercel.app (или ngrok) — подставится только в уведомлениях.
 */
function effectiveConsultantUrl(dashboardUrl: string): string {
  const normalized = normalizeHttpUrl(dashboardUrl);
  let pub = (process.env.TELEGRAM_PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
  if (!pub) return normalized;
  if (!/^https?:\/\//i.test(pub)) pub = `https://${pub}`;
  try {
    const pathWithQuery = new URL(normalized).pathname + new URL(normalized).search;
    return `${new URL(pub).origin}${pathWithQuery}`;
  } catch {
    return normalized;
  }
}

function buildPlainText(params: {
  submissionId: string;
  questionnaireType: QuestionnaireType;
  patientDisplayName: string;
  openUrl: string;
}): string {
  const typeRuRaw = QUESTIONNAIRE_RU[params.questionnaireType] ?? params.questionnaireType;
  const typeRu =
    typeRuRaw.length > 0 ? typeRuRaw.charAt(0).toUpperCase() + typeRuRaw.slice(1) : typeRuRaw;
  const patient =
    params.patientDisplayName.replace(/\s+/g, ' ').trim() || 'Имя не указано';

  // Без parse_mode: Telegram сам делает кликабельным голый URL на отдельной строке (http/https).
  return (
    `Новая анкета\n` +
    `Тип: ${typeRu}\n\n` +
    `Клиент: ${patient}\n\n` +
    `Номер заявки:\n${params.submissionId}\n\n` +
    `Ссылка на эту анкету в панели консультанта:\n${params.openUrl}`
  );
}

/**
 * Короткое уведомление консультанту: тип, клиент, UUID, явная кликабельная ссылка (plain URL + при возможности кнопка).
 */
export async function sendSubmissionNotification(params: {
  submissionId: string;
  dashboardUrl: string;
  questionnaireType: QuestionnaireType;
  patientDisplayName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const token = botToken();
  const cid = chatId();
  if (!token || !cid) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set; skipping notification');
    return { ok: true };
  }

  const openUrl = effectiveConsultantUrl(params.dashboardUrl);
  if (
    /localhost|127\.0\.0\.1/i.test(openUrl) &&
    !(process.env.TELEGRAM_PUBLIC_APP_URL || '').trim()
  ) {
    console.warn(
      '[telegram] Ссылка в уведомлении указывает на localhost — в Telegram на телефоне она часто не открывается. Задайте TELEGRAM_PUBLIC_APP_URL=https://ваш-публичный-домен'
    );
  }
  const text = buildPlainText({
    submissionId: params.submissionId,
    questionnaireType: params.questionnaireType,
    patientDisplayName: params.patientDisplayName,
    openUrl,
  });

  try {
    const sendOnce = async (withButton: boolean) => {
      const body: Record<string, unknown> = {
        chat_id: cid,
        text,
        disable_web_page_preview: true,
      };
      if (withButton) {
        body.reply_markup = {
          inline_keyboard: [[{ text: 'Открыть анкету в панели', url: openUrl }]],
        };
      }
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return (await res.json()) as { ok?: boolean; description?: string };
    };

    let data = await sendOnce(true);
    if (!data.ok) {
      console.warn('[telegram] sendMessage with button failed, retry without keyboard', data.description);
      data = await sendOnce(false);
    }
    if (!data.ok) {
      console.error('[telegram] sendMessage failed', data.description);
      return { ok: false, error: data.description || 'Telegram API error' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[telegram] sendMessage exception', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Telegram error' };
  }
}
