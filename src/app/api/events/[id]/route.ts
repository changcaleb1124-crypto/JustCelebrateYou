import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/session';
import { queueMediaCleanupInTx, processSingleCleanupTask } from '@/lib/media-cleanup';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const userId = await getCurrentUserId();
        const isCreator = Boolean(userId && event.userId && userId === event.userId);

        const sanitizedEvent = {
            ...event,
            claimToken: isCreator ? event.claimToken : null,
        };

        return NextResponse.json(sanitizedEvent);
    } catch (error) {
        console.error('Error fetching event:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = await getCurrentUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        if (event.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { occasion } = body;

        const allowedOccasions = ['birthday', 'graduation', 'anniversary', 'appreciation', 'other'];
        let sanitizedOccasion: string | null = null;
        if (occasion && typeof occasion === 'string') {
            const clean = occasion.toLowerCase().trim();
            if (allowedOccasions.includes(clean)) {
                sanitizedOccasion = clean;
            }
        }

        const updated = await prisma.event.update({
            where: { id },
            data: { occasion: sanitizedOccasion }
        });

        return NextResponse.json({ success: true, event: updated });
    } catch (error) {
        console.error('Error updating event:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = await getCurrentUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Durable deletion workflow:
        // 1. In one atomic database transaction:
        //    a. Fetch celebration and its messages inside tx to eliminate race conditions
        //    b. Record cleanup tasks for all media in MediaCleanupQueue (which has no FK to Event/VideoMessage)
        //    c. Delete the celebration application record (cascading deletes messages, comments, etc.)
        const cleanupTaskIds: string[] = [];

        await prisma.$transaction(async (tx) => {
            // Lock parent Event row with FOR UPDATE in PostgreSQL.
            // This prevents concurrent child inserts into VideoMessage (which require a shared lock on the parent)
            // from inserting unrecorded messages during or after reading messages.
            const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Event" WHERE id = ${id} FOR UPDATE`;
            if (!locked || locked.length === 0) {
                throw new Error('EVENT_NOT_FOUND');
            }

            const event = await tx.event.findUnique({
                where: { id },
                include: { messages: true }
            });

            if (!event) {
                throw new Error('EVENT_NOT_FOUND');
            }

            if (event.userId !== userId) {
                throw new Error('FORBIDDEN');
            }

            // Queue media cleanup tasks inside transaction
            for (const msg of event.messages) {
                if (msg.videoUrl) {
                    const taskId = await queueMediaCleanupInTx(tx, {
                        url: msg.videoUrl,
                        eventId: id,
                        mediaType: 'video',
                    });
                    if (taskId) cleanupTaskIds.push(taskId);
                }
            }

            if (event.coverUrl) {
                const taskId = await queueMediaCleanupInTx(tx, {
                    url: event.coverUrl,
                    eventId: id,
                    mediaType: 'cover',
                });
                if (taskId) cleanupTaskIds.push(taskId);
            }

            // Delete application records
            await tx.event.delete({ where: { id } });
        });

        // 2. Post-commit immediate processing:
        // Attempt storage cleanup immediately. If any task fails or execution stops,
        // it remains safely queued with exponential backoff for the retry processor.
        for (const taskId of cleanupTaskIds) {
            await processSingleCleanupTask(taskId);
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const msg = (error as Error)?.message || 'Unknown error';
        if (msg === 'EVENT_NOT_FOUND') {
            return NextResponse.json({ error: 'Celebration not found' }, { status: 404 });
        }
        if (msg === 'FORBIDDEN') {
            return NextResponse.json({ error: 'Forbidden: Only the creator can delete this celebration' }, { status: 403 });
        }
        console.error('Error deleting celebration:', msg);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
