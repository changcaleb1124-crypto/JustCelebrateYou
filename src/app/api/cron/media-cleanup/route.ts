import { NextResponse } from 'next/server';
import { processMediaCleanupQueue } from '@/lib/media-cleanup';
import { isCurrentUserAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * GET or POST /api/cron/media-cleanup
 *
 * Protected scheduled endpoint for processing the durable media cleanup queue.
 *
 * Authentication:
 * 1. Bearer token matching the server-configured CRON_SECRET environment variable
 *    (e.g., Authorization: Bearer <CRON_SECRET>), OR
 * 2. Authenticated site administrator session.
 *
 * If CRON_SECRET is unconfigured and the caller is not an administrator, access is denied.
 */
import crypto from 'crypto';

/**
 * Validates bearer token in constant time to prevent timing attacks.
 */
function isValidBearer(authHeader: string, secret: string): boolean {
    const expected = `Bearer ${secret.trim()}`;
    const cleanHeader = authHeader.trim();
    if (Buffer.byteLength(cleanHeader) !== Buffer.byteLength(expected)) {
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(cleanHeader), Buffer.from(expected));
}

async function handleCleanup(req: Request) {
    try {
        const authHeader = req.headers.get('authorization') || '';
        const cronSecret = process.env.CRON_SECRET;

        let isAuthorized = false;

        // 1. Secret-based Bearer token authentication (safe for automated schedulers via GET or POST)
        if (cronSecret && cronSecret.trim().length > 0) {
            if (isValidBearer(authHeader, cronSecret)) {
                isAuthorized = true;
            }
        }

        // 2. Administrator session fallback:
        // ONLY permitted via POST requests to prevent GET-based CSRF attacks via <img> tags or links
        if (!isAuthorized && req.method === 'POST') {
            const isAdmin = await isCurrentUserAdmin();
            if (isAdmin) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized: Valid CRON_SECRET or admin session required' }, { status: 401 });
        }

        // Parse optional query params for batch size (capped at 50) and max duration (capped at 25s for serverless)
        const { searchParams } = new URL(req.url);
        const batchParam = searchParams.get('batch');
        const batchSize = Math.min(50, Math.max(1, batchParam ? parseInt(batchParam, 10) || 25 : 25));

        const result = await processMediaCleanupQueue({
            batchSize,
            maxExecutionMs: 25000,
        });

        return NextResponse.json({
            success: true,
            processed: result.processed,
            succeeded: result.succeeded,
            failed: result.failed,
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        console.error('[cron/media-cleanup] Error during media cleanup processing:', (error as Error)?.message || 'Unknown error');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return handleCleanup(req);
}

export async function POST(req: Request) {
    return handleCleanup(req);
}
