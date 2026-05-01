import 'server-only';

export async function verifyTurnstileToken(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return true;
  }
  if (!token || typeof token !== 'string') {
    return false;
  }

  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch (err) {
    console.error('[turnstile] verify failed', err);
    return false;
  }
}
