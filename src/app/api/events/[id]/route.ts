import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

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

        const userId = (await cookies()).get('session')?.value;
        const isCreator = Boolean(userId && event.userId && userId === event.userId);

        const sanitizedEvent = {
            ...event,
            claimToken: isCreator ? event.claimToken : null,
        };

        return NextResponse.json(sanitizedEvent);
    } catch (error) {
        console.error('Error fetching event:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = (await cookies()).get('session')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        if (event.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { occasion } = body;

        const allowedOccasions = ['birthday', 'graduation', 'anniversary', 'appreciation', 'other'];
        let sanitizedOccasion: string | null = null;
        if (occasion && typeof occasion === 'string') {
            const clean = occasion.toLowerCase().trim();
            if (allowedOccasions.includes(clean)) {
                sanitizedOccasion = clean;
            }
        }

        const updated = await prisma.event.update({
            where: { id },
            data: { occasion: sanitizedOccasion }
        });

        return NextResponse.json({ success: true, event: updated });
    } catch (error) {
        console.error('Error updating event:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

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

        for (const msg of event.messages) {
            if (msg.videoUrl) {
                const fileName = msg.videoUrl.split('/').pop();
                if (fileName) {
                    const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
                    try {
                        await fs.unlink(filePath);
                    } catch {
                        // ignore missing files
                    }
                }
            }
        }

        // Clean up cover if local file
        if (event.coverUrl && event.coverUrl.startsWith('/uploads/covers/')) {
            const coverFileName = event.coverUrl.replace('/uploads/covers/', '');
            const coverPath = path.join(process.cwd(), 'public', 'uploads', 'covers', coverFileName);
            try {
                await fs.unlink(coverPath);
            } catch {
                // ignore
            }
        }

        await prisma.event.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
