import type { NextFunction, Request, Response } from 'express';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  getKeySuffix?: (req: Request) => string;
}

interface BucketEntry {
  timestamps: number[];
}

const buckets = new Map<string, BucketEntry>();

// Periodic cleanup of expired rate-limit buckets every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, entry] of buckets.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    if (entry.timestamps.length === 0) {
      buckets.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

export function createRateLimiter(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const windowStart = now - options.windowMs;
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp =
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : req.ip || 'unknown';
    const suffix = options.getKeySuffix ? `:${options.getKeySuffix(req)}` : '';
    const key = `${options.keyPrefix}:${clientIp}${suffix}`;

    const entry = buckets.get(key) ?? { timestamps: [] };
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= options.maxRequests) {
      const oldest = entry.timestamps[0] ?? now;
      const retryAfterSec = Math.max(
        1,
        Math.ceil((oldest + options.windowMs - now) / 1000),
      );
      res.setHeader('Retry-After', String(retryAfterSec));
      res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      return res.status(429).json({
        error: `Rate limit exceeded. Please wait ${retryAfterSec}s before trying again.`,
      });
    }

    entry.timestamps.push(now);
    buckets.set(key, entry);

    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(0, options.maxRequests - entry.timestamps.length)),
    );
    return next();
  };
}
