import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json(event);
    } catch (error) {
        console.error('Error fetching event:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { cookies } from 'next/headers';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = (await cookies()).get('session')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const event = await prisma.event.findUnique({
            where: { id },
            include: { messages: true }
        });
        if (!event || event.userId !== userId) {
            return NextResponse.json({ error: 'Not found or forbidden' }, { status: 403 });
        }

        const fs = require('fs/promises');
        const path = require('path');
        for (const msg of event.messages) {
            if (msg.videoUrl) {
                const fileName = msg.videoUrl.split('/').pop();
                if (fileName) {
                    const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
                    try {
                        await fs.unlink(filePath);
                    } catch (err) {
                        console.error('Failed to delete file', filePath, err);
                    }
                }
            }
        }

        await prisma.event.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
