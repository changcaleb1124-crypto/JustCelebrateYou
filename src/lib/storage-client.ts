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
    uploadId: string;
    uploadToken: string;
}

export const storageClient = {
    /**
     * Uploads a video from the client directly to storage.
     * 1. Obtains a cryptographically bound, single-use upload authorization receipt.
     * 2. Executes direct client upload to Vercel Blob scoped strictly to the celebration folder.
     * 3. Returns the blob URL alongside the authorization receipt for atomic message finalization.
     */
    async uploadVideo({ file, fileName, eventId, onProgress }: UploadVideoOptions): Promise<UploadResult> {
        try {
            // 1. Obtain server-issued upload authorization receipt
            const authRes = await fetch('/api/upload/authorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    fileName,
                    mimeType: file.type || 'video/webm',
                    fileSize: file.size,
                }),
            });

            if (!authRes.ok) {
                const errData = await authRes.json();
                throw new Error(errData.error || 'Failed to authorize video upload');
            }

            const { uploadId, uploadToken, scopedPath } = await authRes.json();

            // 2. Upload directly to Vercel Blob with verified authorization receipt
            const blob = await upload(scopedPath, file, {
                access: 'public',
                handleUploadUrl: '/api/upload',
                clientPayload: JSON.stringify({ eventId, uploadId, uploadToken }),
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        onProgress(progressEvent.percentage);
                    }
                },
            });

            return {
                url: blob.url,
                fileName,
                fileSize: file.size,
                mimeType: file.type || 'video/webm',
                storageProvider: 'vercel_blob',
                uploadId,
                uploadToken,
            };
        } catch (error) {
            console.error('Error in storageClient.uploadVideo:', error);
            throw error;
        }
    }
};
