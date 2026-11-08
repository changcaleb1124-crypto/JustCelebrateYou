import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * POST /api/upload/authorize
 *
 * Issues a server-authorized upload receipt specifically bound to an intended celebration.
 * Enables account-free guest contribution while providing cryptographic, single-use binding
 * between the upload authorization, direct storage upload, and message creation.
 */
export async function POST(req: Request) {
    try {
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
        }

        const { eventId, fileName, mimeType, fileSize } = (body || {}) as Record<string, unknown>;

        if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
            return NextResponse.json({ error: 'Celebration ID is required' }, { status: 400 });
        }

        // 1. Verify celebration exists
        const event = await prisma.event.findUnique({
            where: { id: eventId.trim() },
            select: { id: true }
        });

        if (!event) {
            return NextResponse.json({ error: 'Celebration not found' }, { status: 404 });
        }

        // 2. Validate declared size and MIME bounds if provided
        if (typeof fileSize === 'number' && (fileSize <= 0 || fileSize > MAX_VIDEO_BYTES)) {
            return NextResponse.json({
                error: 'Video exceeds maximum allowed limit of 50MB'
            }, { status: 400 });
        }

        const baseMime = typeof mimeType === 'string' && mimeType ? mimeType.split(';')[0].trim().toLowerCase() : '';
        if (baseMime && !ALLOWED_MIME_TYPES.includes(baseMime)) {
            return NextResponse.json({
                error: 'Invalid video format. Allowed formats: MP4, WebM, MOV'
            }, { status: 400 });
        }

        // 3. Determine sanitized file extension
        let ext = 'webm';
        if (typeof fileName === 'string' && fileName) {
            const rawExt = fileName.split('.').pop()?.toLowerCase();
            if (rawExt && ['mp4', 'webm', 'mov', 'm4v'].includes(rawExt)) {
                ext = rawExt;
            }
        } else if (baseMime) {
            if (baseMime.includes('mp4') || baseMime.includes('m4v')) ext = 'mp4';
            else if (baseMime.includes('quicktime')) ext = 'mov';
            else if (baseMime.includes('webm')) ext = 'webm';
        }

        // 4. Generate cryptographically random authorization receipt
        const uploadId = crypto.randomUUID();
        const uploadToken = crypto.randomBytes(32).toString('hex');
        const timestamp = Date.now();
        const scopedPath = `videos/${event.id}/${uploadId}-${timestamp}.${ext}`;
        const expiresAt = new Date(timestamp + 15 * 60 * 1000); // 15-minute validity

        // 5. Durably persist authorization receipt
        await prisma.uploadAuthorization.create({
            data: {
                id: uploadId,
                eventId: event.id,
                uploadToken,
                scopedPath,
                expiresAt,
                status: 'PENDING',
            }
        });

        return NextResponse.json({
            uploadId,
            uploadToken,
            scopedPath,
            expiresAt: expiresAt.toISOString(),
        }, { status: 201 });
    } catch (error) {
        console.error('Error generating upload authorization:', (error as Error)?.message || 'Unknown error');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
