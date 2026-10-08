'use client';

import { useState, useRef } from 'react';
import { Video, Copy, CheckCircle2, Trash2, Upload, Camera } from 'lucide-react';
import VideoRecorder from '@/components/VideoRecorder';
import CelebrationCover from '@/components/CelebrationCover';
import CoverUploadModal from '@/components/CoverUploadModal';
import { copyToClipboard } from '@/lib/url';

type Message = {
    id: string;
    videoUrl: string;
    senderName: string;
    createdAt: Date;
};

type EventData = {
    id: string;
    title: string;
    recipient: string;
    description: string | null;
    occasion?: string | null;
    coverUrl?: string | null;
    claimToken: string | null;
    userId?: string | null;
    recipientUserId: string | null;
    messages: Message[];
};

export default function MemoryPageClient({
    event,
    currentUserId,
}: {
    event: EventData;
    currentUserId?: string | null;
}) {
    const [messages, setMessages] = useState<Message[]>(event.messages);
    const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(event.coverUrl || null);
    const [showCoverModal, setShowCoverModal] = useState(false);
    const [showRecorder, setShowRecorder] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [copied, setCopied] = useState(false);
    const [generatingLink, setGeneratingLink] = useState(false);
    const [claimLink, setClaimLink] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Strictly determine if the logged-in user is the project creator
    const isCreator = Boolean(currentUserId && event.userId && currentUserId === event.userId);

    const handleCopyLink = async () => {
        try {
            const res = await fetch(`/api/events/${event.id}/invite-link`, { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.inviteUrl) {
                await copyToClipboard(data.inviteUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                alert(data.error || 'Only the project creator can retrieve the contributor invite link.');
            }
        } catch (e) {
            console.error('Error fetching invite link:', e);
            alert('Failed to retrieve invite link.');
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

        setSelectedFile(file);
        setShowRecorder(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleGenerateClaimLink = async () => {
        setGeneratingLink(true);
        try {
            const res = await fetch(`/api/events/${event.id}/claim-link`, { method: 'POST' });
            const data = await res.json();
            if (data.claimUrl) {
                setClaimLink(data.claimUrl);
            } else {
                alert(data.error || 'Failed to generate link');
            }
        } catch {
            alert('Error generating link');
        } finally {
            setGeneratingLink(false);
        }
    };

    const refreshMessages = async () => {
        try {
            const res = await fetch(`/api/events/${event.id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const res = await fetch(`/api/messages/${messageId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setMessages(messages.filter(m => m.id !== messageId));
            } else {
                alert('Failed to delete message');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred');
        }
    };

    return (
        <main className="container animate-fade-in" style={{ maxWidth: '860px', paddingBottom: '5rem' }}>
            <div className="hero" style={{ paddingTop: '1rem' }}>
                {/* Compact Celebration Cover Banner */}
                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '720px',
                        margin: '0 auto 1.75rem auto',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <CelebrationCover
                        coverUrl={currentCoverUrl}
                        occasion={event.occasion}
                        title={event.title}
                        recipient={event.recipient}
                        compact={true}
                    />

                    {/* Creator Edit Cover Control */}
                    {isCreator && (
                        <button
                            type="button"
                            onClick={() => setShowCoverModal(true)}
                            aria-label="Add or change cover image"
                            style={{
                                position: 'absolute',
                                bottom: '12px',
                                right: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: '#1F2937',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
                                transition: 'background-color 0.15s ease',
                            }}
                        >
                            <Camera size={14} style={{ color: 'var(--accent-color)' }} />
                            {currentCoverUrl ? 'Change Cover' : 'Add Cover'}
                        </button>
                    )}
                </div>

                <h1 className="hero-title" style={{ color: '#1F2937', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.25rem' }}>
                    {event.title}
                </h1>
                <p className="hero-subtitle mb-4" style={{ color: '#6B7280', fontSize: '1.1rem' }}>
                    For {event.recipient}
                </p>
                <div style={{ width: '48px', height: '3px', backgroundColor: 'var(--accent-color)', margin: '0 auto 1.25rem auto', borderRadius: '2px' }}></div>
                
                {event.description && (
                    <p className="mt-3 text-center" style={{ color: '#4B5563', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.5 }}>
                        {event.description}
                    </p>
                )}

                <div className="flex flex-wrap justify-center gap-3 mt-6" style={{ marginTop: '1.75rem' }}>
                    <button
                        className="btn btn-primary flex items-center gap-2"
                        style={{ padding: '11px 22px', fontSize: '0.95rem', borderRadius: '12px', width: 'auto' }}
                        onClick={() => {
                            setSelectedFile(null);
                            setShowRecorder(true);
                        }}
                    >
                        <Video size={18} />
                        Record Message
                    </button>
                    <button
                        className="btn btn-outline flex items-center gap-2"
                        style={{ backgroundColor: 'white', padding: '11px 18px', fontSize: '0.95rem', borderRadius: '12px', width: 'auto', borderColor: '#D1D5DB' }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={18} />
                        Upload Video
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleFileChange}
                    />
                    {/* Share Link button is strictly visible ONLY to the project creator */}
                    {isCreator && (
                        <button
                            className="btn btn-outline flex items-center gap-2"
                            style={{ backgroundColor: 'white', padding: '11px 18px', fontSize: '0.95rem', borderRadius: '12px', width: 'auto', borderColor: '#D1D5DB' }}
                            onClick={handleCopyLink}
                            title="Invite contributors to record messages"
                        >
                            {copied ? <CheckCircle2 size={18} style={{ color: '#10B981' }} /> : <Copy size={18} />}
                            {copied ? 'Invite Link Copied!' : 'Invite Contributors'}
                        </button>
                    )}
                </div>

                {/* Gifting Callout (Creator Only) */}
                {isCreator && !event.recipientUserId && (
                    <div
                        className="card mt-8 animate-fade-in"
                        style={{
                            marginTop: '2.5rem',
                            padding: '1.25rem 1.5rem',
                            backgroundColor: '#FFF8F4',
                            border: '1px solid #FFE4D6',
                            borderRadius: '16px',
                            maxWidth: '600px',
                            margin: '2.5rem auto 0 auto',
                            textAlign: 'left',
                        }}
                    >
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.4rem', color: '#9A3412' }}>
                            Gift this Celebration to {event.recipient}
                        </h3>
                        <p style={{ color: '#B45309', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            Would you like <strong>{event.recipient}</strong> to save this celebration to their personal account? Send them this private link when you are ready to reveal the gift.
                        </p>
                        <div>
                            <button
                                className="btn btn-primary"
                                onClick={handleGenerateClaimLink}
                                disabled={generatingLink}
                                style={{ padding: '8px 16px', fontSize: '0.875rem', width: 'auto', borderRadius: '8px' }}
                            >
                                {generatingLink ? 'Generating...' : claimLink || event.claimToken ? 'Get Recipient Link' : 'Create Recipient Link'}
                            </button>
                        </div>
                        {claimLink && (
                            <div className="mt-3 p-3 rounded flex justify-between items-center" style={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                <code style={{ fontSize: '0.825rem', wordBreak: 'break-all', color: '#374151', flex: 1, minWidth: '180px' }}>{claimLink}</code>
                                <button
                                    onClick={async () => {
                                        await copyToClipboard(claimLink);
                                        alert('Recipient claim link copied!');
                                    }}
                                    style={{ padding: '4px 10px', color: '#9A3412', fontWeight: 600, border: '1px solid #FED7AA', borderRadius: '6px', background: '#FFEDD5', fontSize: '0.8rem', cursor: 'pointer' }}
                                >
                                    Copy Link
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Video Messages Gallery */}
            <div style={{ marginTop: '3.5rem' }}>
                <h2 className="text-center mb-6" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1F2937' }}>
                    Video Messages ({messages.length})
                </h2>

                {messages.length === 0 ? (
                    <div
                        className="card text-center"
                        style={{
                            padding: '3.5rem 1.5rem',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #EDE8E1',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
                        }}
                    >
                        <div className="flex justify-center mb-3">
                            <Video size={40} style={{ color: 'var(--accent-color)', opacity: 0.5 }} />
                        </div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem', color: '#1F2937' }}>
                            Start the celebration &mdash; record or upload the first message!
                        </h3>
                        <button
                            className="btn btn-primary flex items-center"
                            style={{ width: 'auto', margin: '0 auto', fontSize: '0.95rem', padding: '10px 20px', borderRadius: '10px' }}
                            onClick={() => setShowRecorder(true)}
                        >
                            <Video size={18} />
                            Record Message
                        </button>
                    </div>
                ) : (
                    <div className="gallery-grid">
                        {messages.map((msg: Message) => (
                            <div
                                key={msg.id}
                                className="video-card"
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '16px',
                                    border: '1px solid #EDE8E1',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
                                }}
                            >
                                <video
                                    src={msg.videoUrl}
                                    controls
                                    className="video-player"
                                    preload="metadata"
                                />
                                <div className="video-info" style={{ padding: '0.75rem 1rem' }}>
                                    <h3 className="video-sender" style={{ fontSize: '1rem', fontWeight: 600, color: '#1F2937' }}>{msg.senderName}</h3>
                                    <p className="video-date" style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                                        {new Date(msg.createdAt).toLocaleDateString(undefined, {
                                            month: 'short', day: 'numeric', year: 'numeric'
                                        })}
                                    </p>
                                </div>
                                {isCreator && (
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="btn-danger"
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            padding: '8px',
                                            borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.92)',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                        title="Delete message"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Video Recording Modal */}
            {showRecorder && (
                <VideoRecorder
                    eventId={event.id}
                    initialFile={selectedFile}
                    onSuccess={() => {
                        setShowRecorder(false);
                        setSelectedFile(null);
                        refreshMessages();
                    }}
                    onCancel={() => {
                        setShowRecorder(false);
                        setSelectedFile(null);
                    }}
                />
            )}

            {/* Cover Upload Modal (Creator Only) */}
            {showCoverModal && (
                <CoverUploadModal
                    eventId={event.id}
                    title={event.title}
                    recipient={event.recipient}
                    occasion={event.occasion}
                    currentCoverUrl={currentCoverUrl}
                    isOpen={showCoverModal}
                    onClose={() => setShowCoverModal(false)}
                    onCoverUpdated={(newUrl) => setCurrentCoverUrl(newUrl)}
                />
            )}
        </main>
    );
}
