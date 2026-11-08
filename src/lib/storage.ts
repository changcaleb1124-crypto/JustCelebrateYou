import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * Storage Abstraction Layer
 * Currently implemented with Vercel Blob, but designed to be swappable.
 * Required Env Var: BLOB_READ_WRITE_TOKEN
 */

const CURRENT_PROVIDER = 'vercel_blob';

export interface SaveVideoMetadataOptions {
    eventId: string;
    videoUrl: string;
    senderName: string;
    fileName?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
}

export const storage = {
    /**
     * Handles the secure token generation for client-side uploads.
     * Validates that the event exists before allowing upload.
     */
    async handleClientUpload(body: HandleUploadBody, request: Request) {
        try {
            const token = process.env.STAGING_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
            const jsonResponse = await handleUpload({
                body,
                request,
                token,
                onBeforeGenerateToken: async (pathname, clientPayload) => {
                    let eventId = '';
                    let uploadId = '';
                    let uploadToken = '';

                    if (clientPayload) {
                        try {
                            const parsed = JSON.parse(clientPayload);
                            eventId = parsed.eventId;
                            uploadId = parsed.uploadId;
                            uploadToken = parsed.uploadToken;
                        } catch (e) {
                            console.error("Failed to parse client payload", e);
                        }
                    }

                    if (!eventId) {
                        throw new Error('Celebration ID is required for upload token generation');
                    }

                    // Security Check: Verify celebration exists
                    const event = await prisma.event.findUnique({
                        where: { id: eventId },
                        select: { id: true }
                    });

                    if (!event) {
                        throw new Error('Celebration not found');
                    }

                    // If server authorization receipt was issued, strictly verify it
                    if (uploadId && uploadToken) {
                        const uploadAuth = await prisma.uploadAuthorization.findUnique({
                            where: { id: uploadId }
                        });

                        if (!uploadAuth || uploadAuth.uploadToken !== uploadToken) {
                            throw new Error('Unauthorized upload: Invalid or forged upload receipt');
                        }

                        if (uploadAuth.eventId !== eventId) {
                            throw new Error('Unauthorized upload: Scope mismatch with celebration');
                        }

                        if (uploadAuth.status !== 'PENDING') {
                            throw new Error('Unauthorized upload: Authorization receipt is not pending');
                        }

                        if (uploadAuth.expiresAt <= new Date()) {
                            throw new Error('Unauthorized upload: Authorization receipt has expired');
                        }

                        if (pathname !== uploadAuth.scopedPath) {
                            throw new Error('Unauthorized upload: Upload pathname does not match authorized scope');
                        }
                    } else {
                        // Enforce that upload pathname is strictly scoped to this celebration
                        if (!pathname.startsWith(`videos/${eventId}/`)) {
                            throw new Error(`Invalid upload pathname: must be scoped to videos/${eventId}/`);
                        }
                    }

                    return {
                        allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/*'],
                        maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
                        validUntil: Date.now() + 15 * 60 * 1000, // 15-minute token expiry
                        tokenPayload: JSON.stringify({ eventId, uploadId })
                    };
                },
                onUploadCompleted: async ({ blob }) => {
                    // We don't save the metadata here because the frontend needs to 
                    // submit the senderName which isn't part of the blob upload.
                    // We save it in the /api/messages route instead.
                    console.log('Upload completed:', blob.url);
                },
            });

            return NextResponse.json(jsonResponse);
        } catch (error) {
            return NextResponse.json(
                { error: (error as Error).message },
                { status: 400 } // The webhook will retry 5 times waiting for a 200
            );
        }
    },

    /**
     * Saves the uploaded video metadata to the database.
     */
    async saveVideoMetadata(data: SaveVideoMetadataOptions) {
        return prisma.videoMessage.create({
            data: {
                eventId: data.eventId,
                videoUrl: data.videoUrl,
                senderName: data.senderName,
                fileName: data.fileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                storageProvider: CURRENT_PROVIDER,
            },
        });
    },

    /**
     * Deletes a video from storage with strict celebration scoping.
     */
    async deleteVideo(url: string, eventId?: string) {
        if (!url) return;
        const { deleteMediaObject } = await import('@/lib/media-cleanup');
        return deleteMediaObject({
            url,
            eventId: eventId || '',
            mediaType: 'video',
        });
    },

    /**
     * Gets a public URL for a video (useful if we switch to private S3 buckets later).
     * For Vercel Blob, the URL is already public.
     */
    getPublicVideoUrl(url: string) {
        return url;
    }
};
