import { getCurrentUserId } from '@/lib/session';

/**
 * Returns the set of authorized admin user IDs from the server environment.
 * Hardcoded fallbacks and email-based authorization are strictly disallowed.
 */
export function getAdminAllowlist(): Set<string> {
    const envIds = (process.env.ADMIN_USER_IDS || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

    return new Set(envIds);
}

/**
 * Server-verified administrator authorization check.
 * Strictly verifies whether the current request presents a cryptographically signed
 * session belonging to an authorized site administrator specified in ADMIN_USER_IDS.
 *
 * Rules:
 * 1. If ADMIN_USER_IDS is absent or empty, admin access is denied for everyone.
 * 2. Unsigned or forged session cookies cannot grant admin access.
 * 3. Being an event owner or an ordinary signed-in user does NOT grant admin access.
 * 4. Email-based authorization is not permitted.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
    try {
        const adminIds = getAdminAllowlist();
        if (adminIds.size === 0) {
            // Server configuration missing: strictly deny all admin access
            return false;
        }

        // Cryptographically verify session token from cookie
        const userId = await getCurrentUserId();
        if (!userId) {
            return false;
        }

        // Check against verified server-only allowlist
        return adminIds.has(userId.toLowerCase());
    } catch (err) {
        console.error('Error verifying admin authorization:', err);
        return false;
    }
}
