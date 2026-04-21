import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { email, password, name, isSignup } = await req.json();
        if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        let user = await prisma.user.findUnique({ where: { email } });
        
        if (isSignup) {
            if (user) {
                return NextResponse.json({ error: 'Account already exists. Please log in.' }, { status: 400 });
            }
            if (!name || name.trim() === '') {
                return NextResponse.json({ error: 'Name is required to sign up.' }, { status: 400 });
            }
            user = await prisma.user.create({ data: { email, password, name: name.trim() } });
        } else {
            if (!user) {
                return NextResponse.json({ error: 'Account not found. Please sign up.' }, { status: 404 });
            }
            if (user.password !== password) {
                return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
            }
        }

        const cookieStore = await cookies();
        cookieStore.set('session', user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        });

        return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
