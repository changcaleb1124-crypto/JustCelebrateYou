/**
 * Utility to fix WebM duration metadata.
 * 
 * MediaRecorder in Chromium (Chrome, Edge) creates streaming WebM blobs without 
 * writing the EBML Duration element in Segment Info. Without this element, 
 * standard HTML5 <video> players can only demux the initial cluster (~2 seconds),
 * causing playback to prematurely halt, display incorrect duration (e.g. 0:02 or Infinity),
 * and fail to seek properly.
 * 
 * This utility parses the EBML Segment Info and injects the 0x4489 Duration element
 * so that both the local video preview and saved video playback accurately reflect
 * and scrub across the entire recorded length.
 */

export async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
    if (!blob || durationMs <= 0) return blob;
    if (blob.type && !blob.type.includes('webm')) {
        // Not a WebM blob (e.g. MP4 or MOV upload), return untouched
        return blob;
    }

    try {
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        if (bytes.length < 50) return blob;

        // Verify EBML Header: 0x1A 0x45 0xDF 0xA3
        if (bytes[0] !== 0x1A || bytes[1] !== 0x45 || bytes[2] !== 0xDF || bytes[3] !== 0xA3) {
            return blob;
        }

        // Search for Info element: 0x15 0x49 0xA9 0x66
        const infoHeader = [0x15, 0x49, 0xA9, 0x66];
        let infoPos = -1;
        for (let i = 0; i < Math.min(bytes.length - 4, 4096); i++) {
            if (
                bytes[i] === infoHeader[0] &&
                bytes[i + 1] === infoHeader[1] &&
                bytes[i + 2] === infoHeader[2] &&
                bytes[i + 3] === infoHeader[3]
            ) {
                infoPos = i;
                break;
            }
        }
        if (infoPos === -1) return blob;

        // Parse Info size VINT
        const pos = infoPos + 4;
        const firstSizeByte = bytes[pos];
        let sizeLen = 0;
        let infoSize = 0;

        if (firstSizeByte & 0x80) {
            sizeLen = 1;
            infoSize = firstSizeByte & 0x7F;
        } else if (firstSizeByte & 0x40) {
            sizeLen = 2;
            infoSize = ((firstSizeByte & 0x3F) << 8) | bytes[pos + 1];
        } else if (firstSizeByte & 0x20) {
            sizeLen = 3;
            infoSize = ((firstSizeByte & 0x1F) << 16) | (bytes[pos + 1] << 8) | bytes[pos + 2];
        } else if (firstSizeByte & 0x10) {
            sizeLen = 4;
            infoSize = ((firstSizeByte & 0x0F) << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
        } else {
            return blob;
        }

        const infoPayloadStart = pos + sizeLen;
        const infoPayloadEnd = infoPayloadStart + infoSize;
        if (infoPayloadEnd > bytes.length) return blob;

        const infoPayload = bytes.subarray(infoPayloadStart, infoPayloadEnd);

        // Find TimecodeScale: 0x2A 0xD7 0xB1 (default 1,000,000 ns = 1 ms)
        let timecodeScale = 1000000;
        for (let i = 0; i < infoPayload.length - 5; i++) {
            if (infoPayload[i] === 0x2A && infoPayload[i + 1] === 0xD7 && infoPayload[i + 2] === 0xB1) {
                const tcSize = infoPayload[i + 3] & 0x7F;
                let val = 0;
                for (let j = 0; j < tcSize; j++) {
                    val = (val << 8) | infoPayload[i + 4 + j];
                }
                if (val > 0) timecodeScale = val;
                break;
            }
        }

        const durationInScale = durationMs / (timecodeScale / 1000000);

        // Encode 8-byte float64 duration
        const durBuf = new ArrayBuffer(8);
        new DataView(durBuf).setFloat64(0, durationInScale, false);
        const durBytes = new Uint8Array(durBuf);

        // Check if Duration element (0x44 0x89) already exists in Info
        let durPos = -1;
        for (let i = 0; i < infoPayload.length - 2; i++) {
            if (infoPayload[i] === 0x44 && infoPayload[i + 1] === 0x89) {
                durPos = i;
                break;
            }
        }

        if (durPos !== -1) {
            // Overwrite existing duration
            const durSize = infoPayload[durPos + 2] & 0x7F;
            if (durSize === 4) {
                const f4Buf = new ArrayBuffer(4);
                new DataView(f4Buf).setFloat32(0, durationInScale, false);
                const res = new Uint8Array(bytes);
                res.set(new Uint8Array(f4Buf), infoPayloadStart + durPos + 3);
                return new Blob([res], { type: blob.type || 'video/webm' });
            } else if (durSize === 8) {
                const res = new Uint8Array(bytes);
                res.set(durBytes, infoPayloadStart + durPos + 3);
                return new Blob([res], { type: blob.type || 'video/webm' });
            }
        }

        // Insert new Duration element: 0x44 0x89, size 0x88 (8 bytes) + float64
        const newDurElement = new Uint8Array(11);
        newDurElement[0] = 0x44;
        newDurElement[1] = 0x89;
        newDurElement[2] = 0x88;
        newDurElement.set(durBytes, 3);

        const newInfoSize = infoSize + 11;
        let newSizeVint: Uint8Array;
        if (sizeLen === 1 && newInfoSize < 127) {
            newSizeVint = new Uint8Array([0x80 | newInfoSize]);
        } else if (sizeLen === 2 || (sizeLen === 1 && newInfoSize >= 127)) {
            newSizeVint = new Uint8Array([0x40 | (newInfoSize >> 8), newInfoSize & 0xFF]);
        } else if (sizeLen === 3) {
            newSizeVint = new Uint8Array([0x20 | (newInfoSize >> 16), (newInfoSize >> 8) & 0xFF, newInfoSize & 0xFF]);
        } else {
            newSizeVint = new Uint8Array([0x10 | (newInfoSize >> 24), (newInfoSize >> 16) & 0xFF, (newInfoSize >> 8) & 0xFF, newInfoSize & 0xFF]);
        }

        const totalNewLength = bytes.length - sizeLen + newSizeVint.length + 11;
        const result = new Uint8Array(totalNewLength);

        // 1. Copy EBML header through Info ID
        result.set(bytes.subarray(0, infoPos + 4), 0);
        let offset = infoPos + 4;

        // 2. Set new Info size VINT
        result.set(newSizeVint, offset);
        offset += newSizeVint.length;

        // 3. Copy existing Info payload
        result.set(infoPayload, offset);
        offset += infoPayload.length;

        // 4. Append new Duration element
        result.set(newDurElement, offset);
        offset += newDurElement.length;

        // 5. Copy remainder of file (Tracks, Clusters, Cues, etc.)
        result.set(bytes.subarray(infoPayloadEnd), offset);

        return new Blob([result], { type: blob.type || 'video/webm' });
    } catch (err) {
        console.warn('Failed to patch WebM duration:', err);
        return blob;
    }
}
