import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/session';

export async function GET() {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ user: null });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true }
        });

        return NextResponse.json({ user: user || null });
    } catch (e: unknown) {
        console.error('Profile fetch error:', e);
        return NextResponse.json({ user: null });
    }
}

export async function PUT(req: Request) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name } = await req.json();
        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { name: name.trim() }
        });

        return NextResponse.json({ success: true, user: { id: user.id, name: user.name } });
    } catch (e: unknown) {
        console.error('Profile update error:', e);
        const message = (e as Error)?.message;
        return NextResponse.json({ 
            error: message ? `Server Error: ${message}` : 'An unexpected server error occurred.' 
        }, { status: 500 });
    }
}
