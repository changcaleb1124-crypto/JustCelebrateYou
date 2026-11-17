import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/session';
import crypto from 'crypto';
import { getClaimUrl } from '@/lib/url';

async function handleClaimLink(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const userId = await getCurrentUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        
        if (event.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden: Only the project creator can gift this celebration or generate claim links' }, { status: 403 });
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

        const claimUrl = getClaimUrl(token, req);
        return NextResponse.json({ claimToken: token, claimUrl });
    } catch (e: unknown) {
        const code = (e as { code?: string })?.code;
        console.error('Error generating claim link:', typeof code === 'string' && /^P\d{4}$/.test(code) ? code : 'INTERNAL_ERROR');
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export const GET = handleClaimLink;
export const POST = handleClaimLink;
