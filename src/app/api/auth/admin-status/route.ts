import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const isAdmin = await isCurrentUserAdmin();
        return NextResponse.json({ isAdmin });
    } catch (err) {
        console.error('Failed to get admin status:', err);
        return NextResponse.json({ isAdmin: false }, { status: 500 });
    }
}
