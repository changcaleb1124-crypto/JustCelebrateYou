'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import CelebrationCover from './CelebrationCover';

interface CoverUploadModalProps {
    eventId: string;
    title: string;
    recipient: string;
    occasion?: string | null;
    currentCoverUrl?: string | null;
    isOpen: boolean;
    onClose: () => void;
    onCoverUpdated: (newCoverUrl: string | null) => void;
}

export default function CoverUploadModal({
    eventId,
    title,
    recipient,
    occasion,
    currentCoverUrl,
    isOpen,
    onClose,
    onCoverUpdated,
}: CoverUploadModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Trap focus and handle Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Cleanup object URL on unmount or file change
    useEffect(() => {
        if (selectedFile) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [selectedFile]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setErrorMsg('');
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setErrorMsg('Please select a JPG, PNG, or WebP image.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const MAX_SIZE = 4 * 1024 * 1024; // 4MB
        if (file.size > MAX_SIZE) {
            setErrorMsg('Image is too large. Maximum size is 4MB.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setSelectedFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsSaving(true);
        setErrorMsg('');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await fetch(`/api/events/${eventId}/cover`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to upload cover');
            }

            onCoverUpdated(data.coverUrl);
            onClose();
        } catch (err: unknown) {
            console.error('Cover upload error:', err);
            setErrorMsg((err as Error).message || 'An error occurred while uploading. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveCover = async () => {
        if (!currentCoverUrl && !selectedFile) return;

        if (selectedFile && !currentCoverUrl) {
            setSelectedFile(null);
            setPreviewUrl(null);
            return;
        }

        if (!confirm('Restore default illustration cover for this celebration?')) {
            return;
        }

        setIsRemoving(true);
        setErrorMsg('');

        try {
            const res = await fetch(`/api/events/${eventId}/cover`, {
                method: 'DELETE',
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to remove cover');
            }

            setSelectedFile(null);
            setPreviewUrl(null);
            onCoverUpdated(null);
            onClose();
        } catch (err: unknown) {
            console.error('Cover removal error:', err);
            setErrorMsg((err as Error).message || 'Failed to remove cover');
        } finally {
            setIsRemoving(false);
        }
    };

    const displayedCoverUrl = previewUrl || currentCoverUrl;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cover-modal-title"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(3px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={modalRef}
                className="card animate-fade-in"
                style={{
                    maxWidth: '480px',
                    width: '100%',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                    padding: '1.75rem',
                    position: 'relative',
                    border: '1px solid rgba(0,0,0,0.06)',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ImageIcon size={20} style={{ color: 'var(--accent-color)' }} />
                        <h2 id="cover-modal-title" style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1F2937' }}>
                            Celebration Cover
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '8px',
                            display: 'flex'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <p style={{ fontSize: '0.9rem', color: '#6B7280', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                    Choose a photo to personalize this celebration. If no photo is selected, a thoughtful default illustration will be displayed.
                </p>

                {errorMsg && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        borderRadius: '8px',
                        color: '#B91C1C',
                        fontSize: '0.875rem',
                        marginBottom: '1rem'
                    }}>
                        {errorMsg}
                    </div>
                )}

                {/* Cover Preview Area */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                        {selectedFile ? 'Selected Preview' : currentCoverUrl ? 'Current Cover' : 'Default Illustration'}
                    </span>
                    <CelebrationCover
                        coverUrl={displayedCoverUrl}
                        occasion={occasion}
                        title={title}
                        recipient={recipient}
                    />
                </div>

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedFile ? (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="btn btn-outline"
                                style={{ flex: 1, padding: '10px 16px', fontSize: '0.9rem', borderRadius: '10px' }}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUpload}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '10px 16px', fontSize: '0.9rem', borderRadius: '10px' }}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" /> Saving...
                                    </>
                                ) : (
                                    'Save New Cover'
                                )}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="btn btn-primary"
                                style={{
                                    flex: 1,
                                    padding: '10px 16px',
                                    fontSize: '0.9rem',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Upload size={16} />
                                {currentCoverUrl ? 'Replace Photo' : 'Upload Photo'}
                            </button>

                            {currentCoverUrl && (
                                <button
                                    type="button"
                                    onClick={handleRemoveCover}
                                    className="btn btn-outline"
                                    style={{
                                        padding: '10px 14px',
                                        fontSize: '0.9rem',
                                        borderRadius: '10px',
                                        color: '#DC2626',
                                        borderColor: '#FCA5A5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                    disabled={isRemoving}
                                    title="Restore default illustration"
                                >
                                    {isRemoving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    Restore Default
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
