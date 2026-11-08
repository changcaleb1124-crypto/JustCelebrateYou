import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';
import { hashPassword, verifyAndUpgradePassword, verifyDummyPassword, getPasswordByteLength, BCRYPT_MAX_BYTES } from '@/lib/password';
import {
    getClientIp,
    normalizeEmail,
    checkRateLimit,
    recordFailedAttempt,
    clearRateLimit,
    AUTH_RATE_LIMITS,
} from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
        }

        const { email, password, name, isSignup } = (body || {}) as Record<string, unknown>;

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing required credentials' }, { status: 400 });
        }

        const normalizedEmail = normalizeEmail(String(email));
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
        }

        const clientIp = getClientIp(req);

        // --- SIGNUP FLOW ---
        if (isSignup) {
            const signupIpKey = `signup_ip:${clientIp}`;
            const signupLimit = await checkRateLimit(signupIpKey, AUTH_RATE_LIMITS.SIGNUP_PER_IP.max);
            if (!signupLimit.allowed) {
                const retrySec = signupLimit.retryAfterSec || 3600;
                return NextResponse.json(
                    {
                        error: `Too many account registrations from this network. Please try again in ${Math.ceil(retrySec / 60)} minutes.`,
                        retryAfter: retrySec,
                    },
                    {
                        status: 429,
                        headers: { 'Retry-After': String(retrySec) },
                    }
                );
            }

            const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (existingUser) {
                await recordFailedAttempt(signupIpKey, AUTH_RATE_LIMITS.SIGNUP_PER_IP.windowMs);
                return NextResponse.json({ error: 'Account already exists. Please log in.' }, { status: 400 });
            }

            if (!name || typeof name !== 'string' || name.trim() === '') {
                return NextResponse.json({ error: 'Name is required to sign up.' }, { status: 400 });
            }

            if (typeof password !== 'string' || password.length < 8) {
                return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
            }

            const passwordBytes = getPasswordByteLength(password);
            if (passwordBytes > BCRYPT_MAX_BYTES) {
                return NextResponse.json({
                    error: 'Your password is too long. Please shorten it. Some symbols and emoji count toward the limit more quickly.'
                }, { status: 400 });
            }

            const hashedPassword = await hashPassword(password);
            const user = await prisma.user.create({
                data: {
                    email: normalizedEmail,
                    password: hashedPassword,
                    name: name.trim(),
                    tokenVersion: 0,
                }
            });

            // Track successful signup against network IP quota
            await recordFailedAttempt(signupIpKey, AUTH_RATE_LIMITS.SIGNUP_PER_IP.windowMs);

            await setSessionCookie(user.id, user.tokenVersion ?? 0);

            return NextResponse.json({
                success: true,
                user: { id: user.id, email: user.email, name: user.name }
            }, { status: 201 });
        }

        // --- LOGIN FLOW ---
        const ipKey = `login_ip:${clientIp}`;
        const pairKey = `login_pair:${clientIp}:${normalizedEmail}`;
        const accountKey = `login_account:${normalizedEmail}`;

        // 1. Evaluate tiered rate limits: IP, IP+Account, and Global Account
        const [ipCheck, pairCheck, accountCheck] = await Promise.all([
            checkRateLimit(ipKey, AUTH_RATE_LIMITS.LOGIN_PER_IP.max),
            checkRateLimit(pairKey, AUTH_RATE_LIMITS.LOGIN_PAIR.max),
            checkRateLimit(accountKey, AUTH_RATE_LIMITS.LOGIN_ACCOUNT.max),
        ]);

        if (!ipCheck.allowed || !pairCheck.allowed || !accountCheck.allowed) {
            const maxRetrySec = Math.max(
                ipCheck.retryAfterSec || 0,
                pairCheck.retryAfterSec || 0,
                accountCheck.retryAfterSec || 0,
                60
            );
            return NextResponse.json(
                {
                    error: `Too many failed login attempts. Please try again in ${Math.ceil(maxRetrySec / 60)} minutes.`,
                    retryAfter: maxRetrySec,
                },
                {
                    status: 429,
                    headers: { 'Retry-After': String(maxRetrySec) },
                }
            );
        }

        // 2. Look up account by normalized email
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        // Generic error response to eliminate account enumeration
        const GENERIC_AUTH_ERROR = 'Invalid email or password';

        if (!user) {
            // Equalize CPU execution time to prevent response timing side-channel / user enumeration
            await verifyDummyPassword(String(password));

            // Record failure on all keys
            await Promise.all([
                recordFailedAttempt(ipKey, AUTH_RATE_LIMITS.LOGIN_PER_IP.windowMs),
                recordFailedAttempt(pairKey, AUTH_RATE_LIMITS.LOGIN_PAIR.windowMs),
                recordFailedAttempt(accountKey, AUTH_RATE_LIMITS.LOGIN_ACCOUNT.windowMs),
            ]);
            return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
        }

        // 3. Verify and upgrade password if necessary
        const isPasswordValid = await verifyAndUpgradePassword(
            String(password),
            user.password,
            user.id,
            prisma
        );

        if (!isPasswordValid) {
            // Record failure on all keys
            await Promise.all([
                recordFailedAttempt(ipKey, AUTH_RATE_LIMITS.LOGIN_PER_IP.windowMs),
                recordFailedAttempt(pairKey, AUTH_RATE_LIMITS.LOGIN_PAIR.windowMs),
                recordFailedAttempt(accountKey, AUTH_RATE_LIMITS.LOGIN_ACCOUNT.windowMs),
            ]);
            return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
        }

        // 4. On successful login: clear targeted account rate limits
        await Promise.all([
            clearRateLimit(pairKey),
            clearRateLimit(accountKey),
        ]);

        await setSessionCookie(user.id, user.tokenVersion ?? 0);

        return NextResponse.json({
            success: true,
            user: { id: user.id, email: user.email, name: user.name }
        });
    } catch (error) {
        console.error('Login error:', (error as Error)?.message || 'Unknown error');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
