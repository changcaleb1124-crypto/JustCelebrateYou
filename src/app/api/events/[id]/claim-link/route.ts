import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const userId = (await cookies()).get('session')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        
        if (event.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized to share this event' }, { status: 403 });
        }

        if (event.recipientUserId) {
            return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
        }

        let token = event.claimToken;
        if (!token) {
            token = crypto.randomBytes(16).toString('hex');
            await prisma.event.update({
                where: { id },
                data: { claimToken: token }
            });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return NextResponse.json({ claimToken: token, claimUrl: `${baseUrl}/claim/${token}` });
    } catch (e) {
        console.error('Error generating claim link:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
