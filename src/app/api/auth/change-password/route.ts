import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, clearSessionCookie } from '@/lib/session';
import { hashPassword, verifyPassword, validateNewPassword } from '@/lib/password';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        // 1. CSRF Protection: verify Origin / Referer against Host
        const host = req.headers.get('host');
        const origin = req.headers.get('origin');
        const referer = req.headers.get('referer');

        if (origin) {
            try {
                const originHost = new URL(origin).host;
                if (originHost !== host) {
                    return NextResponse.json({ error: 'Forbidden: CSRF validation failed.' }, { status: 403 });
                }
            } catch {
                return NextResponse.json({ error: 'Forbidden: Invalid origin.' }, { status: 403 });
            }
        } else if (referer) {
            try {
                const refererHost = new URL(referer).host;
                if (refererHost !== host) {
                    return NextResponse.json({ error: 'Forbidden: CSRF validation failed.' }, { status: 403 });
                }
            } catch {
                return NextResponse.json({ error: 'Forbidden: Invalid referer.' }, { status: 403 });
            }
        }

        // 2. Validate current signed session
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized. Please sign in to change your password.' }, { status: 401 });
        }

        // Determine rate limit identifier (user ID + IP)
        const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
        const clientIp = forwardedFor || 'unknown-ip';
        const rateLimitKey = `pwd_chg:${userId}:${clientIp}`;

        // 3. Apply shared, persistent rate limiting (suitable for Vercel lambdas)
        const limitCheck = await checkRateLimit(rateLimitKey);
        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: `Too many password change attempts. Please try again in ${Math.ceil((limitCheck.retryAfterSec || 60) / 60)} minutes.`
            }, { status: 429 });
        }

        // 4. Parse and validate input payload
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
        }

        const { currentPassword, newPassword, confirmPassword } = (body || {}) as Record<string, unknown>;

        if (!currentPassword || typeof currentPassword !== 'string') {
            return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
        }

        const validation = validateNewPassword(newPassword, confirmPassword, currentPassword);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // 5. Look up user and verify current password
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
        }

        const isCurrentValid = await verifyPassword(currentPassword, user.password);
        if (!isCurrentValid) {
            await recordFailedAttempt(rateLimitKey);
            return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
        }

        // Reset rate limiter on successful current password verification
        await clearRateLimit(rateLimitKey);

        // 6. Securely hash the new password using bcrypt (enforces <= 72 bytes)
        const hashedNewPassword = await hashPassword(newPassword as string);

        // 7. Update database: save new password hash and increment tokenVersion
        // Incrementing tokenVersion invalidates all sessions previously issued to this account
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedNewPassword,
                tokenVersion: { increment: 1 }
            }
        });

        // 8. Invalidate current session cookie
        await clearSessionCookie();

        return NextResponse.json({
            success: true,
            message: 'Your password has been changed successfully. All other active sessions have been revoked. Please sign in again with your new password.'
        });
    } catch (error) {
        // Never log passwords, tokens, or hashes
        console.error('Password change error:', (error as Error)?.message || 'Unknown error');
        return NextResponse.json({ error: 'An unexpected error occurred while changing password. Please try again.' }, { status: 500 });
    }
}
