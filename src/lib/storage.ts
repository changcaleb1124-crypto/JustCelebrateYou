import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { del } from '@vercel/blob';
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
            const jsonResponse = await handleUpload({
                body,
                request,
                onBeforeGenerateToken: async (pathname, clientPayload) => {
                    // Extract eventId from clientPayload if provided
                    let eventId = '';
                    if (clientPayload) {
                        try {
                            const parsed = JSON.parse(clientPayload);
                            eventId = parsed.eventId;
                        } catch (e) {
                            console.error("Failed to parse client payload", e);
                        }
                    }

                    if (!eventId) {
                        throw new Error('Event ID is required for upload token generation');
                    }

                    // Security Check: Verify event exists
                    const event = await prisma.event.findUnique({
                        where: { id: eventId },
                        select: { id: true }
                    });

                    if (!event) {
                        throw new Error('Event not found');
                    }

                    return {
                        allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
                        maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
                        tokenPayload: JSON.stringify({ eventId })
                    };
                },
                onUploadCompleted: async ({ blob, tokenPayload }) => {
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
     * Deletes a video from storage.
     */
    async deleteVideo(url: string) {
        if (!url) return;
        
        // Basic check to see if it's a Vercel Blob URL
        if (url.includes('public.blob.vercel-storage.com')) {
            try {
                await del(url);
            } catch (error) {
                console.error(`Failed to delete blob at ${url}:`, error);
            }
        }
    },

    /**
     * Gets a public URL for a video (useful if we switch to private S3 buckets later).
     * For Vercel Blob, the URL is already public.
     */
    getPublicVideoUrl(url: string) {
        return url;
    }
};
