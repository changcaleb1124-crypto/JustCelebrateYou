'use client';

import { useState, useRef, useEffect } from 'react';
import { Video, Square, Loader2, X, AlertCircle, Shield } from 'lucide-react';
import { storageClient } from '@/lib/storage-client';
import { fixWebmDuration } from '@/lib/webm-duration';
import { inspectMediaBlob, MediaInspectionResult } from '@/lib/media-inspector';
import { measureBlobDuration, verifyPlayback, PlaybackVerificationResult } from '@/lib/playback-verifier';
import ModalPortal from './ModalPortal';

interface VideoRecorderProps {
    eventId: string;
    initialFile?: File | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export interface DiagnosticReport {
    targetStopSec: number | string;
    stopReason: string;
    actualElapsedSec: number;
    countdownValueAtStop: number;
    mimeType: string;
    startupDelayMs: number;
    chunkCount: number;
    totalBytes: number;
    rawMedia: MediaInspectionResult;
    durationBeforePatchSec: number;
    durationAfterPatchSec: number;
    previewPlayerDurationSec: number;
    playback: PlaybackVerificationResult;
    timestamp: string;
}

export default function VideoRecorder({ eventId, initialFile, onSuccess, onCancel }: VideoRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(initialFile || null);
    const [senderName, setSenderName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Server-verified Admin Authorization & Diagnostics State
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAdminDiagnostics, setShowAdminDiagnostics] = useState(false);
    const showAdminDiagnosticsRef = useRef(false);

    // Diagnostics & Test Suite State
    const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [targetTestSec, setTargetTestSec] = useState<number | null>(null);
    const [forcedMime, setForcedMime] = useState<string>('auto');

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const onStartFiredAtRef = useRef<number>(0);
    const onCancelRef = useRef(onCancel);
    const targetTestSecRef = useRef<number | null>(null);
    const stopReasonRef = useRef<string>('manual');
    const timeLeftRef = useRef<number>(60);
    const stopCountdownValueRef = useRef<number>(60);

    useEffect(() => {
        onCancelRef.current = onCancel;
    });

    useEffect(() => {
        showAdminDiagnosticsRef.current = showAdminDiagnostics;
    }, [showAdminDiagnostics]);

    useEffect(() => {
        let active = true;
        fetch('/api/auth/admin-status')
            .then(res => res.json())
            .then(data => {
                if (active && data?.isAdmin) {
                    setIsAdmin(true);
                }
            })
            .catch(err => {
                console.error('Failed to verify admin status:', err);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        targetTestSecRef.current = targetTestSec;
    }, [targetTestSec]);

    // Set video src for initial file if provided
    useEffect(() => {
        if (initialFile && videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = URL.createObjectURL(initialFile);
            videoRef.current.controls = true;
        }
    }, [initialFile]);

    useEffect(() => {
        if (!initialFile) {
            // Constrain resolution and framerate to produce high quality HD video within budget
            const constraints: MediaStreamConstraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30, max: 30 },
                    facingMode: 'user'
                },
                audio: true
            };

            navigator.mediaDevices.getUserMedia(constraints)
                .catch(() => {
                    // Fallback to unconstrained if device rejects specific constraints
                    return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                })
                .then(stream => {
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error("Error accessing media devices.", err);
                    setErrorMessage("Camera and microphone access is required to record a message.");
                });
        }

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
        };
    }, [initialFile]);

    const getSupportedMimeType = () => {
        if (forcedMime === 'webm') {
            const webmCandidates = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'];
            for (const c of webmCandidates) {
                if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
                    return c;
                }
            }
        }
        if (forcedMime === 'mp4') {
            const mp4Candidates = ['video/mp4;codecs=avc1', 'video/mp4'];
            for (const c of mp4Candidates) {
                if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
                    return c;
                }
            }
        }

        const candidates = [
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
        ];
        for (const candidate of candidates) {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(candidate)) {
                return candidate;
            }
        }
        return '';
    };

    const startRecording = (testTargetSec?: number) => {
        if (!streamRef.current) return;
        setErrorMessage(null);
        setDiagnosticReport(null);
        chunksRef.current = [];
        startTimeRef.current = Date.now();
        onStartFiredAtRef.current = 0;
        stopReasonRef.current = testTargetSec ? `test_target_${testTargetSec}s` : 'manual';

        if (testTargetSec) {
            setTargetTestSec(testTargetSec);
        } else {
            setTargetTestSec(null);
        }

        const mimeType = getSupportedMimeType();
        const options: MediaRecorderOptions = {
            videoBitsPerSecond: 2500000, // 2.5 Mbps ensures a 60s recording is ~18MB (well below 50MB)
            audioBitsPerSecond: 128000,
        };
        if (mimeType) {
            options.mimeType = mimeType;
        }

        const mediaRecorder = new MediaRecorder(streamRef.current, options);

        mediaRecorder.onstart = () => {
            onStartFiredAtRef.current = Date.now();
            const startupDelay = onStartFiredAtRef.current - startTimeRef.current;
            console.log(`[RECORDER_DIAG] MediaRecorder onstart fired. Startup delay: ${startupDelay}ms, Mime: ${mediaRecorder.mimeType}`);
        };

        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                chunksRef.current.push(e.data);
                console.log(`[RECORDER_DIAG] Chunk #${chunksRef.current.length}: ${e.data.size} bytes at +${Date.now() - startTimeRef.current}ms`);
            }
        };

        mediaRecorder.onstop = async () => {
            const onStopFiredAt = Date.now();
            const elapsedMs = Math.max(1000, onStopFiredAt - startTimeRef.current);
            const recordedType = options.mimeType || mediaRecorder.mimeType || 'video/webm';
            const rawBlob = new Blob(chunksRef.current, { type: recordedType });

            console.log(`[RECORDER] onstop fired. Total chunks: ${chunksRef.current.length}, Total raw bytes: ${rawBlob.size}, Elapsed: ${elapsedMs}ms`);

            // Core recording fix: apply WebM duration fix to preserve entire video and accurate duration
            let finalBlob: Blob = rawBlob;
            try {
                finalBlob = await fixWebmDuration(rawBlob, elapsedMs);
            } catch (patchErr) {
                console.warn("[RECORDER] WebM duration patch skipped/failed:", patchErr);
            }

            setRecordedBlob(finalBlob);

            if (videoRef.current) {
                videoRef.current.srcObject = null;
                videoRef.current.src = URL.createObjectURL(finalBlob);
                videoRef.current.controls = true;
            }

            // Only run extra container inspection & multi-segment playback verification routines when admin diagnostics are ON
            if (showAdminDiagnosticsRef.current) {
                setIsAnalyzing(true);
                try {
                    // 1. Inspect raw container timestamps
                    const rawInspection = await inspectMediaBlob(rawBlob);

                    // 2. Measure unpatched raw blob duration in HTML5 video
                    const durationBeforePatch = await measureBlobDuration(rawBlob);

                    // 3. Measure patched blob duration
                    const durationAfterPatch = await measureBlobDuration(finalBlob);

                    // 4. Verify uninterrupted playback across start, middle, and end
                    const playbackRes = await verifyPlayback(finalBlob);

                    const report: DiagnosticReport = {
                        targetStopSec: targetTestSecRef.current ? targetTestSecRef.current : (stopReasonRef.current === 'auto_timer' ? 60 : 'manual'),
                        stopReason: stopReasonRef.current,
                        actualElapsedSec: elapsedMs / 1000,
                        countdownValueAtStop: stopCountdownValueRef.current,
                        mimeType: recordedType,
                        startupDelayMs: onStartFiredAtRef.current ? (onStartFiredAtRef.current - startTimeRef.current) : 0,
                        chunkCount: chunksRef.current.length,
                        totalBytes: rawBlob.size,
                        rawMedia: rawInspection,
                        durationBeforePatchSec: durationBeforePatch,
                        durationAfterPatchSec: durationAfterPatch,
                        previewPlayerDurationSec: durationAfterPatch,
                        playback: playbackRes,
                        timestamp: new Date().toISOString()
                    };

                    setDiagnosticReport(report);
                    console.log('[RECORD_REPORT]', JSON.stringify(report, null, 2));
                    if (typeof window !== 'undefined') {
                        const win = window as unknown as {
                            __lastRecorderReport?: DiagnosticReport;
                            __testReports?: DiagnosticReport[];
                        };
                        win.__lastRecorderReport = report;
                        win.__testReports = win.__testReports || [];
                        win.__testReports.push(report);
                    }
                } catch (err) {
                    console.error("[RECORDER_DIAG] Analysis failed:", err);
                } finally {
                    setIsAnalyzing(false);
                }
            }
        };

        mediaRecorderRef.current = mediaRecorder;
        // Timeslice of 1000ms guarantees regular chunk accumulation throughout recording
        mediaRecorder.start(1000);
        setIsRecording(true);

        setTimeLeft(60);
        timeLeftRef.current = 60;
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                const next = prev <= 1 ? 0 : prev - 1;
                timeLeftRef.current = next;
                if (prev <= 1) {
                    stopReasonRef.current = 'auto_timer';
                    stopRecording();
                    return 0;
                }
                return next;
            });
        }, 1000);

        // If a test target was specified (50s, 55s, 59s), schedule precise auto-stop
        if (testTargetSec && testTargetSec < 60) {
            autoStopTimeoutRef.current = setTimeout(() => {
                console.log(`[RECORDER_DIAG] Scheduled test target of ${testTargetSec}s reached. Triggering manual stop.`);
                stopReasonRef.current = `test_manual_stop_${testTargetSec}s`;
                stopRecording();
            }, testTargetSec * 1000);
        }
    };

    const stopRecording = () => {
        stopCountdownValueRef.current = timeLeftRef.current;
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (autoStopTimeoutRef.current) {
            clearTimeout(autoStopTimeoutRef.current);
            autoStopTimeoutRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            if (mediaRecorderRef.current.state === 'recording') {
                try {
                    mediaRecorderRef.current.requestData();
                } catch (e) {
                    console.warn("requestData error:", e);
                }
            }
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    const resetRecording = () => {
        setErrorMessage(null);
        if (initialFile) {
            onCancelRef.current();
            return;
        }
        setRecordedBlob(null);
        if (streamRef.current && videoRef.current) {
            videoRef.current.src = '';
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.controls = false;
        }
    };

    const handleUpload = async () => {
        setErrorMessage(null);
        if (!recordedBlob || !senderName.trim()) {
            setErrorMessage("Please record or select a video and enter your name.");
            return;
        }

        const MAX_SIZE = 50 * 1024 * 1024;
        if (recordedBlob.size > MAX_SIZE) {
            const sizeMB = (recordedBlob.size / (1024 * 1024)).toFixed(1);
            setErrorMessage(`Video is too large (${sizeMB}MB). Please keep it under 50MB.`);
            return;
        }

        setIsUploading(true);

        try {
            const isFile = 'name' in recordedBlob;
            let ext = 'webm';
            if (isFile) {
                const originalName = (recordedBlob as File).name;
                ext = originalName.split('.').pop() || 'webm';
            } else if (recordedBlob.type.includes('mp4')) {
                ext = 'mp4';
            } else if (recordedBlob.type.includes('quicktime')) {
                ext = 'mov';
            }
            const safeName = `video-${Date.now()}.${ext}`;

            const uploadResult = await storageClient.uploadVideo({
                file: recordedBlob,
                fileName: safeName,
                eventId: eventId,
            });

            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    eventId,
                    videoUrl: uploadResult.url,
                    senderName,
                    fileName: uploadResult.fileName,
                    fileSize: uploadResult.fileSize,
                    mimeType: uploadResult.mimeType,
                    uploadId: uploadResult.uploadId,
                    uploadToken: uploadResult.uploadToken,
                }),
            });

            if (res.ok) {
                onSuccess();
            } else {
                const errorData = await res.json();
                setErrorMessage(errorData.error || "Failed to save message metadata.");
            }
        } catch (e) {
            console.error("Upload process failed:", e);
            setErrorMessage("An error occurred while uploading. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <ModalPortal>
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="recorder-modal-title">
                <div className="modal-content">
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Close dialog"
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6B7280',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            zIndex: 10,
                        }}
                    >
                        <X size={20} />
                    </button>

                    <h2 id="recorder-modal-title" className="modal-title">
                        {initialFile ? "Upload Your Message" : "Record Your Message"}
                    </h2>

                    {errorMessage && (
                        <div style={{
                            color: '#DC2626',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div className="video-preview-container">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted={!recordedBlob}
                            playsInline
                            onLoadedMetadata={(e) => {
                                const v = e.currentTarget;
                                if (v.duration === Infinity) {
                                    v.currentTime = 1e101;
                                    v.addEventListener('timeupdate', function reset() {
                                        v.removeEventListener('timeupdate', reset);
                                        v.currentTime = 0;
                                    }, { once: true });
                                }
                            }}
                        />
                        {isRecording && (
                            <div className="recording-indicator">
                                <span className="pulse-dot" />
                                00:{timeLeft.toString().padStart(2, '0')}
                            </div>
                        )}
                    </div>

                    {!recordedBlob ? (
                        <div className="record-btn-container">
                            {!isRecording ? (
                                <button onClick={() => startRecording()} className="record-btn" aria-label="Start recording">
                                    <Video />
                                </button>
                            ) : (
                                <button onClick={stopRecording} className="record-btn recording" aria-label="Stop recording">
                                    <Square />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label" htmlFor="senderName">Your Name</label>
                            <input
                                id="senderName"
                                type="text"
                                className="form-input"
                                placeholder="e.g. Aunt Sarah"
                                value={senderName}
                                onChange={(e) => {
                                    setSenderName(e.target.value);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                autoFocus
                            />

                            <div className="flex gap-4 mt-4">
                                <button
                                    onClick={resetRecording}
                                    className="btn btn-outline flex-1"
                                    disabled={isUploading}
                                >
                                    {initialFile ? 'Choose Different Video' : 'Retake'}
                                </button>
                                <button
                                    onClick={handleUpload}
                                    className="btn btn-primary flex-1"
                                    disabled={isUploading || !senderName.trim()}
                                >
                                    {isUploading ? <Loader2 className="animate-spin" /> : 'Submit'}
                                </button>
                            </div>
                        </div>
                    )}

                    {showAdminDiagnostics && isAnalyzing && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.85rem',
                            backgroundColor: '#EFF6FF',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.875rem',
                            color: '#1D4ED8'
                        }}>
                            <Loader2 className="animate-spin" size={18} />
                            <span>Analyzing recording: inspecting container timestamps and testing playback...</span>
                        </div>
                    )}

                    {showAdminDiagnostics && diagnosticReport && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            backgroundColor: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            color: '#1F2937'
                        }}>
                            <div style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>📊 Recording Comparison Report</span>
                                <span style={{ color: diagnosticReport.playback.ok ? '#059669' : '#DC2626' }}>
                                    Playback: {diagnosticReport.playback.ok ? '✅ Smooth' : '❌ Issues'}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                <div><strong>Target Stop:</strong> {diagnosticReport.targetStopSec}s ({diagnosticReport.stopReason})</div>
                                <div><strong>Countdown at Stop:</strong> {diagnosticReport.countdownValueAtStop}s remaining</div>
                                <div><strong>Actual Elapsed (Wall Clock):</strong> {diagnosticReport.actualElapsedSec.toFixed(2)}s</div>
                                <div><strong>Startup Latency:</strong> {diagnosticReport.startupDelayMs}ms</div>
                                <div><strong>MIME / Container:</strong> {diagnosticReport.mimeType} ({diagnosticReport.rawMedia.format})</div>
                                <div><strong>Total Chunks / Bytes:</strong> {diagnosticReport.chunkCount} chunks ({((diagnosticReport.totalBytes) / (1024 * 1024)).toFixed(2)} MB)</div>
                                <div><strong>Raw Media Timestamps:</strong> {diagnosticReport.rawMedia.rawStartSec.toFixed(2)}s - {diagnosticReport.rawMedia.rawEndSec.toFixed(2)}s ({diagnosticReport.rawMedia.rawDurationSec.toFixed(2)}s)</div>
                                <div><strong>Duration Before Patch:</strong> {diagnosticReport.durationBeforePatchSec.toFixed(2)}s</div>
                                <div><strong>Duration After Patch:</strong> {diagnosticReport.durationAfterPatchSec.toFixed(2)}s</div>
                                <div><strong>Preview Video Duration:</strong> {diagnosticReport.previewPlayerDurationSec.toFixed(2)}s</div>
                            </div>
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #D1D5DB' }}>
                                <strong>Playback Check:</strong> Start: {diagnosticReport.playback.startPlayed ? '✅' : '❌'}, Mid: {diagnosticReport.playback.midPlayed ? '✅' : '❌'}, End: {diagnosticReport.playback.endPlayed ? '✅' : '❌'} ({diagnosticReport.playback.details})
                            </div>
                        </div>
                    )}

                    {/* Collapsible Test Reproduction Panel (Visible only when admin diagnostics enabled) */}
                    {showAdminDiagnostics && (
                        <details style={{ marginTop: '1rem', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#4B5563' }}>
                                🧪 Test Reproduction Suite (50s, 55s, 59s, 60s)
                            </summary>
                            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Codec Preference:</label>
                                    <select 
                                        value={forcedMime} 
                                        onChange={(e) => setForcedMime(e.target.value)}
                                        style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                                    >
                                        <option value="auto">Auto (MP4 first if supported)</option>
                                        <option value="webm">Force WebM (VP8/Opus)</option>
                                        <option value="mp4">Force MP4 (H.264)</option>
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <button
                                        id="test-btn-50s"
                                        type="button"
                                        onClick={() => startRecording(50)}
                                        disabled={isRecording || isAnalyzing}
                                        className="btn btn-outline"
                                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                    >
                                        Test 50s (Manual)
                                    </button>
                                    <button
                                        id="test-btn-55s"
                                        type="button"
                                        onClick={() => startRecording(55)}
                                        disabled={isRecording || isAnalyzing}
                                        className="btn btn-outline"
                                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                    >
                                        Test 55s (Manual)
                                    </button>
                                    <button
                                        id="test-btn-59s"
                                        type="button"
                                        onClick={() => startRecording(59)}
                                        disabled={isRecording || isAnalyzing}
                                        className="btn btn-outline"
                                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                    >
                                        Test 59s (Manual)
                                    </button>
                                    <button
                                        id="test-btn-60s"
                                        type="button"
                                        onClick={() => startRecording(60)}
                                        disabled={isRecording || isAnalyzing}
                                        className="btn btn-outline"
                                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                    >
                                        Test 60s (Auto Stop)
                                    </button>
                                </div>
                            </div>
                        </details>
                    )}

                    {/* Admin Diagnostics Toggle (Visible ONLY to verified site administrator) */}
                    {isAdmin && (
                        <div style={{
                            marginTop: '1.25rem',
                            padding: '0.65rem 0.85rem',
                            backgroundColor: '#F3F4F6',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <label
                                htmlFor="admin-diagnostics-toggle"
                                style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: '#374151',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    userSelect: 'none',
                                }}
                            >
                                <input
                                    id="admin-diagnostics-toggle"
                                    type="checkbox"
                                    checked={showAdminDiagnostics}
                                    onChange={(e) => setShowAdminDiagnostics(e.target.checked)}
                                    style={{
                                        cursor: 'pointer',
                                        width: '16px',
                                        height: '16px',
                                        accentColor: '#111827'
                                    }}
                                />
                                <span>Admin diagnostics</span>
                            </label>
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.72rem',
                                color: '#6B7280',
                                backgroundColor: '#E5E7EB',
                                padding: '2px 6px',
                                borderRadius: '4px'
                            }}>
                                <Shield size={12} />
                                Site Admin
                            </span>
                        </div>
                    )}

                    {!isRecording && (
                        <button onClick={onCancel} className="btn btn-outline btn-full mt-4">
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </ModalPortal>
    );
}
