import { cookies } from 'next/headers';

/**
 * Standard Web Crypto API helpers for Base64URL conversions.
 * Compatible with Edge runtime, Node.js, and serverless runtimes.
 */
function bytesToBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64UrlToBytes(str: string): Uint8Array {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

const SESSION_COOKIE_NAME = 'session';
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
    userId: string;
    tokenVersion?: number;
    iat: number; // Issued at (seconds)
    exp: number; // Expires at (seconds)
}

/**
 * Retrieves or derives a cryptographic HMAC key using SESSION_SECRET.
 */
async function getCryptoKey(): Promise<CryptoKey> {
    const secret = process.env.SESSION_SECRET || (
        process.env.NODE_ENV === 'production'
            ? (() => { throw new Error('SESSION_SECRET environment variable is required in production'); })()
            : 'just-celebrate-you-default-local-dev-session-secret-key-32chars'
    );

    const encoder = new TextEncoder();
    return crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token.
 * Format: `<base64url(payload)>.<base64url(signature)>`
 */
export async function createSessionToken(userId: string, tokenVersion: number = 0): Promise<string> {
    if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid user ID for session token creation');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload: SessionPayload = {
        userId,
        tokenVersion: typeof tokenVersion === 'number' ? tokenVersion : 0,
        iat: now,
        exp: now + SESSION_MAX_AGE_SEC,
    };

    const encoder = new TextEncoder();
    const payloadJson = JSON.stringify(payload);
    const payloadEncoded = bytesToBase64Url(encoder.encode(payloadJson));

    const key = await getCryptoKey();
    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(payloadEncoded)
    );
    const signatureEncoded = bytesToBase64Url(new Uint8Array(signatureBuffer));

    return `${payloadEncoded}.${signatureEncoded}`;
}

/**
 * Cryptographically verifies an HMAC-SHA256 session token payload.
 * Rejects unsigned strings, invalid signatures, malformed payloads, or expired tokens.
 * Returns the decoded SessionPayload, or null if verification fails.
 */
export async function verifySessionPayload(token: string | null | undefined): Promise<SessionPayload | null> {
    if (!token || typeof token !== 'string') {
        return null;
    }

    // A signed token MUST have exactly two segments separated by a period: payload and signature
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return null;
    }

    try {
        const key = await getCryptoKey();
        const encoder = new TextEncoder();
        const signatureBytes = base64UrlToBytes(parts[1]);

        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBytes as unknown as BufferSource,
            encoder.encode(parts[0])
        );

        if (!isValid) {
            return null;
        }

        const decoder = new TextDecoder();
        const payloadJson = decoder.decode(base64UrlToBytes(parts[0]));
        const payload = JSON.parse(payloadJson) as SessionPayload;

        if (!payload || typeof payload.userId !== 'string') {
            return null;
        }

        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (typeof payload.exp === 'number' && payload.exp < now) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

/**
 * Cryptographically verifies an HMAC-SHA256 session token.
 * Returns the verified userId, or null if verification fails.
 */
export async function verifySessionToken(token: string | null | undefined): Promise<string | null> {
    const payload = await verifySessionPayload(token);
    return payload ? payload.userId : null;
}

/**
 * Retrieves and cryptographically verifies the current authenticated user's ID
 * from the request's HTTP session cookie.
 * Validates that the session token version matches the user's current tokenVersion in the database,
 * ensuring any session issued before a password change is revoked immediately.
 * Returns verified userId if authentic and active, or null otherwise.
 */
export async function getCurrentUserId(req?: Request): Promise<string | null> {
    try {
        let token: string | undefined;

        if (req) {
            const cookieHeader = req.headers.get('cookie');
            if (cookieHeader) {
                const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`));
                if (match) {
                    token = decodeURIComponent(match[1]);
                }
            }
        }

        if (!token) {
            try {
                const cookieStore = await cookies();
                token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
            } catch {
                if (process.env.NODE_ENV === 'test' && (globalThis as unknown as { __TEST_SESSION_USER_ID__?: string }).__TEST_SESSION_USER_ID__) {
                    return (globalThis as unknown as { __TEST_SESSION_USER_ID__?: string }).__TEST_SESSION_USER_ID__ ?? null;
                }
            }
        }

        if (!token) {
            if (process.env.NODE_ENV === 'test' && (globalThis as unknown as { __TEST_SESSION_USER_ID__?: string }).__TEST_SESSION_USER_ID__) {
                return (globalThis as unknown as { __TEST_SESSION_USER_ID__?: string }).__TEST_SESSION_USER_ID__ ?? null;
            }
            return null;
        }

        const payload = await verifySessionPayload(token);
        if (!payload) return null;

        // Dynamic import to prevent Edge runtime bundling issues in middleware
        const { prisma } = await import('@/lib/db');
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { tokenVersion: true }
        });

        if (!user) {
            return null;
        }

        const expectedVersion = user.tokenVersion ?? 0;
        const tokenVersion = payload.tokenVersion ?? 0;

        // Reject if token version does not match (session was revoked upon password change)
        if (tokenVersion !== expectedVersion) {
            return null;
        }

        return payload.userId;
    } catch {
        return null;
    }
}

/**
 * Sets a cryptographically signed session cookie on the response.
 */
export async function setSessionCookie(userId: string, tokenVersion: number = 0): Promise<void> {
    const token = await createSessionToken(userId, tokenVersion);
    try {
        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_MAX_AGE_SEC,
            path: '/',
        });
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            throw err;
        }
    }
}

/**
 * Deletes the session cookie on the response.
 */
export async function clearSessionCookie(): Promise<void> {
    try {
        const cookieStore = await cookies();
        cookieStore.delete(SESSION_COOKIE_NAME);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            throw err;
        }
    }
}
