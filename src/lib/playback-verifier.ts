/**
 * Playback verifier to test uninterrupted playback across
 * beginning, middle, and end of recorded media Blobs.
 */

export interface PlaybackVerificationResult {
    ok: boolean;
    startPlayed: boolean;
    midPlayed: boolean;
    endPlayed: boolean;
    duration: number;
    details: string;
}

export async function measureBlobDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        const url = URL.createObjectURL(blob);
        video.src = url;

        const cleanup = () => {
            URL.revokeObjectURL(url);
            video.remove();
        };

        const timeout = setTimeout(() => {
            cleanup();
            resolve(video.duration || 0);
        }, 5000);

        video.onloadedmetadata = () => {
            clearTimeout(timeout);
            const dur = video.duration;
            cleanup();
            resolve(dur);
        };

        video.onerror = () => {
            clearTimeout(timeout);
            cleanup();
            resolve(0);
        };
    });
}

export async function verifyPlayback(blob: Blob): Promise<PlaybackVerificationResult> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        const url = URL.createObjectURL(blob);
        video.src = url;

        const cleanup = () => {
            URL.revokeObjectURL(url);
            video.pause();
            video.remove();
        };

        const overallTimeout = setTimeout(() => {
            cleanup();
            resolve({
                ok: false,
                startPlayed: false,
                midPlayed: false,
                endPlayed: false,
                duration: video.duration || 0,
                details: 'Playback verification timed out'
            });
        }, 12000);

        video.onloadedmetadata = async () => {
            const dur = video.duration;
            if (!dur || dur <= 0 || dur === Infinity) {
                clearTimeout(overallTimeout);
                cleanup();
                resolve({
                    ok: false,
                    startPlayed: false,
                    midPlayed: false,
                    endPlayed: false,
                    duration: dur,
                    details: `Invalid video duration: ${dur}`
                });
                return;
            }

            try {
                // 1. Test beginning (1s)
                const startOk = await testSegment(video, Math.min(1, dur * 0.1));
                // 2. Test middle (dur / 2)
                const midOk = await testSegment(video, dur / 2);
                // 3. Test end (dur - 2s or dur * 0.9)
                const endTarget = Math.max(0, dur - 2.5);
                const endOk = await testSegment(video, endTarget);

                clearTimeout(overallTimeout);
                cleanup();

                const allOk = startOk && midOk && endOk;
                resolve({
                    ok: allOk,
                    startPlayed: startOk,
                    midPlayed: midOk,
                    endPlayed: endOk,
                    duration: dur,
                    details: allOk ? 'Playback smooth across start, middle, and end' : `Playback check failed: start=${startOk}, mid=${midOk}, end=${endOk}`
                });
            } catch (err: unknown) {
                clearTimeout(overallTimeout);
                cleanup();
                const errMsg = err instanceof Error ? err.message : String(err);
                resolve({
                    ok: false,
                    startPlayed: false,
                    midPlayed: false,
                    endPlayed: false,
                    duration: dur,
                    details: `Playback error: ${errMsg}`
                });
            }
        };

        video.onerror = () => {
            clearTimeout(overallTimeout);
            cleanup();
            resolve({
                ok: false,
                startPlayed: false,
                midPlayed: false,
                endPlayed: false,
                duration: 0,
                details: 'Video load error during verification'
            });
        };
    });
}

function testSegment(video: HTMLVideoElement, seekTime: number): Promise<boolean> {
    return new Promise((resolve) => {
        let initialTime = -1;
        let updateCount = 0;

        const onSeeked = async () => {
            video.removeEventListener('seeked', onSeeked);
            initialTime = video.currentTime;

            const onTimeUpdate = () => {
                if (video.currentTime > initialTime) {
                    updateCount++;
                    if (updateCount >= 2) {
                        video.removeEventListener('timeupdate', onTimeUpdate);
                        clearTimeout(segTimeout);
                        resolve(true);
                    }
                }
            };

            video.addEventListener('timeupdate', onTimeUpdate);

            try {
                await video.play();
            } catch {
                video.removeEventListener('timeupdate', onTimeUpdate);
                clearTimeout(segTimeout);
                resolve(false);
            }
        };

        const segTimeout = setTimeout(() => {
            video.removeEventListener('seeked', onSeeked);
            resolve(updateCount >= 1);
        }, 3000);

        video.addEventListener('seeked', onSeeked);
        video.currentTime = seekTime;
    });
}
