import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { head } from '@vercel/blob';
import path from 'path';
import fs from 'fs/promises';

const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_SENDER_NAME_LEN = 100;

export async function POST(req: Request) {
    try {
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
        }

        const {
            eventId,
            videoUrl,
            senderName,
            fileName,
            fileSize,
            mimeType,
            uploadId,
            uploadToken,
        } = (body || {}) as Record<string, unknown>;

        // 1. Input presence and format validation
        if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
            return NextResponse.json({ error: 'Celebration ID is required' }, { status: 400 });
        }

        if (!senderName || typeof senderName !== 'string' || !senderName.trim()) {
            return NextResponse.json({ error: 'Your name is required to submit a video message' }, { status: 400 });
        }

        const cleanSenderName = senderName.trim();
        if (cleanSenderName.length > MAX_SENDER_NAME_LEN) {
            return NextResponse.json({
                error: `Sender name must be ${MAX_SENDER_NAME_LEN} characters or less`
            }, { status: 400 });
        }

        if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim()) {
            return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
        }

        const cleanVideoUrl = videoUrl.trim();

        // 2. Verify celebration exists
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true }
        });

        if (!event) {
            // The celebration was deleted or does not exist.
            // Durably queue the already-uploaded media object for storage cleanup so it does not become stranded.
            try {
                await prisma.mediaCleanupQueue.create({
                    data: {
                        url: cleanVideoUrl,
                        eventId,
                        mediaType: 'video',
                        status: 'PENDING',
                    }
                });
            } catch (queueErr) {
                console.warn('[messages] Failed to queue cleanup for deleted event video:', queueErr);
            }
            return NextResponse.json({ error: 'Celebration not found' }, { status: 404 });
        }

        // 3. Deduplication & Idempotent Retry Handling
        const existing = await prisma.videoMessage.findFirst({
            where: { videoUrl: cleanVideoUrl }
        });

        if (existing) {
            // If the same video URL is resubmitted for the same celebration and sender, treat as idempotent retry
            if (
                existing.eventId === eventId &&
                existing.senderName.trim().toLowerCase() === cleanSenderName.toLowerCase()
            ) {
                return NextResponse.json(existing, { status: 200 });
            }

            // Otherwise, reject unauthorized reuse of an existing video object
            return NextResponse.json({
                error: 'This video has already been attached to a celebration message.'
            }, { status: 409 });
        }

        // 4. Server-Issued Upload Receipt Verification (if uploadId provided)
        let expectedScopedPath = '';
        if (uploadId && typeof uploadId === 'string') {
            const uploadAuth = await prisma.uploadAuthorization.findUnique({
                where: { id: uploadId }
            });

            if (!uploadAuth || uploadAuth.uploadToken !== uploadToken) {
                return NextResponse.json({
                    error: 'Forbidden: Invalid or forged upload authorization receipt.'
                }, { status: 403 });
            }

            if (uploadAuth.eventId !== eventId) {
                return NextResponse.json({
                    error: 'Forbidden: Upload authorization does not match this celebration.'
                }, { status: 403 });
            }

            if (uploadAuth.status === 'CONSUMED') {
                return NextResponse.json({
                    error: 'Conflict: This upload authorization has already been consumed.'
                }, { status: 409 });
            }

            if (uploadAuth.expiresAt <= new Date()) {
                return NextResponse.json({
                    error: 'Upload authorization receipt has expired. Please upload your video again.'
                }, { status: 400 });
            }

            expectedScopedPath = uploadAuth.scopedPath;
        }

        // 5. Object verification using supported SDK mechanisms
        let verifiedFileSize = typeof fileSize === 'number' ? fileSize : null;
        let verifiedMimeType = typeof mimeType === 'string' ? mimeType : null;

        const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

        if (hasBlobToken) {
            // Must be HTTPS URL
            let parsedUrl: URL;
            try {
                parsedUrl = new URL(cleanVideoUrl);
            } catch {
                return NextResponse.json({ error: 'Malformed video URL' }, { status: 400 });
            }

            if (parsedUrl.protocol !== 'https:') {
                return NextResponse.json({ error: 'Video URL must use HTTPS' }, { status: 400 });
            }

            // Verify with official @vercel/blob SDK: confirms presence in configured store
            let blobMeta;
            const blobToken = process.env.STAGING_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
            try {
                blobMeta = await head(cleanVideoUrl, blobToken ? { token: blobToken } : undefined);
            } catch (headErr) {
                console.warn('[messages] Storage verification failed for videoUrl:', (headErr as Error)?.message || 'Head error');
                return NextResponse.json({
                    error: 'Invalid video URL: Object does not exist in authorized cloud storage.'
                }, { status: 400 });
            }

            // Verify strict path scoping
            const expectedPrefix = `videos/${eventId}/`;
            if (!blobMeta.pathname.startsWith(expectedPrefix)) {
                return NextResponse.json({
                    error: 'Unauthorized video URL: Object does not belong to this celebration.'
                }, { status: 400 });
            }

            // If an authorization receipt was issued, ensure exact pathname match
            if (expectedScopedPath && blobMeta.pathname !== expectedScopedPath) {
                return NextResponse.json({
                    error: 'Unauthorized video URL: Object pathname does not match authorized receipt scope.'
                }, { status: 400 });
            }

            // Verify Content-Type (normalize parameters like ;codecs=vp8,opus)
            const baseContentType = blobMeta.contentType ? blobMeta.contentType.split(';')[0].trim().toLowerCase() : '';
            if (!ALLOWED_VIDEO_MIMES.includes(baseContentType)) {
                return NextResponse.json({
                    error: `Invalid video format: ${blobMeta.contentType}. Allowed formats: MP4, WebM, MOV.`
                }, { status: 400 });
            }

            // Verify file size bounds
            if (blobMeta.size <= 0 || blobMeta.size > MAX_VIDEO_BYTES) {
                return NextResponse.json({
                    error: `Video size exceeds maximum allowed limit of 50MB.`
                }, { status: 400 });
            }

            verifiedFileSize = blobMeta.size;
            verifiedMimeType = blobMeta.contentType;
        } else if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
            // Development-only fallback when BLOB_READ_WRITE_TOKEN is not configured
            if (cleanVideoUrl.startsWith('/uploads/videos/')) {
                const fileNameClean = cleanVideoUrl.replace('/uploads/videos/', '');
                const expectedPrefix = `video-${eventId}-`;

                if (!/^[a-zA-Z0-9._-]+$/.test(fileNameClean) || fileNameClean.includes('..')) {
                    return NextResponse.json({ error: 'Invalid video file name' }, { status: 400 });
                }

                if (!fileNameClean.startsWith(expectedPrefix)) {
                    return NextResponse.json({
                        error: 'Unauthorized video URL: Local file does not belong to this celebration.'
                    }, { status: 400 });
                }

                const filePath = path.join(process.cwd(), 'public', 'uploads', 'videos', fileNameClean);
                try {
                    const stats = await fs.stat(filePath);
                    if (stats.size <= 0 || stats.size > MAX_VIDEO_BYTES) {
                        return NextResponse.json({ error: 'Video file size is invalid.' }, { status: 400 });
                    }
                    verifiedFileSize = stats.size;
                } catch {
                    return NextResponse.json({ error: 'Local video file not found.' }, { status: 400 });
                }
            } else {
                return NextResponse.json({
                    error: 'Unauthorized video URL: Must be an authorized local upload in development mode.'
                }, { status: 400 });
            }
        } else {
            return NextResponse.json({
                error: 'Cloud storage is currently unconfigured in this environment.'
            }, { status: 503 });
        }

        // 6. Atomic Transaction: Consume authorization receipt and create VideoMessage
        try {
            const message = await prisma.$transaction(async (tx) => {
                // If uploadId provided, atomically transition status from PENDING to CONSUMED
                if (uploadId && typeof uploadId === 'string') {
                    const updateRes = await tx.uploadAuthorization.updateMany({
                        where: {
                            id: uploadId,
                            status: 'PENDING',
                        },
                        data: {
                            status: 'CONSUMED',
                            consumedAt: new Date(),
                        }
                    });

                    if (updateRes.count === 0) {
                        throw new Error('CONCURRENT_CONSUME_CONFLICT');
                    }
                }

                return tx.videoMessage.create({
                    data: {
                        eventId,
                        videoUrl: cleanVideoUrl,
                        senderName: cleanSenderName,
                        fileName: typeof fileName === 'string' ? fileName.slice(0, 255) : null,
                        fileSize: verifiedFileSize,
                        mimeType: verifiedMimeType,
                        storageProvider: hasBlobToken ? 'vercel_blob' : 'local',
                    }
                });
            });

            return NextResponse.json(message, { status: 201 });
        } catch (txErr: unknown) {
            if ((txErr as Error)?.message === 'CONCURRENT_CONSUME_CONFLICT') {
                // Check if the other concurrent request created the identical message
                const concurrentMsg = await prisma.videoMessage.findFirst({
                    where: { videoUrl: cleanVideoUrl }
                });
                if (
                    concurrentMsg &&
                    concurrentMsg.eventId === eventId &&
                    concurrentMsg.senderName.trim().toLowerCase() === cleanSenderName.toLowerCase()
                ) {
                    return NextResponse.json(concurrentMsg, { status: 200 });
                }
                return NextResponse.json({
                    error: 'Conflict: This upload has already been processed by a simultaneous request.'
                }, { status: 409 });
            }

            const err = txErr as { code?: string; message?: string };
            if (err?.code === 'P2003' || err?.message?.includes('Foreign key constraint failed')) {
                // The parent celebration was deleted concurrently while finalization was in flight.
                // Durably queue the uploaded video for cleanup so it is never stranded.
                try {
                    await prisma.mediaCleanupQueue.create({
                        data: {
                            url: cleanVideoUrl,
                            eventId,
                            mediaType: 'video',
                            status: 'PENDING',
                        }
                    });
                } catch (queueErr) {
                    console.warn('[messages] Failed to queue cleanup for raced event video:', queueErr);
                }
                return NextResponse.json({ error: 'Celebration not found: Celebration was deleted' }, { status: 404 });
            }
            throw txErr;
        }
    } catch (error) {
        console.error('Error saving video message metadata:', (error as Error)?.message || 'Unknown error');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
