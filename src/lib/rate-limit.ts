import { prisma } from '@/lib/db';

export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const AUTH_RATE_LIMITS = {
    // Brute-force credential stuffing / spray defense per network IP: 20 failed attempts in 15m
    LOGIN_PER_IP: { max: 20, windowMs: 15 * 60 * 1000 },
    // Targeted account guessing defense per IP + Account: 5 failed attempts in 15m
    LOGIN_PAIR: { max: 5, windowMs: 15 * 60 * 1000 },
    // Distributed botnet attack defense on single account: 25 failed attempts in 15m across all IPs
    LOGIN_ACCOUNT: { max: 25, windowMs: 15 * 60 * 1000 },
    // Automated mass-registration defense per IP: 5 accounts created in 60m
    SIGNUP_PER_IP: { max: 5, windowMs: 60 * 60 * 1000 },
    // Password change defense per user account: 5 attempts in 15m
    PASSWORD_CHANGE: { max: 5, windowMs: 15 * 60 * 1000 },
};

/**
 * Extracts and sanitizes the client IP address from request headers.
 * Evaluates Vercel Edge proxy headers (x-vercel-forwarded-for, x-real-ip)
 * followed by standard x-forwarded-for. Validates IPv4/IPv6 structure.
 */
export function getClientIp(req: Request): string {
    try {
        const vercelIp = req.headers.get('x-vercel-forwarded-for');
        if (vercelIp && isValidIp(vercelIp.trim())) {
            return vercelIp.trim();
        }

        const realIp = req.headers.get('x-real-ip');
        if (realIp && isValidIp(realIp.trim())) {
            return realIp.trim();
        }

        const forwardedFor = req.headers.get('x-forwarded-for');
        if (forwardedFor) {
            // First address in X-Forwarded-For is the originating client IP
            const firstIp = forwardedFor.split(',')[0].trim();
            if (isValidIp(firstIp)) {
                return firstIp;
            }
        }
    } catch {
        // Fallback below
    }

    return 'unknown-ip';
}

/**
 * Validates that an IP string is a plausible IPv4 or IPv6 address.
 */
function isValidIp(ip: string): boolean {
    if (!ip || ip.length > 45) return false;
    // Standard IPv4 or IPv6 regex
    const ipv4 = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    const ipv6 = /^[0-9a-fA-F:]+$/;
    return ipv4.test(ip) || (ipv6.test(ip) && ip.includes(':'));
}

/**
 * Normalizes email addresses consistently for lookup and rate-limiting keys.
 */
export function normalizeEmail(email: string): string {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/**
 * Checks whether an action identified by key has exceeded its rate limit.
 * Reads from the shared PostgreSQL database so rate limits persist across all Vercel serverless lambdas.
 */
export async function checkRateLimit(
    key: string,
    maxAttempts: number = RATE_LIMIT_MAX_ATTEMPTS
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
    try {
        const now = new Date();
        const entry = await prisma.authRateLimit.findUnique({
            where: { key }
        });

        if (!entry || entry.expiresAt <= now) {
            return { allowed: true };
        }

        if (entry.count >= maxAttempts) {
            const retryAfterSec = Math.max(1, Math.ceil((entry.expiresAt.getTime() - now.getTime()) / 1000));
            return { allowed: false, retryAfterSec };
        }

        return { allowed: true };
    } catch (e) {
        console.error('Rate limit check error:', (e as Error)?.message || 'Database error');
        // Fail open for transient DB error so user is not locked out of service
        return { allowed: true };
    }
}

/**
 * Records an attempt for the given key in the persistent PostgreSQL rate limit store.
 */
export async function recordFailedAttempt(
    key: string,
    windowMs: number = RATE_LIMIT_WINDOW_MS
): Promise<void> {
    try {
        const now = new Date();
        const expiresAt = new Date(Date.now() + windowMs);

        const entry = await prisma.authRateLimit.findUnique({ where: { key } });

        if (!entry || entry.expiresAt <= now) {
            await prisma.authRateLimit.upsert({
                where: { key },
                create: { key, count: 1, expiresAt },
                update: { count: 1, expiresAt }
            });
        } else {
            await prisma.authRateLimit.update({
                where: { key },
                data: { count: { increment: 1 } }
            });
        }

        // Opportunistic cleanup of expired records (10% sample rate)
        if (Math.random() < 0.1) {
            prisma.authRateLimit.deleteMany({
                where: { expiresAt: { lte: now } }
            }).catch(() => {});
        }
    } catch (e) {
        console.error('Failed to record rate limit attempt:', (e as Error)?.message || 'Database error');
    }
}

/**
 * Clears the rate limit record for a key upon successful verification.
 */
export async function clearRateLimit(key: string): Promise<void> {
    try {
        await prisma.authRateLimit.delete({ where: { key } });
    } catch {
        // Ignore if row doesn't exist
    }
}
