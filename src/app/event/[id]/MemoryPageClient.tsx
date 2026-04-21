'use client';

import { useState, useEffect } from 'react';
import { Video, Copy, CheckCircle2, Trash2, CalendarHeart } from 'lucide-react';
import VideoRecorder from '@/components/VideoRecorder';

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
    claimToken: string | null;
    recipientUserId: string | null;
    messages: Message[];
};

export default function MemoryPageClient({ event }: { event: EventData }) {
    const [messages, setMessages] = useState<Message[]>(event.messages);
    const [showRecorder, setShowRecorder] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [generatingLink, setGeneratingLink] = useState(false);
    const [claimLink, setClaimLink] = useState('');

    useEffect(() => {
        // Check if current user created this page
        const ownerToken = localStorage.getItem(`owner_${event.id}`);
        if (ownerToken) {
            setIsOwner(true);
        }
    }, [event.id]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
        } catch (e) {
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
        <main className="container animate-fade-in">
            <div className="hero">
                <div className="flex justify-center mb-4">
                    <CalendarHeart size={48} style={{ color: 'var(--accent-color)' }} />
                </div>
                <h1 className="hero-title">{event.title}</h1>
                <p className="hero-subtitle mb-4">For {event.recipient}</p>
                <div style={{ width: '60px', height: '4px', backgroundColor: 'var(--accent-color)', margin: '0 auto 1.5rem auto', borderRadius: '2px' }}></div>
                {event.description && (
                    <p className="mt-4 text-center" style={{ color: '#555', maxWidth: '600px', margin: '0 auto' }}>
                        {event.description}
                    </p>
                )}

                <div className="flex flex-wrap justify-center gap-4 mt-6" style={{ marginTop: '2rem' }}>
                    <button
                        className="btn btn-primary flex items-center gap-2"
                        onClick={() => setShowRecorder(true)}
                    >
                        <Video size={20} />
                        Record Message
                    </button>
                    <button
                        className="btn btn-outline flex items-center gap-2"
                        style={{ backgroundColor: 'white' }}
                        onClick={handleCopyLink}
                    >
                        {copied ? <CheckCircle2 size={20} style={{ color: 'green' }} /> : <Copy size={20} />}
                        {copied ? 'Link Copied!' : 'Share Link'}
                    </button>
                </div>

                {isOwner && !event.recipientUserId && (
                    <div className="card mt-10 animate-fade-in" style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: '#FFF9ED', border: '1px solid #F4B942', maxWidth: '600px', margin: '3rem auto 0 auto' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#B37D1A' }}>Gift this Celebration</h3>
                        <p style={{ color: '#8A5D07', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                            Would you like <strong>{event.recipient}</strong> to keep this celebration in their own account? They can save it forever in their personal library.
                        </p>
                        <div>
                            <button className="btn btn-primary" onClick={handleGenerateClaimLink} disabled={generatingLink} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                                {generatingLink ? 'Generating...' : claimLink || event.claimToken ? 'Generate Invite Link Again' : 'Create Invite Link'}
                            </button>
                        </div>
                        {claimLink && (
                            <div className="mt-4 p-3 rounded flex justify-between items-center" style={{ backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.1)' }}>
                                <code style={{ fontSize: '0.85rem', wordBreak: 'break-all', color: '#666' }}>{claimLink}</code>
                                <button onClick={() => { navigator.clipboard.writeText(claimLink); alert('Copied!'); }} style={{ marginLeft: '1rem', padding: '4px 8px', color: '#B37D1A', fontWeight: 600 }}>Copy</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '4rem' }}>
                <h2 className="text-center mb-6" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    Video Messages ({messages.length})
                </h2>

                {messages.length === 0 ? (
                    <div className="card text-center" style={{ padding: '4rem 2rem', color: '#666' }}>
                        <div className="flex justify-center mb-4">
                            <Video size={48} style={{ opacity: 0.3, color: 'var(--accent-color)' }} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '1.5rem', color: 'var(--text-color)' }}>
                            Start the celebration — record the first message.
                        </h2>
                        <button
                            className="btn btn-primary flex items-center"
                            style={{ width: 'auto', margin: '0 auto', fontSize: '1.125rem' }}
                            onClick={() => setShowRecorder(true)}
                        >
                            <Video size={20} />
                            Record Message
                        </button>
                    </div>
                ) : (
                    <div className="gallery-grid">
                        {messages.map((msg: Message) => (
                            <div key={msg.id} className="video-card">
                                <video
                                    src={msg.videoUrl}
                                    controls
                                    className="video-player"
                                    preload="metadata"
                                />
                                <div className="video-info">
                                    <h3 className="video-sender">{msg.senderName}</h3>
                                    <p className="video-date">
                                        {new Date(msg.createdAt).toLocaleDateString(undefined, {
                                            month: 'short', day: 'numeric', year: 'numeric'
                                        })}
                                    </p>
                                </div>
                                {isOwner && (
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="btn-danger"
                                        style={{ position: 'absolute', top: 8, right: 8, padding: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Delete message"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showRecorder && (
                <VideoRecorder
                    eventId={event.id}
                    onSuccess={() => {
                        setShowRecorder(false);
                        refreshMessages();
                    }}
                    onCancel={() => setShowRecorder(false)}
                />
            )}
        </main>
    );
}
