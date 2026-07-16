// Fixed-window in-memory rate limiter for magic-link requests (§4.2).
// Single-region deployment makes an in-memory Map acceptable — no Redis.

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function hit(key: string, limit: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export function checkMagicLinkRateLimit(email: string, ip: string): boolean {
  const emailOk = hit(`email:${email.toLowerCase().trim()}`, 3);
  const ipOk = hit(`ip:${ip}`, 20);
  return emailOk && ipOk;
}
