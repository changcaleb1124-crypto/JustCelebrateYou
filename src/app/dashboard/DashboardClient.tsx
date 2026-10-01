'use client';

import { Copy, Trash2, Video, CalendarHeart, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type EventPreview = {
    id: string;
    title: string;
    recipient: string;
    createdAt: Date;
    recipientUserId: string | null;
    claimToken: string | null;
    _count: { messages: number };
};

export default function DashboardClient({ event, isReceived = false }: { event: EventPreview, isReceived?: boolean }) {
    const [copied, setCopied] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(`${window.location.origin}/event/${event.id}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
            if (res.ok) {
                setShowDeleteModal(false);
                router.refresh();
            } else {
                alert('Failed to delete celebration');
            }
        } catch {
            alert('Error occurred');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="video-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'clamp(1rem, 3vw, 1.5rem)', background: 'var(--surface-color)' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem', wordBreak: 'break-word' }}>{event.title}</h3>
                    <p style={{ color: '#555', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                        For {event.recipient}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#666', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Video size={15} />
                            {event._count.messages} Video Messages
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CalendarHeart size={15} />
                            {new Date(event.createdAt).toLocaleDateString()}
                        </div>
                        {!isReceived && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 500 }}>Claim Status:</span>
                                {event.recipientUserId ? (
                                    <span style={{ color: '#16a34a', fontWeight: 500 }}>Claimed</span>
                                ) : event.claimToken ? (
                                    <span style={{ color: 'var(--accent-blue, #6366f1)', fontWeight: 500 }}>Invite Sent</span>
                                ) : (
                                    <span style={{ color: '#888' }}>Unclaimed</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)', marginTop: '1.25rem', paddingTop: '1rem', gap: '0.4rem', alignItems: 'center' }}>
                    <Link 
                        href={`/event/${event.id}`} 
                        className="btn btn-primary" 
                        style={{ padding: '7px 12px', fontSize: '0.85rem', flex: 1, display: 'flex', gap: '5px', justifyContent: 'center' }}
                    >
                        <ExternalLink size={15} /> Open
                    </Link>
                    <button
                        onClick={handleCopy}
                        className="btn"
                        style={{ padding: '7px 12px', fontSize: '0.85rem', flex: 1, display: 'flex', gap: '5px', justifyContent: 'center', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', backgroundColor: 'transparent' }}
                        title="Copy share link"
                    >
                        {copied ? <span style={{ color: 'var(--accent-blue)', display: 'flex', gap: '4px', alignItems: 'center' }}>Copied!</span> : <><Copy size={15} /> Share</>}
                    </button>
                    {!isReceived && (
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="btn btn-danger"
                            style={{ padding: '7px 10px', display: 'flex', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}
                            title="Delete Celebration"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {showDeleteModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div className="card animate-fade-in" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--error-color)' }}>Delete Celebration?</h3>
                        <p style={{ marginBottom: '1.5rem', color: '#555', lineHeight: '1.5', fontSize: '0.95rem' }}>
                            Are you sure you want to delete this celebration? This will remove all collected messages automatically.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="btn btn-outline" style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem' }}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="btn" style={{ flex: 1, backgroundColor: 'var(--error-color)', color: 'white', borderColor: 'var(--error-color)', padding: '10px 14px', fontSize: '0.9rem' }}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
