import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { put, del } from '@vercel/blob';
import path from 'path';
import fs from 'fs/promises';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB (comfortably within serverless 4.5MB limit)

/**
 * Safely deletes a cover image from storage, strictly verifying
 * that the image URL belongs to this specific celebration's scoped storage path.
 */
async function safelyDeleteOldCover(eventId: string, oldUrl: string | null) {
    if (!oldUrl) return;

    try {
        // Vercel Blob deletion
        if (oldUrl.includes('.public.blob.vercel-storage.com')) {
            // Verify path scoping: must contain /covers/${eventId}/
            if (oldUrl.includes(`/covers/${eventId}/`)) {
                await del(oldUrl);
            } else {
                console.warn(`Attempted to delete blob outside celebration path: ${oldUrl}`);
            }
            return;
        }

        // Development-only local filesystem deletion
        if (oldUrl.startsWith('/uploads/covers/cover-')) {
            const fileName = oldUrl.replace('/uploads/covers/', '');
            // Verify fileName starts with cover-${eventId}-
            if (fileName.startsWith(`cover-${eventId}-`)) {
                const filePath = path.join(process.cwd(), 'public', 'uploads', 'covers', fileName);
                try {
                    await fs.unlink(filePath);
                } catch (e: unknown) {
                    if ((e as { code?: string })?.code !== 'ENOENT') {
                        console.error('Failed to unlink local dev cover file:', e);
                    }
                }
            } else {
                console.warn(`Attempted to delete local file outside celebration path: ${fileName}`);
            }
        }
    } catch (err) {
        console.error('Error during old cover deletion:', err);
    }
}

/**
 * Extracts and returns the expected public Blob hostname scoped to our application's
 * configured BLOB_READ_WRITE_TOKEN store ID.
 */
function getExpectedBlobHostname(): string | null {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return null;
    const match = token.match(/^vercel_blob_rw_([a-zA-Z0-9]+)_/);
    if (match && match[1]) {
        return `${match[1].toLowerCase()}.public.blob.vercel-storage.com`;
    }
    return null;
}

/**
 * POST /api/events/[id]/cover
 * Accepts either:
 * 1. multipart/form-data with a "file" field (supports Vercel Blob and dev-only filesystem)
 * 2. application/json with { coverUrl } uploaded via direct-to-Blob flow
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventId } = await params;
        const userId = (await cookies()).get('session')?.value;
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

            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                return NextResponse.json({
                    error: 'Invalid file format. Please upload a JPG, PNG, or WebP image.'
                }, { status: 400 });
            }

            if (file.size > MAX_IMAGE_SIZE) {
                return NextResponse.json({
                    error: 'Image is too large. Maximum allowed size is 4MB.'
                }, { status: 400 });
            }

            const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
            const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';

            if (hasBlobToken) {
                // Production or Blob-configured environment: upload directly to Vercel Blob with scoped path
                const blobPathname = `covers/${eventId}/${Date.now()}.${ext}`;
                const blobResult = await put(blobPathname, file, { access: 'public' });
                newCoverUrl = blobResult.url;
            } else if (process.env.NODE_ENV === 'development') {
                // Development-only fallback when Blob token is unconfigured
                const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'covers');
                await fs.mkdir(uploadDir, { recursive: true });
                const fileName = `cover-${eventId}-${Date.now()}.${ext}`;
                const filePath = path.join(uploadDir, fileName);
                const arrayBuffer = await file.arrayBuffer();
                await fs.writeFile(filePath, Buffer.from(arrayBuffer));
                newCoverUrl = `/uploads/covers/${fileName}`;
            } else {
                // Production without blob storage configured: must not write to filesystem
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

            let urlObj: URL;
            try {
                urlObj = new URL(coverUrl);
            } catch {
                return NextResponse.json({ error: 'Malformed cover URL' }, { status: 400 });
            }

            // 1. Must use HTTPS
            if (urlObj.protocol !== 'https:') {
                return NextResponse.json({ error: 'Invalid URL protocol: Must use HTTPS' }, { status: 400 });
            }

            // 2. Verify exact Blob store ID matching this application's configured store
            const expectedHostname = getExpectedBlobHostname();
            if (!expectedHostname || urlObj.hostname.toLowerCase() !== expectedHostname) {
                return NextResponse.json({
                    error: 'Unauthorized cover URL: Image does not belong to this application’s authorized Blob store'
                }, { status: 400 });
            }

            // 3. Strictly verify that the path belongs to this celebration's scoped storage path
            if (!urlObj.pathname.startsWith(`/covers/${eventId}/`)) {
                return NextResponse.json({
                    error: 'Unauthorized cover URL: Image does not belong to this celebration’s storage path'
                }, { status: 400 });
            }

            newCoverUrl = coverUrl;
        } else {
            return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 400 });
        }

        // Save old cover URL for safe cleanup AFTER successful database update
        const oldCoverUrl = event.coverUrl;

        // Update database with the new cover URL
        const updatedEvent = await prisma.event.update({
            where: { id: eventId },
            data: { coverUrl: newCoverUrl },
            select: { id: true, coverUrl: true, occasion: true }
        });

        // Safely delete previous cover file only after database write succeeds
        if (oldCoverUrl && oldCoverUrl !== newCoverUrl) {
            await safelyDeleteOldCover(eventId, oldCoverUrl);
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
        const userId = (await cookies()).get('session')?.value;
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

        // Reset database field to null
        await prisma.event.update({
            where: { id: eventId },
            data: { coverUrl: null }
        });

        // Clean up old file from storage
        if (oldCoverUrl) {
            await safelyDeleteOldCover(eventId, oldCoverUrl);
        }

        return NextResponse.json({ success: true, message: 'Cover image removed' });
    } catch (error: unknown) {
        console.error('Error removing cover image:', error);
        return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
    }
}
