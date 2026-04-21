import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const userId = (await cookies()).get('session')?.value;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, recipient, description } = await req.json();
        if (!title || !recipient) {
            return NextResponse.json({ error: 'Title and recipient are required' }, { status: 400 });
        }

        const event = await prisma.event.create({
            data: {
                title,
                recipient,
                description,
                userId,
            },
        });

        return NextResponse.json(event, { status: 201 });
    } catch (error) {
        console.error('Error creating event:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
