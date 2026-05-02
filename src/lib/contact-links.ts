/**
 * Safe tel:/https:/mailto:/viber: URLs for questionnaire contacts.
 * Output is embedded in HTML used with Telegram parse_mode HTML and admin preview.
 */

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Display string like +49… → tel:+49… */
export function phoneToTelHref(display: string): string | null {
  const digits = display.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return `tel:+${digits}`;
}

export function telegramToHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const host = u.hostname.replace(/^www\./i, '').toLowerCase();
      if (host === 't.me' || host === 'telegram.me' || host === 'telegram.dog') {
        const seg = u.pathname.replace(/^\//, '').split('/')[0];
        if (!seg) return null;
        return `https://${host}/${encodeURIComponent(seg)}`;
      }
      return null;
    } catch {
      return null;
    }
  }
  const user = t.replace(/^@+/, '').trim();
  if (!/^[a-zA-Z0-9_]{3,64}$/.test(user)) return null;
  return `https://t.me/${encodeURIComponent(user)}`;
}

export function whatsappToHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (/^https?:\/\//i.test(t) || lower.includes('wa.me') || lower.includes('whatsapp.com')) {
    try {
      let urlStr = t;
      if (!/^https?:\/\//i.test(urlStr)) urlStr = `https://${urlStr.replace(/^\/\//, '')}`;
      const u = new URL(urlStr);
      const host = u.hostname.replace(/^www\./i, '').toLowerCase();
      if (host === 'wa.me') {
        const id = u.pathname.replace(/\//g, '').replace(/\D/g, '');
        if (id.length >= 8 && id.length <= 15) return `https://wa.me/${id}`;
      }
      if (host === 'api.whatsapp.com' || host.endsWith('.whatsapp.com')) {
        const p = u.searchParams.get('phone');
        if (p) {
          const id = p.replace(/\D/g, '');
          if (id.length >= 8 && id.length <= 15) return `https://wa.me/${id}`;
        }
      }
    } catch {
      /* fall through */
    }
  }
  const digits = t.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 15) return `https://wa.me/${digits}`;
  return null;
}

export function viberToHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      if (/viber\.com/i.test(u.hostname)) return u.href;
    } catch {
      return null;
    }
    return null;
  }
  const digits = t.replace(/\D/g, '');
  if (digits.length >= 8 && digits.length <= 15) {
    return `viber://chat?number=${encodeURIComponent(`+${digits}`)}`;
  }
  return null;
}

export function instagramToHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const host = u.hostname.replace(/^www\./i, '').toLowerCase();
      if (host === 'instagram.com' || host === 'instagr.am') {
        const path = u.pathname.replace(/\/$/, '');
        return `https://instagram.com${path}`;
      }
      return null;
    } catch {
      return null;
    }
  }
  const user = t.replace(/^@+/, '').trim();
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(user)) return null;
  return `https://instagram.com/${encodeURIComponent(user)}`;
}

export function vkToHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const host = u.hostname.replace(/^www\.|^m\./i, '').toLowerCase();
      if (host === 'vk.com' || host === 'vk.ru') {
        const path = u.pathname.replace(/\/$/, '');
        return `${u.protocol}//${u.hostname}${path}`;
      }
      return null;
    } catch {
      return null;
    }
  }
  const slug = t.replace(/^@+/, '').trim();
  if (!/^[a-zA-Z0-9._-]+$/.test(slug)) return null;
  return `https://vk.com/${encodeURIComponent(slug)}`;
}

export function emailToMailtoHref(email: string): string | null {
  const e = email.trim();
  if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return `mailto:${encodeURIComponent(e)}`;
}

/** Telegram HTML: bold label value; optionally wrap in <a href>. */
export function htmlLinkedBold(displayEscaped: string, href: string | null): string {
  if (!href) return `<b>${displayEscaped}</b>`;
  return `<a href="${escapeHtmlAttr(href)}"><b>${displayEscaped}</b></a>`;
}
