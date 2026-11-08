import { del } from '@vercel/blob';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

export interface DeleteMediaOptions {
    url: string | null | undefined;
    eventId: string;
    mediaType: 'video' | 'cover';
}

export interface DeleteMediaResult {
    success: boolean;
    error?: string;
    skipped?: boolean;
    alreadyAbsent?: boolean;
}

/**
 * Validates whether a file name is strictly safe against path traversal.
 */
function isSafeFileName(fileName: string): boolean {
    return /^[a-zA-Z0-9._-]+$/.test(fileName) && !fileName.includes('..');
}

/**
 * Performs immediate physical deletion of a media object from storage.
 * Handles both Vercel Blob and local filesystem with strict scoping.
 * Already-absent objects (BlobNotFoundError or ENOENT) are treated as successful.
 */
export async function deleteMediaObjectFromStorage({
    url,
    eventId,
    mediaType,
}: DeleteMediaOptions): Promise<DeleteMediaResult> {
    if (!url || typeof url !== 'string' || !url.trim()) {
        return { success: true, skipped: true };
    }

    const cleanUrl = url.trim();

    try {
        // --- 1. VERCEL BLOB STORAGE CLEANUP ---
        if (cleanUrl.includes('.public.blob.vercel-storage.com')) {
            let pathname = '';
            try {
                pathname = new URL(cleanUrl).pathname;
            } catch {
                return { success: false, error: 'Malformed blob URL' };
            }

            const expectedPrefix = mediaType === 'video'
                ? `/videos/${eventId}/`
                : `/covers/${eventId}/`;

            // Strict celebration scoping
            if (!pathname.startsWith(expectedPrefix)) {
                console.warn(
                    `[media-cleanup] Scope rejection: Blob path '${pathname}' does not match expected celebration prefix '${expectedPrefix}'`
                );
                return {
                    success: false,
                    error: `Scope mismatch: media object does not belong to celebration ${eventId}`,
                };
            }

            try {
                const blobToken = process.env.STAGING_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
                await del(cleanUrl, blobToken ? { token: blobToken } : undefined);
            } catch (delErr: unknown) {
                const msg = (delErr as Error)?.message || '';
                // If the object is already absent, treat as successful completion
                if (
                    msg.includes('BlobNotFoundError') ||
                    msg.includes('could not find') ||
                    msg.includes('404')
                ) {
                    return { success: true, alreadyAbsent: true };
                }
                throw delErr;
            }

            return { success: true };
        }

        // --- 2. LOCAL FILESYSTEM CLEANUP (Development fallback) ---
        const isLocalVideo = cleanUrl.startsWith('/uploads/videos/');
        const isLocalCover = cleanUrl.startsWith('/uploads/covers/');

        if (isLocalVideo || isLocalCover) {
            const subDir = isLocalVideo ? 'videos' : 'covers';
            const expectedFilePrefix = isLocalVideo ? `video-${eventId}-` : `cover-${eventId}-`;
            const fileName = cleanUrl.replace(`/uploads/${subDir}/`, '');

            if (!isSafeFileName(fileName)) {
                console.warn(`[media-cleanup] Potential path traversal detected in file name: '${fileName}'`);
                return { success: false, error: 'Invalid file name' };
            }

            if (!fileName.startsWith(expectedFilePrefix)) {
                console.warn(
                    `[media-cleanup] Scope rejection: Local file '${fileName}' does not match prefix '${expectedFilePrefix}'`
                );
                return { success: false, error: 'Scope mismatch: file does not belong to this celebration' };
            }

            const uploadsDir = path.join(process.cwd(), 'public', 'uploads', subDir);
            const targetPath = path.join(uploadsDir, fileName);

            // Path containment check
            const resolvedPath = path.resolve(targetPath);
            const resolvedUploadsDir = path.resolve(uploadsDir);
            if (!resolvedPath.startsWith(resolvedUploadsDir)) {
                return { success: false, error: 'Path traversal violation' };
            }

            try {
                await fs.unlink(resolvedPath);
            } catch (err: unknown) {
                if ((err as { code?: string })?.code === 'ENOENT') {
                    return { success: true, alreadyAbsent: true };
                }
                throw err;
            }

            return { success: true };
        }

        // External or unmanaged URL: skip without error
        return { success: true, skipped: true };
    } catch (err: unknown) {
        const errorMsg = (err as Error)?.message || 'Unknown storage deletion error';
        console.error(
            `[media-cleanup] Failed to delete ${mediaType} for celebration ${eventId}: ${errorMsg}`
        );
        return { success: false, error: errorMsg };
    }
}

export const deleteMediaObject = deleteMediaObjectFromStorage;

/**
 * Records a media cleanup task inside an ongoing Prisma transaction.
 * Ensures the cleanup task is durably saved BEFORE application records are removed or hidden.
 */
export async function queueMediaCleanupInTx(
    tx: Prisma.TransactionClient,
    { url, eventId, mediaType }: DeleteMediaOptions
): Promise<string | null> {
    if (!url || typeof url !== 'string' || !url.trim()) return null;

    const task = await tx.mediaCleanupQueue.create({
        data: {
            url: url.trim(),
            eventId,
            mediaType,
            status: 'PENDING',
            attempts: 0,
            maxAttempts: 5,
            nextRetryAt: new Date(),
        }
    });

    return task.id;
}

/**
 * Attempts immediate post-commit processing of a single queued cleanup task.
 * If storage deletion succeeds or the object is already absent, marks it COMPLETED.
 * If storage deletion fails, schedules exponential backoff for the retry processor.
 */
export async function processSingleCleanupTask(taskId: string): Promise<void> {
    try {
        const task = await prisma.mediaCleanupQueue.findUnique({
            where: { id: taskId }
        });

        if (!task || task.status === 'COMPLETED') return;

        const result = await deleteMediaObjectFromStorage({
            url: task.url,
            eventId: task.eventId,
            mediaType: task.mediaType as 'video' | 'cover',
        });

        if (result.success) {
            await prisma.mediaCleanupQueue.update({
                where: { id: taskId },
                data: {
                    status: 'COMPLETED',
                    updatedAt: new Date(),
                }
            });
        } else {
            const nextAttempts = task.attempts + 1;
            const backoffMinutes = Math.min(60, Math.pow(2, nextAttempts));
            const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

            await prisma.mediaCleanupQueue.update({
                where: { id: taskId },
                data: {
                    attempts: nextAttempts,
                    status: nextAttempts >= task.maxAttempts ? 'FAILED' : 'PENDING',
                    nextRetryAt,
                    lastError: (result.error || 'Deletion failed').slice(0, 500),
                    updatedAt: new Date(),
                }
            });
        }
    } catch (e) {
        console.error(`[media-cleanup] Unexpected error in processSingleCleanupTask (${taskId}):`, (e as Error)?.message);
    }
}

/**
 * Runnable cleanup retry processor.
 *
 * Capabilities:
 * - Bounded batch size (prevents memory spikes or unbounded queries).
 * - Bounded execution time (safely exits before serverless lambda timeouts).
 * - Concurrency protection: atomically acquires items with a status lock.
 * - Stale-lock recovery: automatically recovers tasks if a previous worker died mid-task (> 5 min).
 * - Exponential backoff: retries failed deletions with 2m, 4m, 8m, 16m intervals.
 * - Surfaces permanently failing items with status 'FAILED' for operator inspection.
 */
export async function processMediaCleanupQueue({
    batchSize = 25,
    maxExecutionMs = 25000,
}: {
    batchSize?: number;
    maxExecutionMs?: number;
} = {}): Promise<{ processed: number; succeeded: number; failed: number }> {
    const startTime = Date.now();
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    const now = new Date();
    const staleLockThreshold = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes
    const claimTime = new Date();

    // 1. Atomically claim candidate tasks using PostgreSQL FOR UPDATE SKIP LOCKED
    let candidateTasks: Array<{
        id: string;
        url: string;
        eventId: string;
        mediaType: string;
        status: string;
        attempts: number;
        maxAttempts: number;
        nextRetryAt: Date;
        lockedAt: Date | null;
    }> = [];

    try {
        candidateTasks = await prisma.$queryRaw<typeof candidateTasks>`
            UPDATE "MediaCleanupQueue"
            SET status = 'PROCESSING', "lockedAt" = TIMEZONE('utc', NOW())
            WHERE id IN (
                SELECT id FROM "MediaCleanupQueue"
                WHERE (status = 'PENDING' AND "nextRetryAt" <= TIMEZONE('utc', NOW()))
                   OR (status = 'PROCESSING' AND "lockedAt" <= TIMEZONE('utc', NOW()) - INTERVAL '5 minutes')
                ORDER BY "nextRetryAt" ASC
                LIMIT ${batchSize}
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id, url, "eventId", "mediaType", status, attempts, "maxAttempts", "nextRetryAt", "lockedAt";
        `;
    } catch {
        // Fallback for non-Postgres or unit testing environments
        const found = await prisma.mediaCleanupQueue.findMany({
            where: {
                OR: [
                    { status: 'PENDING', nextRetryAt: { lte: now } },
                    { status: 'PROCESSING', lockedAt: { lte: staleLockThreshold } }
                ]
            },
            orderBy: { nextRetryAt: 'asc' },
            take: batchSize,
        });
        if (found.length > 0) {
            const taskIds = found.map(t => t.id);
            await prisma.mediaCleanupQueue.updateMany({
                where: { id: { in: taskIds } },
                data: { status: 'PROCESSING', lockedAt: claimTime }
            });
            candidateTasks = found.map(t => ({ ...t, lockedAt: claimTime }));
        }
    }

    if (candidateTasks.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 };
    }

    // 2. Process each claimed task within time bounds
    for (const task of candidateTasks) {
        // Enforce overall processor time boundary
        if (Date.now() - startTime > maxExecutionMs) {
            console.warn(`[media-cleanup] Processor time boundary reached (${maxExecutionMs}ms). Exiting.`);
            break;
        }

        processed++;

        // Enforce per-task storage timeout (8s) so a single hanging network/storage call cannot exceed budget
        let result: DeleteMediaResult;
        try {
            const storagePromise = deleteMediaObjectFromStorage({
                url: task.url,
                eventId: task.eventId,
                mediaType: task.mediaType as 'video' | 'cover',
            });
            const timeoutPromise = new Promise<DeleteMediaResult>((_, reject) => {
                setTimeout(() => reject(new Error('Storage deletion timed out after 8000ms')), 8000);
            });
            result = await Promise.race([storagePromise, timeoutPromise]);
        } catch (callErr) {
            result = { success: false, error: (callErr as Error)?.message || 'Storage call timed out' };
        }

        const taskClaimLock = task.lockedAt || claimTime;

        if (result.success) {
            succeeded++;
            // Guard against stale worker: only update if lockedAt still matches our claim lock
            await prisma.mediaCleanupQueue.updateMany({
                where: {
                    id: task.id,
                    lockedAt: taskClaimLock,
                    status: 'PROCESSING'
                },
                data: {
                    status: 'COMPLETED',
                    lockedAt: null,
                    updatedAt: new Date(),
                }
            });
        } else {
            failed++;
            const nextAttempts = task.attempts + 1;
            const backoffMinutes = Math.min(60, Math.pow(2, nextAttempts));
            const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

            // Guard against stale worker: only update if lockedAt still matches our claim lock
            await prisma.mediaCleanupQueue.updateMany({
                where: {
                    id: task.id,
                    lockedAt: taskClaimLock,
                    status: 'PROCESSING'
                },
                data: {
                    attempts: nextAttempts,
                    status: nextAttempts >= task.maxAttempts ? 'FAILED' : 'PENDING',
                    nextRetryAt,
                    lockedAt: null,
                    lastError: (result.error || 'Deletion failed').slice(0, 500),
                    updatedAt: new Date(),
                }
            });
        }
    }

    return { processed, succeeded, failed };
}
