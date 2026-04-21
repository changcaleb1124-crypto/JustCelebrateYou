import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const videoFile = formData.get('video') as File | null;
        const eventId = formData.get('eventId') as string | null;
        const senderName = formData.get('senderName') as string | null;

        if (!videoFile || !eventId || !senderName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const arrayBuffer = await videoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Save file locally
        const ext = videoFile.name.split('.').pop() || 'webm';
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');

        // Ensure dir exists
        await fs.mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);

        const videoUrl = `/uploads/${filename}`;

        const message = await prisma.videoMessage.create({
            data: {
                eventId,
                videoUrl,
                senderName,
            },
        });

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error('Error uploading video:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
