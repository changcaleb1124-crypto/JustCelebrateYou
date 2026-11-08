import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/session';
import { put, head } from '@vercel/blob';
import { queueMediaCleanupInTx, processSingleCleanupTask } from '@/lib/media-cleanup';
import path from 'path';
import fs from 'fs/promises';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB (comfortably within serverless 4.5MB limit)

/**
 * POST /api/events/[id]/cover
 * Accepts either:
 * 1. multipart/form-data with a "file" field (supports Vercel Blob and dev-only filesystem)
 * 2. application/json with { coverUrl } verified via official @vercel/blob head() SDK
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventId } = await params;
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
        }

        // Server-side permission check: user must be the celebration creator
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true, userId: true, coverUrl: true }
        });

        if (!event) {
            return NextResponse.json({ error: 'Celebration not found' }, { status: 404 });
        }

        if (event.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden: Only the creator can change the cover image' }, { status: 403 });
        }

        const contentType = req.headers.get('content-type') || '';
        let newCoverUrl = '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;

            if (!file) {
                return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
            }

            const baseMime = file.type ? file.type.split(';')[0].trim().toLowerCase() : '';
            if (!ALLOWED_MIME_TYPES.includes(baseMime)) {
                return NextResponse.json({
                    error: 'Invalid file format. Please upload a JPG, PNG, or WebP image.'
                }, { status: 400 });
            }

            if (file.size > MAX_IMAGE_SIZE) {
                return NextResponse.json({
                    error: 'Image is too large. Maximum allowed size is 4MB.'
                }, { status: 400 });
            }

            const blobToken = process.env.STAGING_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
            const hasBlobToken = Boolean(blobToken);
            const ext = baseMime === 'image/png' ? 'png' : baseMime === 'image/webp' ? 'webp' : 'jpg';

            if (hasBlobToken) {
                // Production or Blob-configured environment: upload directly to Vercel Blob with scoped path
                const blobPathname = `covers/${eventId}/${Date.now()}.${ext}`;
                const blobResult = await put(blobPathname, file, { access: 'public', token: blobToken });
                newCoverUrl = blobResult.url;
            } else if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
                // Development-only fallback when Blob token is unconfigured
                const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'covers');
                await fs.mkdir(uploadDir, { recursive: true });
                const fileName = `cover-${eventId}-${Date.now()}.${ext}`;
                const filePath = path.join(uploadDir, fileName);
                const arrayBuffer = await file.arrayBuffer();
                await fs.writeFile(filePath, Buffer.from(arrayBuffer));
                newCoverUrl = `/uploads/covers/${fileName}`;
            } else {
                return NextResponse.json({
                    error: 'Cloud storage is currently unconfigured in this environment.'
                }, { status: 503 });
            }
        } else if (contentType.includes('application/json')) {
            // Direct-to-Blob upload completion verification
            const body = await req.json();
            const { coverUrl } = body;

            if (!coverUrl || typeof coverUrl !== 'string') {
                return NextResponse.json({ error: 'Invalid cover URL' }, { status: 400 });
            }

            const cleanCoverUrl = coverUrl.trim();

            let urlObj: URL;
            try {
                urlObj = new URL(cleanCoverUrl);
            } catch {
                return NextResponse.json({ error: 'Malformed cover URL' }, { status: 400 });
            }

            if (urlObj.protocol !== 'https:') {
                return NextResponse.json({ error: 'Invalid URL protocol: Must use HTTPS' }, { status: 400 });
            }

            const blobToken = process.env.STAGING_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
            const hasBlobToken = Boolean(blobToken);
            if (hasBlobToken) {
                // Use official SDK head() check: ensures object exists in our authorized Blob store
                let blobMeta;
                try {
                    blobMeta = await head(cleanCoverUrl, blobToken ? { token: blobToken } : undefined);
                } catch {
                    return NextResponse.json({
                        error: 'Unauthorized cover URL: Object does not exist in authorized cloud storage'
                    }, { status: 400 });
                }

                // Strictly verify path belongs to this celebration
                if (!blobMeta.pathname.startsWith(`covers/${eventId}/`)) {
                    return NextResponse.json({
                        error: 'Unauthorized cover URL: Image does not belong to this celebration’s storage path'
                    }, { status: 400 });
                }

                const baseCoverMime = blobMeta.contentType ? blobMeta.contentType.split(';')[0].trim().toLowerCase() : '';
                if (!ALLOWED_MIME_TYPES.includes(baseCoverMime)) {
                    return NextResponse.json({ error: 'Invalid cover image format' }, { status: 400 });
                }

                if (blobMeta.size > MAX_IMAGE_SIZE) {
                    return NextResponse.json({ error: 'Image exceeds maximum allowed size of 4MB' }, { status: 400 });
                }

                newCoverUrl = blobMeta.url;
            } else if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && cleanCoverUrl.startsWith('/uploads/covers/')) {
                const fileName = cleanCoverUrl.replace('/uploads/covers/', '');
                if (!fileName.startsWith(`cover-${eventId}-`)) {
                    return NextResponse.json({
                        error: 'Unauthorized cover URL: Local file does not belong to this celebration'
                    }, { status: 400 });
                }
                newCoverUrl = cleanCoverUrl;
            } else {
                return NextResponse.json({ error: 'Unauthorized cover URL' }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 400 });
        }

        // In one atomic transaction:
        // Record cleanup task for previous cover (if different) and update event coverUrl
        const oldCoverUrl = event.coverUrl;
        let cleanupTaskId: string | null = null;
        const updatedEvent = await prisma.$transaction(async (tx) => {
            if (oldCoverUrl && oldCoverUrl !== newCoverUrl) {
                cleanupTaskId = await queueMediaCleanupInTx(tx, {
                    url: oldCoverUrl,
                    eventId,
                    mediaType: 'cover',
                });
            }

            return tx.event.update({
                where: { id: eventId },
                data: { coverUrl: newCoverUrl },
                select: { id: true, coverUrl: true, occasion: true }
            });
        });

        // Post-commit immediate processing of queued cleanup task
        if (cleanupTaskId) {
            await processSingleCleanupTask(cleanupTaskId);
        }

        return NextResponse.json({
            success: true,
            coverUrl: updatedEvent.coverUrl
        });
    } catch (error: unknown) {
        console.error('Error updating cover image:', error);
        return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/events/[id]/cover
 * Removes the custom cover image and restores the default occasion illustration.
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventId } = await params;
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
        }

        // Server-side permission check: creator only
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true, userId: true, coverUrl: true }
        });

        if (!event) {
            return NextResponse.json({ error: 'Celebration not found' }, { status: 404 });
        }

        if (event.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden: Only the creator can remove the cover image' }, { status: 403 });
        }

        const oldCoverUrl = event.coverUrl;

        // In one atomic transaction:
        // Record cleanup task for current cover and set event.coverUrl to null
        let cleanupTaskId: string | null = null;
        await prisma.$transaction(async (tx) => {
            if (oldCoverUrl) {
                cleanupTaskId = await queueMediaCleanupInTx(tx, {
                    url: oldCoverUrl,
                    eventId,
                    mediaType: 'cover',
                });
            }

            await tx.event.update({
                where: { id: eventId },
                data: { coverUrl: null }
            });
        });

        // Post-commit immediate processing
        if (cleanupTaskId) {
            await processSingleCleanupTask(cleanupTaskId);
        }

        return NextResponse.json({ success: true, message: 'Cover image removed' });
    } catch (error: unknown) {
        console.error('Error removing cover image:', error);
        return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
    }
}
