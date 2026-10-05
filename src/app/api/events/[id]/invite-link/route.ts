import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

/**
 * POST /api/events/[id]/invite-link
 * Securely retrieves or generates the contributor invitation link for an event.
 * Strictly enforced: Only the authenticated creator (event.userId === sessionUserId)
 * is authorized to retrieve this link.
 */
async function handleInviteLink(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = (await cookies()).get('session')?.value;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
        }

        const event = await prisma.event.findUnique({
            where: { id },
            select: { id: true, userId: true, recipient: true }
        });

        if (!event) {
            return NextResponse.json({ error: 'Celebration not found' }, { status: 404 });
        }

        // Server-side permission enforcement: creator only
        if (event.userId !== userId) {
            return NextResponse.json(
                { error: 'Forbidden: Only the project creator can retrieve or generate contributor invite links' },
                { status: 403 }
            );
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const inviteUrl = `${baseUrl}/event/${event.id}`;

        return NextResponse.json({
            success: true,
            inviteUrl,
            recipient: event.recipient
        });
    } catch (error: unknown) {
        console.error('Error generating invite link:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const GET = handleInviteLink;
export const POST = handleInviteLink;
