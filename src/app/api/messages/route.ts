import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { eventId, videoUrl, senderName, fileName, fileSize, mimeType } = body;

        if (!videoUrl || !eventId || !senderName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const message = await storage.saveVideoMetadata({
            eventId,
            videoUrl,
            senderName,
            fileName,
            fileSize,
            mimeType,
        });

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error('Error saving video message metadata:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
