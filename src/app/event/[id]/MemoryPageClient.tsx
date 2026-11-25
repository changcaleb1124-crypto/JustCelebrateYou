'use client';

import { useState, useRef } from 'react';
import { Video, CheckCircle2, Trash2, Upload, Camera, AlertCircle, UserPlus, Gift } from 'lucide-react';
import VideoRecorder from '@/components/VideoRecorder';
import CelebrationCover from '@/components/CelebrationCover';
import CoverUploadModal from '@/components/CoverUploadModal';
import ShareCelebrationModal from '@/components/ShareCelebrationModal';

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
    recipientUser?: { name: string | null } | null;
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
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [loadingInvite, setLoadingInvite] = useState(false);
    const [generatingLink, setGeneratingLink] = useState(false);
    const [shareModal, setShareModal] = useState<{
        isOpen: boolean;
        type: 'contributor' | 'recipient';
        url: string;
    }>({
        isOpen: false,
        type: 'contributor',
        url: '',
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Strictly determine if the logged-in user is the project creator
    const isCreator = Boolean(currentUserId && event.userId && currentUserId === event.userId);
    const savedRecipientDisplayName = event.recipientUser?.name?.trim() || event.recipient;

    const handleOpenInviteModal = async () => {
        setLoadingInvite(true);
        try {
            const res = await fetch(`/api/events/${event.id}/invite-link`, { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.inviteUrl) {
                setShareModal({
                    isOpen: true,
                    type: 'contributor',
                    url: data.inviteUrl,
                });
            } else {
                alert(data.error || 'Only the project creator can retrieve the contributor invite link.');
            }
        } catch {
            console.error('Error fetching invite link: INVITE_LINK_FETCH_FAILED');
            alert('Failed to retrieve invite link.');
        } finally {
            setLoadingInvite(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUploadError(null);
        const file = e.target.files?.[0];
        if (!file) return;

        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        if (file.size > MAX_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            setUploadError(`Video is too large (${sizeMB}MB). Please keep it under 50MB.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
        const validExts = ['.mp4', '.webm', '.mov', '.m4v'];
        const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();
        const isTypeValid = (file.type && validTypes.includes(file.type)) || validExts.includes(fileExt);

        if (!isTypeValid) {
            setUploadError("Invalid file type. Please upload an MP4, WebM, or MOV video.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setSelectedFile(file);
        setShowRecorder(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleOpenRecipientShareModal = async () => {
        setGeneratingLink(true);
        try {
            const res = await fetch(`/api/events/${event.id}/claim-link`, { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.claimUrl) {
                setShareModal({
                    isOpen: true,
                    type: 'recipient',
                    url: data.claimUrl,
                });
            } else {
                alert(data.error || 'Failed to generate recipient link');
            }
        } catch {
            alert('Error generating recipient link');
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
        } catch {
            console.error('Error refreshing messages: REFRESH_MESSAGES_FAILED');
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
        } catch {
            console.error('Error deleting message: DELETE_MESSAGE_FAILED');
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
                        accept="video/mp4,video/webm,video/quicktime,video/*,.mov,.mp4,.webm,.m4v"
                        onChange={handleFileChange}
                    />
                </div>

                {uploadError && (
                    <div style={{
                        color: '#DC2626',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        maxWidth: '520px',
                        margin: '1.25rem auto 0 auto',
                        textAlign: 'center'
                    }}>
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{uploadError}</span>
                    </div>
                )}

                {/* Dedicated Sharing Strip (separated from Record/Upload actions) */}
                {isCreator && (
                    <div
                        className="mt-6"
                        style={{
                            maxWidth: '720px',
                            margin: '1.75rem auto 0 auto',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: '1rem',
                            textAlign: 'left',
                        }}
                    >
                        {/* Action 1: Invite contributors */}
                        <div
                            style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #EDE8E1',
                                borderRadius: '14px',
                                padding: '1.1rem 1.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '0.85rem',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                            }}
                        >
                            <div>
                                <div className="flex items-center gap-2" style={{ marginBottom: '0.35rem' }}>
                                    <UserPlus size={16} style={{ color: '#2563EB' }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1F2937' }}>
                                        Collect video messages
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.825rem', color: '#4B5563', lineHeight: 1.45, margin: 0 }}>
                                    Ask friends and family to watch messages and add their own video for {event.recipient} (no account needed).
                                </p>
                            </div>
                            <button
                                className="btn btn-outline flex items-center justify-center gap-2"
                                style={{
                                    backgroundColor: '#F9FAFB',
                                    padding: '9px 14px',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    borderRadius: '10px',
                                    width: '100%',
                                    borderColor: '#D1D5DB',
                                    color: '#1F2937',
                                }}
                                onClick={handleOpenInviteModal}
                                disabled={loadingInvite}
                            >
                                <UserPlus size={16} />
                                {loadingInvite ? 'Loading...' : 'Invite contributors'}
                            </button>
                        </div>

                        {/* Action 2: Share with recipient OR Saved by recipient status */}
                        <div
                            style={{
                                backgroundColor: event.recipientUserId ? '#ECFDF5' : '#FFF8F4',
                                border: event.recipientUserId ? '1px solid #A7F3D0' : '1px solid #FFE4D6',
                                borderRadius: '14px',
                                padding: '1.1rem 1.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '0.85rem',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                            }}
                        >
                            {event.recipientUserId ? (
                                <div>
                                    <div className="flex items-center gap-2" style={{ marginBottom: '0.35rem' }}>
                                        <CheckCircle2 size={16} style={{ color: '#059669' }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065F46' }}>
                                            Saved by {savedRecipientDisplayName}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.825rem', color: '#047857', lineHeight: 1.45, margin: 0 }}>
                                        {savedRecipientDisplayName} has saved this celebration to their account and can revisit their video messages anytime.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <div className="flex items-center gap-2" style={{ marginBottom: '0.35rem' }}>
                                            <Gift size={16} style={{ color: '#C87D55' }} />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9A3412' }}>
                                                Deliver the gift to {event.recipient}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.825rem', color: '#B45309', lineHeight: 1.45, margin: 0 }}>
                                            Ready to reveal the celebration? Get the link for {event.recipient} to save this celebration to their account.
                                        </p>
                                    </div>
                                    <button
                                        className="btn btn-primary flex items-center justify-center gap-2"
                                        style={{
                                            padding: '9px 14px',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            borderRadius: '10px',
                                            width: '100%',
                                        }}
                                        onClick={handleOpenRecipientShareModal}
                                        disabled={generatingLink}
                                    >
                                        <Gift size={16} />
                                        {generatingLink ? 'Loading...' : 'Share with recipient'}
                                    </button>
                                </>
                            )}
                        </div>
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
                            padding: '3.25rem 1.5rem',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #EDE8E1',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
                        }}
                    >
                        <div className="flex justify-center mb-3">
                            <Video size={40} style={{ color: 'var(--accent-color)', opacity: 0.5 }} />
                        </div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1F2937' }}>
                            No video messages yet
                        </h3>
                        <p style={{ color: '#6B7280', fontSize: '0.925rem', maxWidth: '460px', margin: '0 auto', lineHeight: 1.5 }}>
                            Use <strong>Record Message</strong> or <strong>Upload Video</strong> above to add the first tribute, or invite contributors to join in.
                        </p>
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

            {/* Shared Confirmation Modal for Invite Contributors / Share with Recipient */}
            <ShareCelebrationModal
                isOpen={shareModal.isOpen}
                type={shareModal.type}
                url={shareModal.url}
                recipientName={event.recipient}
                messageCount={messages.length}
                onClose={() => setShareModal((prev) => ({ ...prev, isOpen: false }))}
                onSwitchToInvite={handleOpenInviteModal}
            />
        </main>
    );
}
