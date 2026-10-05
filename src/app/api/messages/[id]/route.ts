import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { promises as fs } from 'fs';
import path from 'path';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = (await cookies()).get('session')?.value;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
        }

        const message = await prisma.videoMessage.findUnique({
            where: { id },
            include: { event: { select: { userId: true } } }
        });

        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        if (message.event.userId !== userId) {
            return NextResponse.json(
                { error: 'Forbidden: Only the project creator can delete messages' },
                { status: 403 }
            );
        }

        try {
            const filename = message.videoUrl.split('/').pop();
            if (filename) {
                const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
                await fs.unlink(filePath);
            }
        } catch (e) {
            console.warn('Failed to delete video file:', e);
        }

        await prisma.videoMessage.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
