import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // The storage layer handles the actual Vercel Blob token generation
        // and includes security checks to verify the event exists.
        return await storage.handleClientUpload(body, request);
    } catch (error) {
        console.error('Error generating upload token:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
