import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function PUT(req: Request) {
    try {
        const userId = (await cookies()).get('session')?.value;
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
    } catch (e: any) {
        console.error('Profile update error:', e);
        // Pass the actual Prisma/Server error back so the frontend can display it instead of a generic 500
        return NextResponse.json({ 
            error: e?.message ? `Server Error: ${e.message}` : 'An unexpected server error occurred.' 
        }, { status: 500 });
    }
}
