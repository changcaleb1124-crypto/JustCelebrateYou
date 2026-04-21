'use client';

import { Copy, Trash2, Video, CalendarHeart, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type EventPreview = {
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
                alert('Failed to delete memory page');
            }
        } catch (e) {
            alert('Error occurred');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="video-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', background: 'var(--surface-color)' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>{event.title}</h3>
                    <p style={{ color: '#555', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem' }}>
                        For {event.recipient}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#666', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Video size={16} />
                            {event._count.messages} Video Messages
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CalendarHeart size={16} />
                            {new Date(event.createdAt).toLocaleDateString()}
                        </div>
                        {!isReceived && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <span style={{ fontWeight: 500 }}>Claim Status:</span>
                                {event.recipientUserId ? (
                                    <span style={{ color: 'var(--success-color, green)' }}>Claimed</span>
                                ) : event.claimToken ? (
                                    <span style={{ color: 'var(--accent-blue, #6366f1)' }}>Invite Sent</span>
                                ) : (
                                    <span style={{ color: '#888' }}>Unclaimed</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1.25rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link href={`/event/${event.id}`} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem', flex: 1, display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <ExternalLink size={16} /> Open
                    </Link>
                    <button
                        onClick={handleCopy}
                        className="btn"
                        style={{ padding: '8px 16px', fontSize: '0.875rem', flex: 1, display: 'flex', gap: '6px', justifyContent: 'center', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', backgroundColor: 'transparent' }}
                        title="Copy share link"
                    >
                        {copied ? <span style={{ color: 'var(--accent-blue)', display: 'flex', gap: '6px', alignItems: 'center' }}>Copied!</span> : <><Copy size={16} /> Share</>}
                    </button>
                    {!isReceived && (
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="btn btn-danger"
                            style={{ padding: '8px', minWidth: '40px', display: 'flex', justifyContent: 'center' }}
                            title="Delete Memory Page"
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
                    <div className="card animate-fade-in" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--error-color)' }}>Delete Memory?</h3>
                        <p style={{ marginBottom: '1.5rem', color: '#555', lineHeight: '1.5' }}>
                            Are you sure you want to delete this memory? This will remove all videos automatically.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="btn btn-outline" style={{ flex: 1 }}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="btn" style={{ flex: 1, backgroundColor: 'var(--error-color)', color: 'white', borderColor: 'var(--error-color)' }}
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
