'use client';

import { useState, useRef, useEffect } from 'react';
import { Video, Square, Loader2, Upload } from 'lucide-react';
import { storageClient } from '@/lib/storage-client';

interface VideoRecorderProps {
    eventId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

type Mode = 'record' | 'upload' | null;

export default function VideoRecorder({ eventId, onSuccess, onCancel }: VideoRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [senderName, setSenderName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [activeMode, setActiveMode] = useState<Mode>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeMode === 'record') {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(stream => {
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error("Error accessing media devices.", err);
                    alert("Camera and microphone access is required to record a message.");
                    setActiveMode(null);
                });
        }

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [activeMode]);

    const startRecording = () => {
        if (!streamRef.current) return;

        chunksRef.current = [];
        const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            setRecordedBlob(blob);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
                videoRef.current.src = URL.createObjectURL(blob);
                videoRef.current.controls = true;
            }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);

        setTimeLeft(60);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopRecording();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const resetRecording = () => {
        setRecordedBlob(null);
        if (activeMode === 'record' && streamRef.current && videoRef.current) {
            videoRef.current.src = '';
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.controls = false;
        } else if (activeMode === 'upload' && videoRef.current) {
            videoRef.current.src = '';
            videoRef.current.controls = false;
            setActiveMode(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        if (file.size > MAX_SIZE) {
            alert("Video is too large. Please keep it under 50MB.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (!validTypes.includes(file.type)) {
            alert("Invalid file type. Please upload an MP4, WebM, or MOV video.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setActiveMode('upload');
        setRecordedBlob(file);
        
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = URL.createObjectURL(file);
            videoRef.current.controls = true;
        }
    };

    const handleUpload = async () => {
        if (!recordedBlob || !senderName.trim()) {
            alert("Please record or select a video and enter your name.");
            return;
        }

        const MAX_SIZE = 50 * 1024 * 1024;
        if (recordedBlob.size > MAX_SIZE) {
            alert("Video is too large. Please keep it under 50MB.");
            return;
        }

        setIsUploading(true);

        try {
            const isFile = 'name' in recordedBlob;
            const originalName = isFile ? (recordedBlob as File).name : `video-${Date.now()}.webm`;
            const ext = originalName.split('.').pop() || 'webm';
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
                }),
            });

            if (res.ok) {
                onSuccess();
            } else {
                const errorData = await res.json();
                alert(errorData.error || "Failed to save message metadata.");
            }
        } catch (e) {
            console.error("Upload process failed:", e);
            alert("An error occurred while uploading. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="modal-overlay animate-fade-in">
            <div className="modal-content">
                <h2 className="modal-title">Record Your Message</h2>

                {!activeMode && !recordedBlob ? (
                    <div className="flex flex-col gap-4 py-8">
                        <button 
                            onClick={() => setActiveMode('record')}
                            className="btn btn-primary py-4 text-lg flex items-center justify-center gap-2"
                        >
                            <Video className="w-6 h-6" /> Record Video
                        </button>
                        <div className="text-center text-sm text-text-muted">or</div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-outline py-4 text-lg flex items-center justify-center gap-2"
                        >
                            <Upload className="w-6 h-6" /> Upload Video
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="video/mp4,video/webm,video/quicktime"
                            onChange={handleFileChange}
                        />
                    </div>
                ) : (
                    <>
                        <div className="video-preview-container">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted={!recordedBlob}
                                playsInline
                            />
                            {isRecording && (
                                <div className="recording-indicator">
                                    <span className="pulse-dot" />
                                    00:{timeLeft.toString().padStart(2, '0')}
                                </div>
                            )}
                        </div>

                        {!recordedBlob && activeMode === 'record' ? (
                            <div className="record-btn-container">
                                {!isRecording ? (
                                    <button onClick={startRecording} className="record-btn">
                                        <Video />
                                    </button>
                                ) : (
                                    <button onClick={stopRecording} className="record-btn recording">
                                        <Square />
                                    </button>
                                )}
                            </div>
                        ) : recordedBlob ? (
                            <div className="form-group">
                                <label className="form-label" htmlFor="senderName">Your Name</label>
                                <input
                                    id="senderName"
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Aunt Sarah"
                                    value={senderName}
                                    onChange={(e) => setSenderName(e.target.value)}
                                    autoFocus
                                />

                                <div className="flex gap-4 mt-4">
                                    <button
                                        onClick={resetRecording}
                                        className="btn btn-outline flex-1"
                                        disabled={isUploading}
                                    >
                                        {activeMode === 'record' ? 'Retake' : 'Choose Different Video'}
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
                        ) : null}
                    </>
                )}

                {!isRecording && !recordedBlob && (
                    <button onClick={onCancel} className="btn btn-outline btn-full mt-4">
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}
