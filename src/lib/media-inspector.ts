/**
 * Inspect raw media container timestamps (MP4 fragments or WebM clusters)
 * directly from Blob bytes without relying on browser player estimation.
 */

export interface MediaInspectionResult {
    format: 'mp4' | 'webm' | 'unknown';
    rawStartSec: number;
    rawEndSec: number;
    rawDurationSec: number;
    chunkCount: number;
    details: string;
}

export async function inspectMediaBlob(blob: Blob): Promise<MediaInspectionResult> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    // Check if WebM (EBML header 0x1A 0x45 0xDF 0xA3)
    if (bytes.length >= 4 && bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
        return inspectWebm(bytes);
    }

    // Check if MP4 (ftyp box at offset 4)
    if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
        return inspectMp4(bytes, view);
    }

    return {
        format: 'unknown',
        rawStartSec: 0,
        rawEndSec: 0,
        rawDurationSec: 0,
        chunkCount: 0,
        details: 'Unknown container format'
    };
}

function inspectWebm(bytes: Uint8Array): MediaInspectionResult {
    let timecodeScale = 1000000; // default 1ms
    let firstTimecode: number | null = null;
    let lastTimecode: number | null = null;
    let clusterCount = 0;

    // Scan for TimecodeScale (0x2A 0xD7 0xB1) in Info
    for (let i = 0; i < Math.min(bytes.length - 8, 8192); i++) {
        if (bytes[i] === 0x2A && bytes[i + 1] === 0xD7 && bytes[i + 2] === 0xB1) {
            const size = bytes[i + 3] & 0x7F;
            let val = 0;
            for (let j = 0; j < size; j++) {
                val = (val << 8) | bytes[i + 4 + j];
            }
            if (val > 0) timecodeScale = val;
            break;
        }
    }

    // Scan for Cluster headers (0x1F 0x43 0xB6 0x75)
    for (let i = 0; i < bytes.length - 8; i++) {
        if (bytes[i] === 0x1F && bytes[i + 1] === 0x43 && bytes[i + 2] === 0xB6 && bytes[i + 3] === 0x75) {
            clusterCount++;
            // Inside cluster, find Timecode element (0xE7)
            const searchEnd = Math.min(bytes.length - 4, i + 50);
            for (let j = i + 4; j < searchEnd; j++) {
                if (bytes[j] === 0xE7) {
                    const sizeByte = bytes[j + 1];
                    let tcLen = 0;
                    let tc = 0;
                    if (sizeByte & 0x80) {
                        tcLen = sizeByte & 0x7F;
                        for (let k = 0; k < tcLen; k++) {
                            tc = (tc << 8) | bytes[j + 2 + k];
                        }
                    }
                    if (firstTimecode === null) firstTimecode = tc;
                    lastTimecode = tc;
                    break;
                }
            }
        }
    }

    const scaleMs = timecodeScale / 1000000;
    const startSec = (firstTimecode || 0) * scaleMs / 1000;
    const endSec = (lastTimecode || 0) * scaleMs / 1000;
    const durationSec = endSec - startSec;

    return {
        format: 'webm',
        rawStartSec: startSec,
        rawEndSec: endSec,
        rawDurationSec: durationSec,
        chunkCount: clusterCount,
        details: `WebM: ${clusterCount} clusters, timecodes ${startSec.toFixed(2)}s to ${endSec.toFixed(2)}s`
    };
}

function inspectMp4(bytes: Uint8Array, view: DataView): MediaInspectionResult {
    let pos = 0;
    let videoTimescale = 30000;
    let firstTfdt: number | null = null;
    let lastTfdt: number | null = null;
    let lastDuration: number = 0;
    let fragmentCount = 0;

    while (pos + 8 <= bytes.length) {
        let boxSize = view.getUint32(pos);
        if (boxSize === 0) boxSize = bytes.length - pos;
        if (boxSize === 1) {
            // 64-bit size
            if (pos + 16 > bytes.length) break;
            boxSize = Number(view.getBigUint64(pos + 8));
        }
        if (boxSize < 8 || pos + boxSize > bytes.length) break;

        const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);

        if (type === 'moov') {
            // Search trak -> mdia -> mdhd for timescale
            for (let i = pos; i < pos + boxSize - 8; i++) {
                if (bytes[i] === 0x6D && bytes[i + 1] === 0x64 && bytes[i + 2] === 0x68 && bytes[i + 3] === 0x64) {
                    const ver = bytes[i + 4];
                    if (ver === 0 && i + 16 <= pos + boxSize) {
                        videoTimescale = view.getUint32(i + 16);
                        break;
                    }
                }
            }
        } else if (type === 'moof') {
            fragmentCount++;
            // Find tfdt inside moof
            for (let i = pos; i < pos + boxSize - 8; i++) {
                if (bytes[i] === 0x74 && bytes[i + 1] === 0x66 && bytes[i + 2] === 0x64 && bytes[i + 3] === 0x74) {
                    const ver = bytes[i + 4];
                    let tfdt = 0;
                    if (ver === 0) {
                        tfdt = view.getUint32(i + 8);
                    } else {
                        tfdt = Number(view.getBigUint64(i + 8));
                    }
                    if (firstTfdt === null) firstTfdt = tfdt;
                    lastTfdt = tfdt;
                    break;
                }
            }
            // Find trun inside moof to get fragment duration
            for (let i = pos; i < pos + boxSize - 8; i++) {
                if (bytes[i] === 0x74 && bytes[i + 1] === 0x72 && bytes[i + 2] === 0x75 && bytes[i + 3] === 0x6E) {
                    const trunFlags = (bytes[i + 5] << 16) | (bytes[i + 6] << 8) | bytes[i + 7];
                    const sampleCount = view.getUint32(i + 8);
                    let coff = i + 12;
                    if (trunFlags & 0x01) coff += 4; // data-offset
                    if (trunFlags & 0x04) coff += 4; // first-sample-flags
                    let fragDur = 0;
                    if (trunFlags & 0x100) {
                        // sample durations present
                        for (let s = 0; s < sampleCount && coff + 4 <= pos + boxSize; s++) {
                            fragDur += view.getUint32(coff);
                            coff += 4;
                            if (trunFlags & 0x200) coff += 4;
                            if (trunFlags & 0x400) coff += 4;
                            if (trunFlags & 0x800) coff += 4;
                        }
                        lastDuration = fragDur;
                    }
                    break;
                }
            }
        }

        pos += boxSize;
    }

    const startSec = (firstTfdt || 0) / videoTimescale;
    const endSec = ((lastTfdt || 0) + lastDuration) / videoTimescale;
    const durationSec = endSec - startSec;

    return {
        format: 'mp4',
        rawStartSec: startSec,
        rawEndSec: endSec,
        rawDurationSec: durationSec,
        chunkCount: fragmentCount,
        details: `fMP4: ${fragmentCount} fragments, tfdt ${startSec.toFixed(2)}s to ${endSec.toFixed(2)}s (timescale ${videoTimescale})`
    };
}
