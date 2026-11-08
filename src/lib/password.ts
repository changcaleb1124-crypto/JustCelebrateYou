import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';

const BCRYPT_SALT_ROUNDS = 10;
export const BCRYPT_MAX_BYTES = 72;

/**
 * Calculates the exact UTF-8 byte length of a string.
 * Accounts for multibyte Unicode characters (e.g., emojis or non-ASCII characters).
 */
export function getPasswordByteLength(str: string): number {
    return Buffer.byteLength(str, 'utf8');
}

/**
 * Checks whether a given string is an existing bcrypt hash.
 */
export function isBcryptHash(str: string | null | undefined): boolean {
    if (!str || typeof str !== 'string') return false;
    // bcrypt hashes start with $2a$, $2b$, or $2y$ and are typically 60 chars long
    return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);
}

/**
 * Hashes a plain text password using bcrypt with salt rounds.
 * Rejects passwords exceeding bcrypt's 72-byte limit to prevent silent truncation.
 */
export async function hashPassword(plainText: string): Promise<string> {
    if (!plainText || typeof plainText !== 'string') {
        throw new Error('Password must be a non-empty string');
    }
    const byteLength = getPasswordByteLength(plainText);
    if (byteLength > BCRYPT_MAX_BYTES) {
        throw new Error(`Password exceeds bcrypt limit of ${BCRYPT_MAX_BYTES} bytes (received ${byteLength} bytes).`);
    }
    return bcrypt.hash(plainText, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies a plain text password against a stored password (bcrypt hash or legacy plaintext).
 * Bcrypt natively truncates inputs after 72 bytes; to prevent passwords exceeding 72 bytes
 * from falsely authenticating against an existing hash, inputs > 72 bytes are rejected.
 * Never logs the plain text or hashed password.
 */
export async function verifyPassword(plainText: string, stored: string): Promise<boolean> {
    if (!plainText || !stored) return false;

    if (isBcryptHash(stored)) {
        // Enforce the 72-byte limit strictly to avoid bcrypt's silent truncation
        if (getPasswordByteLength(plainText) > BCRYPT_MAX_BYTES) {
            return false;
        }
        return bcrypt.compare(plainText, stored);
    }

    // Legacy unhashed plain text fallback for seamless zero-downtime migration
    return plainText === stored;
}

// Precomputed valid bcrypt hash used to equalize execution timing when account does not exist
const DUMMY_BCRYPT_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

/**
 * Performs a dummy bcrypt comparison against a precomputed hash to eliminate
 * the response timing difference between non-existent accounts and invalid passwords.
 */
export async function verifyDummyPassword(plainText: string): Promise<boolean> {
    if (getPasswordByteLength(plainText) > BCRYPT_MAX_BYTES) {
        return false;
    }
    return bcrypt.compare(plainText, DUMMY_BCRYPT_HASH);
}

/**
 * Verifies the password and, if the user was still using legacy plaintext storage,
 * transparently upgrades the database record to a secure bcrypt hash without interrupting the user.
 * Guarantees no silent truncation during migration.
 */
export async function verifyAndUpgradePassword(
    plainText: string,
    stored: string,
    userId: string,
    prisma: PrismaClient
): Promise<boolean> {
    const isValid = await verifyPassword(plainText, stored);
    if (!isValid) return false;

    // If it was legacy plaintext, transparently migrate in the background
    if (!isBcryptHash(stored)) {
        const byteLength = getPasswordByteLength(plainText);
        if (byteLength <= BCRYPT_MAX_BYTES) {
            try {
                const newHash = await hashPassword(plainText);
                await prisma.user.update({
                    where: { id: userId },
                    data: { password: newHash }
                });
            } catch (err) {
                // Log generic migration warning without exposing any credentials
                console.error('Password hash upgrade failed for user', userId, err);
            }
        } else {
            console.warn(`Cannot migrate legacy password for user ${userId}: exceeds 72-byte limit (${byteLength} bytes)`);
        }
    }

    return true;
}

/**
 * Validates new password requirements, strictly checking bcrypt's 72-byte limit.
 */
export function validateNewPassword(
    newPassword: unknown,
    confirmPassword: unknown,
    currentPassword?: unknown
): { valid: boolean; error?: string } {
    if (typeof newPassword !== 'string' || !newPassword) {
        return { valid: false, error: 'New password is required.' };
    }
    if (typeof confirmPassword !== 'string' || !confirmPassword) {
        return { valid: false, error: 'Password confirmation is required.' };
    }
    if (newPassword.length < 8) {
        return { valid: false, error: 'New password must be at least 8 characters long.' };
    }

    const newByteLength = getPasswordByteLength(newPassword);
    if (newByteLength > BCRYPT_MAX_BYTES) {
        return {
            valid: false,
            error: 'Your password is too long. Please shorten it. Some symbols and emoji count toward the limit more quickly.'
        };
    }

    if (newPassword !== confirmPassword) {
        return { valid: false, error: 'New password and confirmation do not match.' };
    }

    if (typeof currentPassword === 'string' && currentPassword) {
        const currentByteLength = getPasswordByteLength(currentPassword);
        if (currentByteLength > BCRYPT_MAX_BYTES) {
            return {
                valid: false,
                error: 'Your password is too long. Please shorten it. Some symbols and emoji count toward the limit more quickly.'
            };
        }
        if (newPassword === currentPassword) {
            return { valid: false, error: 'New password must be different from your current password.' };
        }
    }

    return { valid: true };
}
