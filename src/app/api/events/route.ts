import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const userId = (await cookies()).get('session')?.value;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, recipient, description, occasion } = await req.json();
        if (!title || !recipient) {
            return NextResponse.json({ error: 'Title and recipient are required' }, { status: 400 });
        }

        const allowedOccasions = ['birthday', 'graduation', 'anniversary', 'appreciation', 'other'];
        let sanitizedOccasion: string | null = null;
        if (occasion && typeof occasion === 'string') {
            const clean = occasion.toLowerCase().trim();
            if (allowedOccasions.includes(clean)) {
                sanitizedOccasion = clean;
            }
        }

        const event = await prisma.event.create({
            data: {
                title,
                recipient,
                description,
                occasion: sanitizedOccasion,
                userId,
            },
        });

        return NextResponse.json(event, { status: 201 });
    } catch (error) {
        console.error('Error creating event:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
