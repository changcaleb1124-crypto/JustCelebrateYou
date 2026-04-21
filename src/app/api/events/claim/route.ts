import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const userId = (await cookies()).get('session')?.value;
        if (!userId) {
            return NextResponse.json({ error: 'Please log in to claim this celebration' }, { status: 401 });
        }

        const { token } = await req.json();
        if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

        const event = await prisma.event.findUnique({ where: { claimToken: token } });
        if (!event) return NextResponse.json({ error: 'Invalid or expired claim link' }, { status: 404 });

        if (event.recipientUserId && event.recipientUserId !== userId) {
            return NextResponse.json({ error: 'This celebration has already been claimed.' }, { status: 400 });
        }

        await prisma.event.update({
            where: { id: event.id },
            data: {
                recipientUserId: userId,
                claimToken: null
            }
        });

        return NextResponse.json({ success: true, eventId: event.id });
    } catch (e) {
        console.error('Error claiming event:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
