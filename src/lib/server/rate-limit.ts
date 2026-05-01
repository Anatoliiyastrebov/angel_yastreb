import 'server-only';

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 20; // per IP per window (public form; tune via env)

function maxRequests(): number {
  const n = Number(process.env.PUBLIC_SUBMISSION_RATE_LIMIT_PER_HOUR);
  return Number.isFinite(n) && n > 0 ? n : MAX_REQUESTS;
}

export function rateLimitSubmission(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const limit = maxRequests();
  let e = buckets.get(ip);
  if (!e || now > e.resetAt) {
    e = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(ip, e);
    return { ok: true };
  }
  if (e.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((e.resetAt - now) / 1000) };
  }
  e.count += 1;
  return { ok: true };
}
