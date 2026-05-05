import { upload } from '@vercel/blob/client';

export interface UploadVideoOptions {
    file: File | Blob;
    fileName: string;
    eventId: string;
    onProgress?: (progress: number) => void;
}

export interface UploadResult {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageProvider: string;
}

export const storageClient = {
    /**
     * Uploads a video from the client directly to storage.
     * Uses Vercel Blob Client Upload under the hood.
     */
    async uploadVideo({ file, fileName, eventId, onProgress }: UploadVideoOptions): Promise<UploadResult> {
        try {
            const blob = await upload(fileName, file, {
                access: 'public',
                handleUploadUrl: '/api/upload',
                clientPayload: JSON.stringify({ eventId }),
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        onProgress(progressEvent.percentage);
                    }
                },
            });

            return {
                url: blob.url,
                fileName: fileName,
                fileSize: file.size,
                mimeType: file.type || 'video/webm',
                storageProvider: 'vercel_blob',
            };
        } catch (error) {
            console.error('Error in storageClient.uploadVideo:', error);
            throw error;
        }
    }
};
