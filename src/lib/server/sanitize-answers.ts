import 'server-only';

const MAX_DEPTH = 12;
const MAX_STRING = 50_000;
const MAX_KEYS = 400;

function sanitizeValue(val: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return null;
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    return val.slice(0, MAX_STRING);
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  if (typeof val === 'boolean') return val;
  if (Array.isArray(val)) {
    return val.slice(0, 200).map((v) => sanitizeValue(v, depth + 1));
  }
  if (typeof val === 'object') {
    const out: Record<string, unknown> = {};
    const entries = Object.entries(val as Record<string, unknown>).slice(0, MAX_KEYS);
    for (const [k, v] of entries) {
      const key = String(k).slice(0, 200);
      out[key] = sanitizeValue(v, depth + 1);
    }
    return out;
  }
  return null;
}

/** Strip oversized / nested junk before persistence (DoS mitigation). */
export function sanitizeAnswersJson(input: unknown): Record<string, unknown> {
  const o = sanitizeValue(input, 0);
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    return o as Record<string, unknown>;
  }
  return {};
}
