import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/session';
import { queueMediaCleanupInTx, processSingleCleanupTask } from '@/lib/media-cleanup';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = await getCurrentUserId(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
        }

        let queuedTaskId: string | null = null;

        // 1. Transaction-First Outbox Pattern:
        // Durably queue the media cleanup task AND delete the application record in a single atomic transaction.
        // If execution stops before or during the transaction, no records are deleted and no orphaned work is lost.
        await prisma.$transaction(async (tx) => {
            const message = await tx.videoMessage.findUnique({
                where: { id },
                include: { event: { select: { id: true, userId: true } } }
            });

            if (!message) {
                throw new Error('NOT_FOUND');
            }

            if (message.event.userId !== userId) {
                throw new Error('FORBIDDEN');
            }

            // Durably queue cleanup in database
            queuedTaskId = await queueMediaCleanupInTx(tx, {
                url: message.videoUrl,
                eventId: message.event.id,
                mediaType: 'video',
            });

            // Delete the message: immediately hides it from all users and celebrations
            await tx.videoMessage.delete({
                where: { id }
            });
        });

        // 2. Post-commit processing: trigger immediate cleanup attempt
        if (queuedTaskId) {
            try {
                await processSingleCleanupTask(queuedTaskId);
            } catch (err) {
                console.warn(`[messages] Post-commit cleanup deferred to retry processor: ${(err as Error)?.message}`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const msg = (error as Error)?.message;
        if (msg === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }
        if (msg === 'FORBIDDEN') {
            return NextResponse.json(
                { error: 'Forbidden: Only the project creator can delete messages' },
                { status: 403 }
            );
        }
        console.error('Error deleting message:', msg || 'Unknown error');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
