interface Bucket {
  events: number[];
}

const buckets = new Map<string, Bucket>();

/**
 * Trivialer Prozess-lokaler Sliding-Window-Limiter. Für produktive
 * horizontale Skalierung durch Redis-basiertes Limit ersetzen.
 */
export function rateLimit(bucketKey: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = buckets.get(bucketKey) ?? { events: [] };
  bucket.events = bucket.events.filter((t) => t >= cutoff);
  if (bucket.events.length >= limit) {
    buckets.set(bucketKey, bucket);
    return false;
  }
  bucket.events.push(now);
  buckets.set(bucketKey, bucket);
  return true;
}
