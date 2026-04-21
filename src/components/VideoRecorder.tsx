'use client';

import { useState, useRef, useEffect } from 'react';
import { Video, Square, Loader2 } from 'lucide-react';

interface VideoRecorderProps {
    eventId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function VideoRecorder({ eventId, onSuccess, onCancel }: VideoRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [senderName, setSenderName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
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
                onCancel();
            });

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [onCancel]);

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
        if (streamRef.current && videoRef.current) {
            videoRef.current.src = '';
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.controls = false;
        }
    };

    const handleUpload = async () => {
        if (!recordedBlob || !senderName.trim()) {
            alert("Please record a video and enter your name.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('video', recordedBlob, 'video.webm');
        formData.append('eventId', eventId);
        formData.append('senderName', senderName);

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                onSuccess();
            } else {
                const errorData = await res.json();
                alert(errorData.error || "Upload failed");
            }
        } catch (e) {
            console.error(e);
            alert("An error occurred while uploading. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="modal-overlay animate-fade-in">
            <div className="modal-content">
                <h2 className="modal-title">Record Your Message</h2>

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

                {!recordedBlob ? (
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
                ) : (
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
                                Retake
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

                {!isRecording && !recordedBlob && (
                    <button onClick={onCancel} className="btn btn-outline btn-full mt-4">
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}
