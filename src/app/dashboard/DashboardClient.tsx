'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Video,
    Calendar,
    Users,
    MoreVertical,
    Image as ImageIcon,
    Trash2,
    Copy,
    Check,
    X,
    Gift,
    Mail,
    CheckCircle2
} from 'lucide-react';
import CelebrationCover from '@/components/CelebrationCover';
import CoverUploadModal from '@/components/CoverUploadModal';

export type EventPreview = {
    id: string;
    title: string;
    recipient: string;
    description?: string | null;
    occasion?: string | null;
    coverUrl?: string | null;
    createdAt: Date | string;
    userId?: string | null;
    recipientUserId: string | null;
    claimToken: string | null;
    _count: { messages: number };
    recipientUser?: { id: string; name: string | null; email: string | null } | null;
    user?: { id: string; name: string | null; email: string | null } | null;
};

interface DashboardClientProps {
    user: { id: string; name: string | null; email: string };
    createdEvents: EventPreview[];
    savedEvents: EventPreview[];
}

export default function DashboardClient({
    user,
    createdEvents: initialCreatedEvents,
    savedEvents,
}: DashboardClientProps) {
    const router = useRouter();
    const [createdEvents, setCreatedEvents] = useState<EventPreview[]>(initialCreatedEvents);
    const [activeTab, setActiveTab] = useState<'created' | 'saved'>('created');
    const [dismissedGuide, setDismissedGuide] = useState(true); // default true for SSR, loaded in useEffect

    // Active Card 3-dot dropdown menu
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Modals
    const [coverModalEvent, setCoverModalEvent] = useState<EventPreview | null>(null);
    const [deleteModalEvent, setDeleteModalEvent] = useState<EventPreview | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Share / Gift Modal
    const [shareModal, setShareModal] = useState<{
        isOpen: boolean;
        type: 'contributor' | 'gift';
        event: EventPreview | null;
        url: string;
        title: string;
        description: string;
    }>({
        isOpen: false,
        type: 'contributor',
        event: null,
        url: '',
        title: '',
        description: ''
    });

    const [generatingGiftId, setGeneratingGiftId] = useState<string | null>(null);
    const [loadingInviteId, setLoadingInviteId] = useState<string | null>(null);
    const [copiedModalLink, setCopiedModalLink] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Load guide dismissal preference from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('jcy_dismiss_guide_banner');
        if (saved !== 'true') {
            setDismissedGuide(false);
        }
    }, []);

    // Close dropdown menus on outside click or Escape
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.card-menu-container')) {
                setOpenMenuId(null);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpenMenuId(null);
                if (shareModal.isOpen) setShareModal(prev => ({ ...prev, isOpen: false }));
                if (deleteModalEvent) setDeleteModalEvent(null);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [shareModal.isOpen, deleteModalEvent]);

    const handleDismissGuide = () => {
        setDismissedGuide(true);
        localStorage.setItem('jcy_dismiss_guide_banner', 'true');
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Open Contributor Share Modal (Creator Only, verified via server endpoint)
    const handleInviteContributors = async (event: EventPreview) => {
        if (!event.userId || event.userId !== user.id) {
            alert('Only the project creator can invite contributors.');
            return;
        }

        setLoadingInviteId(event.id);
        try {
            const res = await fetch(`/api/events/${event.id}/invite-link`, { method: 'POST' });
            const data = await res.json();

            if (res.ok && data.inviteUrl) {
                setShareModal({
                    isOpen: true,
                    type: 'contributor',
                    event,
                    url: data.inviteUrl,
                    title: `Invite Contributors for ${event.recipient}`,
                    description: `Share this link with friends, family, and colleagues so they can record or upload video messages.`
                });
                setCopiedModalLink(false);
            } else {
                alert(data.error || 'Only the project creator can retrieve the contributor invite link.');
            }
        } catch (e) {
            console.error('Error retrieving invite link:', e);
            alert('Failed to retrieve invite link. Please try again.');
        } finally {
            setLoadingInviteId(null);
        }
    };

    // Open Gift / Claim Modal (Creator Only)
    const handleGiftCelebration = async (event: EventPreview) => {
        if (!event.userId || event.userId !== user.id) {
            alert('Only the project creator can gift this celebration.');
            return;
        }

        setGeneratingGiftId(event.id);
        try {
            const res = await fetch(`/api/events/${event.id}/claim-link`, { method: 'POST' });
            const data = await res.json();

            if (res.ok && data.claimUrl) {
                setShareModal({
                    isOpen: true,
                    type: 'gift',
                    event,
                    url: data.claimUrl,
                    title: `Gift Celebration to ${event.recipient}`,
                    description: `Send this private claim link directly to ${event.recipient}. When they open it, they can save this entire collection of video messages into their own account.`
                });
                setCopiedModalLink(false);
            } else {
                alert(data.error || 'Failed to generate gifting link');
            }
        } catch (e) {
            console.error('Error generating gift link:', e);
            alert('An error occurred. Please try again.');
        } finally {
            setGeneratingGiftId(null);
        }
    };

    // Confirm Delete Celebration (Creator Only)
    const handleConfirmDelete = async () => {
        if (!deleteModalEvent) return;
        setIsDeleting(true);

        try {
            const res = await fetch(`/api/events/${deleteModalEvent.id}`, { method: 'DELETE' });
            if (res.ok) {
                setCreatedEvents(prev => prev.filter(e => e.id !== deleteModalEvent.id));
                setDeleteModalEvent(null);
                showToast('Celebration deleted successfully');
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete celebration');
            }
        } catch (e) {
            console.error('Delete error:', e);
            alert('Failed to delete celebration');
        } finally {
            setIsDeleting(false);
        }
    };

    // After cover updated in modal
    const handleCoverUpdated = (newCoverUrl: string | null) => {
        if (!coverModalEvent) return;
        setCreatedEvents(prev =>
            prev.map(e => (e.id === coverModalEvent.id ? { ...e, coverUrl: newCoverUrl } : e))
        );
        showToast(newCoverUrl ? 'Cover image updated!' : 'Restored default illustration');
        router.refresh();
    };

    const firstName = user.name ? user.name.trim().split(' ')[0] : 'there';

    return (
        <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '2rem 1.25rem 4rem 1.25rem' }}>
            {/* Toast Notification */}
            {toastMessage && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        backgroundColor: '#1F2937',
                        color: '#FFFFFF',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                        zIndex: 2000,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        animation: 'fadeIn 0.2s ease',
                    }}
                >
                    <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                    {toastMessage}
                </div>
            )}

            {/* Dashboard Header matching Mockup */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '1.25rem',
                    marginBottom: '1.75rem',
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)',
                            fontWeight: 700,
                            color: '#1F2937',
                            letterSpacing: '-0.02em',
                            margin: 0,
                            lineHeight: 1.2,
                        }}
                    >
                        Welcome back, {firstName}
                    </h1>
                    <p
                        style={{
                            fontSize: '1.05rem',
                            color: '#6B7280',
                            marginTop: '0.4rem',
                            marginBottom: 0,
                        }}
                    >
                        Bring people together to celebrate someone you love.
                    </p>
                </div>

                <Link
                    href="/dashboard/create"
                    className="btn btn-primary"
                    style={{
                        padding: '11px 22px',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: 'auto',
                    }}
                >
                    <Plus size={18} strokeWidth={2.5} />
                    Create a Celebration
                </Link>
            </div>

            {/* 3-Step Guidance Banner from Mockup (Dismissible for returning users) */}
            {!dismissedGuide && (
                <div
                    className="animate-fade-in"
                    style={{
                        backgroundColor: '#FFF8F4',
                        border: '1px solid #FFE4D6',
                        borderRadius: '16px',
                        padding: '1.25rem 1.5rem',
                        marginBottom: '2.25rem',
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(255, 122, 89, 0.04)',
                    }}
                >
                    <button
                        type="button"
                        onClick={handleDismissGuide}
                        aria-label="Dismiss guide"
                        title="Dismiss guide"
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#9CA3AF',
                            padding: '4px',
                            borderRadius: '6px',
                            display: 'flex',
                        }}
                    >
                        <X size={18} />
                    </button>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '1.25rem',
                            alignItems: 'center',
                            paddingRight: '1.5rem',
                        }}
                    >
                        {/* Step 1 */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <span
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: '#FFE6DC',
                                    color: 'var(--accent-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    flexShrink: 0,
                                }}
                            >
                                1
                            </span>
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                    Create a celebration
                                </h3>
                                <p style={{ fontSize: '0.825rem', color: '#6B7280', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                                    Set the occasion and add a few details.
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <span
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: '#FFE6DC',
                                    color: 'var(--accent-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    flexShrink: 0,
                                }}
                            >
                                2
                            </span>
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                    Invite video messages
                                </h3>
                                <p style={{ fontSize: '0.825rem', color: '#6B7280', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                                    Share a link with friends and family.
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <span
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: '#FFE6DC',
                                    color: 'var(--accent-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    flexShrink: 0,
                                }}
                            >
                                3
                            </span>
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                    Give a meaningful gift
                                </h3>
                                <p style={{ fontSize: '0.825rem', color: '#6B7280', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                                    We&apos;ll bring it all together for your recipient.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Section Tabs matching Mockup */}
            <div
                style={{
                    display: 'flex',
                    gap: '2rem',
                    borderBottom: '1px solid #E5E7EB',
                    marginBottom: '2rem',
                }}
            >
                <button
                    type="button"
                    onClick={() => setActiveTab('created')}
                    style={{
                        padding: '10px 4px',
                        fontSize: '1.05rem',
                        fontWeight: activeTab === 'created' ? 700 : 500,
                        color: activeTab === 'created' ? '#1F2937' : '#6B7280',
                        borderBottom: activeTab === 'created' ? '3px solid var(--accent-color)' : '3px solid transparent',
                        background: 'none',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                >
                    Created by You ({createdEvents.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('saved')}
                    style={{
                        padding: '10px 4px',
                        fontSize: '1.05rem',
                        fontWeight: activeTab === 'saved' ? 700 : 500,
                        color: activeTab === 'saved' ? '#1F2937' : '#6B7280',
                        borderBottom: activeTab === 'saved' ? '3px solid var(--accent-color)' : '3px solid transparent',
                        background: 'none',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                >
                    Saved for You ({savedEvents.length})
                </button>
            </div>

            {/* TAB CONTENT: Created by You */}
            {activeTab === 'created' && (
                <>
                    {createdEvents.length === 0 ? (
                        /* Empty State: Created */
                        <div
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: '16px',
                                border: '1px solid #EDE8E1',
                                padding: 'clamp(2.5rem, 6vw, 4rem) 1.5rem',
                                textAlign: 'center',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                            }}
                        >
                            <div
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    backgroundColor: '#FFF2EB',
                                    color: 'var(--accent-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1.25rem auto',
                                }}
                            >
                                <Video size={32} />
                            </div>
                            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#1F2937', marginBottom: '0.5rem' }}>
                                No celebrations created yet
                            </h2>
                            <p style={{ color: '#6B7280', maxWidth: '420px', margin: '0 auto 1.75rem auto', fontSize: '0.95rem' }}>
                                Create your first celebration to gather video messages from family and friends for someone special.
                            </p>
                            <Link
                                href="/dashboard/create"
                                className="btn btn-primary"
                                style={{
                                    padding: '11px 24px',
                                    fontSize: '0.95rem',
                                    borderRadius: '12px',
                                    display: 'inline-flex',
                                    width: 'auto',
                                }}
                            >
                                <Plus size={18} /> Create a Celebration
                            </Link>
                        </div>
                    ) : (
                        /* Grid of Created Celebrations + Side "Make it personal" Card */
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                gap: '1.5rem',
                                alignItems: 'stretch',
                            }}
                        >
                            {createdEvents.map(event => {
                                const isClaimed = Boolean(event.recipientUserId);
                                const isMenuOpen = openMenuId === event.id;
                                const isCreator = Boolean(event.userId && event.userId === user.id);
                                const createdDateStr = new Date(event.createdAt).toLocaleDateString(undefined, {
                                    month: 'long',
                                    day: 'numeric',
                                });

                                return (
                                    <div
                                        key={event.id}
                                        style={{
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '16px',
                                            border: '1px solid #EDE8E1',
                                            padding: '1.25rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                                            position: 'relative',
                                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                        }}
                                    >
                                        {/* Card Header: Title & 3-Dot Menu */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', gap: '8px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3
                                                    style={{
                                                        fontSize: '1.25rem',
                                                        fontWeight: 700,
                                                        color: '#1F2937',
                                                        margin: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    title={event.title}
                                                >
                                                    {event.title}
                                                </h3>
                                                <p style={{ fontSize: '0.9rem', color: '#6B7280', margin: '3px 0 0 0' }}>
                                                    For {event.recipient}
                                                </p>
                                            </div>

                                            {/* Three-Dot Menu (Creator Only) */}
                                            {isCreator && (
                                                <div className="card-menu-container" style={{ position: 'relative' }}>
                                                    <button
                                                        type="button"
                                                        aria-label="Celebration options"
                                                        aria-haspopup="true"
                                                        aria-expanded={isMenuOpen}
                                                        onClick={() => setOpenMenuId(isMenuOpen ? null : event.id)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            padding: '6px',
                                                            color: '#6B7280',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>

                                                    {isMenuOpen && (
                                                        <div
                                                            role="menu"
                                                            aria-orientation="vertical"
                                                            style={{
                                                                position: 'absolute',
                                                                right: 0,
                                                                top: '100%',
                                                                backgroundColor: '#FFFFFF',
                                                                borderRadius: '10px',
                                                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                                                                border: '1px solid rgba(0, 0, 0, 0.08)',
                                                                width: '180px',
                                                                zIndex: 50,
                                                                padding: '4px',
                                                            }}
                                                        >
                                                            <button
                                                                role="menuitem"
                                                                type="button"
                                                                onClick={() => {
                                                                    setOpenMenuId(null);
                                                                    setCoverModalEvent(event);
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    padding: '8px 10px',
                                                                    fontSize: '0.85rem',
                                                                    color: '#374151',
                                                                    borderRadius: '6px',
                                                                    textAlign: 'left',
                                                                    cursor: 'pointer',
                                                                }}
                                                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                                                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                                            >
                                                                <ImageIcon size={15} style={{ color: '#6B7280' }} />
                                                                {event.coverUrl ? 'Change Cover' : 'Add Cover Image'}
                                                            </button>

                                                            <button
                                                                role="menuitem"
                                                                type="button"
                                                                onClick={() => {
                                                                    setOpenMenuId(null);
                                                                    setDeleteModalEvent(event);
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    padding: '8px 10px',
                                                                    fontSize: '0.85rem',
                                                                    color: '#DC2626',
                                                                    borderRadius: '6px',
                                                                    textAlign: 'left',
                                                                    cursor: 'pointer',
                                                                }}
                                                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                                                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                                            >
                                                                <Trash2 size={15} style={{ color: '#DC2626' }} />
                                                                Delete Celebration
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Cover Image Area */}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <CelebrationCover
                                                coverUrl={event.coverUrl}
                                                occasion={event.occasion}
                                                title={event.title}
                                                recipient={event.recipient}
                                            />
                                        </div>

                                        {/* Status Badge */}
                                        <div style={{ marginBottom: '0.85rem' }}>
                                            {isClaimed ? (
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '4px 10px',
                                                        borderRadius: '9999px',
                                                        backgroundColor: '#ECFDF5',
                                                        color: '#059669',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                                                    Saved by recipient
                                                </span>
                                            ) : (
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '4px 10px',
                                                        borderRadius: '9999px',
                                                        backgroundColor: '#FFFBEB',
                                                        color: '#B45309',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span>
                                                    Not yet saved by the recipient
                                                </span>
                                            )}
                                        </div>

                                        {/* Metadata Lines */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#6B7280', marginBottom: '1.25rem', flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Video size={15} style={{ color: '#9CA3AF' }} />
                                                <span>{event._count.messages} video message{event._count.messages === 1 ? '' : 's'}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Calendar size={15} style={{ color: '#9CA3AF' }} />
                                                <span>Created {createdDateStr}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Users size={15} style={{ color: '#9CA3AF' }} />
                                                <span>
                                                    {isClaimed
                                                        ? `Saved by ${event.recipientUser?.name || 'recipient'}`
                                                        : 'Not yet saved by the recipient'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card Actions matching Mockup */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                            {/* Primary Button */}
                                            <Link
                                                href={`/event/${event.id}`}
                                                className="btn btn-primary"
                                                style={{
                                                    padding: '10px 16px',
                                                    fontSize: '0.925rem',
                                                    borderRadius: '10px',
                                                    fontWeight: 600,
                                                    width: '100%',
                                                }}
                                            >
                                                Open Celebration
                                            </Link>

                                            {/* Secondary Button: Invite Contributors (Creator Only) */}
                                            {isCreator && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleInviteContributors(event)}
                                                    disabled={loadingInviteId === event.id}
                                                    className="btn btn-outline"
                                                    style={{
                                                        padding: '9px 16px',
                                                        fontSize: '0.9rem',
                                                        borderRadius: '10px',
                                                        fontWeight: 500,
                                                        color: '#374151',
                                                        borderColor: '#D1D5DB',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '7px',
                                                        width: '100%',
                                                        backgroundColor: '#FFFFFF',
                                                    }}
                                                >
                                                    <Mail size={16} style={{ color: '#6B7280' }} />
                                                    {loadingInviteId === event.id ? 'Retrieving link...' : 'Invite Contributors'}
                                                </button>
                                            )}

                                            {/* Tertiary Link: Gift Celebration (Creator Only) */}
                                            {isCreator && !isClaimed && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleGiftCelebration(event)}
                                                    disabled={generatingGiftId === event.id}
                                                    style={{
                                                        padding: '4px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 500,
                                                        color: '#6B7280',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        textDecoration: 'underline',
                                                        textUnderlineOffset: '3px',
                                                    }}
                                                >
                                                    {generatingGiftId === event.id ? 'Preparing gift link...' : 'Gift This Celebration'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Companion "Make it personal" Card from Mockup */}
                            <div
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '16px',
                                    border: '1px solid #EDE8E1',
                                    padding: '2rem 1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
                                }}
                            >
                                <div
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '50%',
                                        backgroundColor: '#FFF2EB',
                                        color: 'var(--accent-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '1.25rem',
                                    }}
                                >
                                    <Gift size={32} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F2937', marginBottom: '0.5rem' }}>
                                    Make it personal
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: '#6B7280', lineHeight: 1.5, margin: 0, maxWidth: '240px' }}>
                                    Invite friends and family to share a story, a thank-you, or a wish.
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* TAB CONTENT: Saved for You (Recipient View) */}
            {activeTab === 'saved' && (
                <>
                    {savedEvents.length === 0 ? (
                        /* Empty State: Saved */
                        <div
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: '16px',
                                border: '1px solid #EDE8E1',
                                padding: 'clamp(2.5rem, 6vw, 4rem) 1.5rem',
                                textAlign: 'center',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                            }}
                        >
                            <div
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    backgroundColor: '#FFF8F4',
                                    color: 'var(--accent-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1.25rem auto',
                                }}
                            >
                                <Gift size={32} />
                            </div>
                            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#1F2937', marginBottom: '0.5rem' }}>
                                No celebrations saved for you yet
                            </h2>
                            <p style={{ color: '#6B7280', maxWidth: '420px', margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                When someone creates and gifts a celebration to you, it will appear here so you can revisit your video messages anytime.
                            </p>
                        </div>
                    ) : (
                        /* Grid of Saved Celebrations (Recipient-appropriate actions only) */
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                gap: '1.5rem',
                            }}
                        >
                            {savedEvents.map(event => {
                                const createdDateStr = new Date(event.createdAt).toLocaleDateString(undefined, {
                                    month: 'long',
                                    day: 'numeric',
                                });

                                return (
                                    <div
                                        key={event.id}
                                        style={{
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '16px',
                                            border: '1px solid #EDE8E1',
                                            padding: '1.25rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                                        }}
                                    >
                                        <div style={{ marginBottom: '0.85rem' }}>
                                            <h3
                                                style={{
                                                    fontSize: '1.25rem',
                                                    fontWeight: 700,
                                                    color: '#1F2937',
                                                    margin: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                                title={event.title}
                                            >
                                                {event.title}
                                            </h3>
                                            <p style={{ fontSize: '0.9rem', color: '#6B7280', margin: '3px 0 0 0' }}>
                                                {event.user?.name ? `Gifted by ${event.user.name}` : `For ${event.recipient}`}
                                            </p>
                                        </div>

                                        {/* Cover Image Area */}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <CelebrationCover
                                                coverUrl={event.coverUrl}
                                                occasion={event.occasion}
                                                title={event.title}
                                                recipient={event.recipient}
                                            />
                                        </div>

                                        {/* Recipient Status Badge */}
                                        <div style={{ marginBottom: '0.85rem' }}>
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '4px 10px',
                                                    borderRadius: '9999px',
                                                    backgroundColor: '#ECFDF5',
                                                    color: '#059669',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                <Check size={13} strokeWidth={3} />
                                                Saved to your account
                                            </span>
                                        </div>

                                        {/* Metadata */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#6B7280', marginBottom: '1.25rem', flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Video size={15} style={{ color: '#9CA3AF' }} />
                                                <span>{event._count.messages} video message{event._count.messages === 1 ? '' : 's'}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Calendar size={15} style={{ color: '#9CA3AF' }} />
                                                <span>Received {createdDateStr}</span>
                                            </div>
                                        </div>

                                        {/* Recipient Primary Action */}
                                        <Link
                                            href={`/event/${event.id}`}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '10px 16px',
                                                fontSize: '0.925rem',
                                                borderRadius: '10px',
                                                fontWeight: 600,
                                                width: '100%',
                                            }}
                                        >
                                            Open Celebration
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* MODAL: Cover Upload / Replace (Creator Only) */}
            {coverModalEvent && (
                <CoverUploadModal
                    eventId={coverModalEvent.id}
                    title={coverModalEvent.title}
                    recipient={coverModalEvent.recipient}
                    occasion={coverModalEvent.occasion}
                    currentCoverUrl={coverModalEvent.coverUrl}
                    isOpen={Boolean(coverModalEvent)}
                    onClose={() => setCoverModalEvent(null)}
                    onCoverUpdated={handleCoverUpdated}
                />
            )}

            {/* MODAL: Delete Confirmation (Creator Only) */}
            {deleteModalEvent && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-dialog-title"
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
                    onClick={e => {
                        if (e.target === e.currentTarget) setDeleteModalEvent(null);
                    }}
                >
                    <div
                        className="card animate-fade-in"
                        style={{
                            maxWidth: '420px',
                            width: '100%',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                            padding: '1.75rem',
                            border: '1px solid rgba(0,0,0,0.06)',
                        }}
                    >
                        <h2 id="delete-dialog-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#DC2626', marginBottom: '0.75rem' }}>
                            Delete Celebration?
                        </h2>
                        <p style={{ color: '#4B5563', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                            Are you sure you want to delete <strong>{deleteModalEvent.title}</strong>? This action will permanently remove all collected video messages and cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={() => setDeleteModalEvent(null)}
                                className="btn btn-outline"
                                style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem', borderRadius: '10px' }}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="btn"
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    fontSize: '0.9rem',
                                    borderRadius: '10px',
                                    backgroundColor: '#DC2626',
                                    color: '#FFFFFF',
                                }}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Share Links (Clear separation between Invite Contributors & Gift to Recipient) */}
            {shareModal.isOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="share-modal-title"
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
                    onClick={e => {
                        if (e.target === e.currentTarget) setShareModal(prev => ({ ...prev, isOpen: false }));
                    }}
                >
                    <div
                        className="card animate-fade-in"
                        style={{
                            maxWidth: '480px',
                            width: '100%',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                            padding: '1.75rem',
                            border: '1px solid rgba(0,0,0,0.06)',
                            position: 'relative',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setShareModal(prev => ({ ...prev, isOpen: false }))}
                            aria-label="Close dialog"
                            style={{
                                position: 'absolute',
                                top: '1.25rem',
                                right: '1.25rem',
                                background: 'none',
                                border: 'none',
                                color: '#6B7280',
                                cursor: 'pointer',
                                padding: '4px',
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                            {shareModal.type === 'gift' ? (
                                <Gift size={22} style={{ color: 'var(--accent-color)' }} />
                            ) : (
                                <Mail size={22} style={{ color: 'var(--accent-color)' }} />
                            )}
                            <h2 id="share-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                                {shareModal.title}
                            </h2>
                        </div>

                        <p style={{ color: '#4B5563', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                            {shareModal.description}
                        </p>

                        <div
                            style={{
                                backgroundColor: '#F9FAFB',
                                border: '1px solid #E5E7EB',
                                borderRadius: '10px',
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                marginBottom: '1.5rem',
                            }}
                        >
                            <code
                                style={{
                                    fontSize: '0.85rem',
                                    color: '#374151',
                                    wordBreak: 'break-all',
                                    fontFamily: 'monospace',
                                }}
                            >
                                {shareModal.url}
                            </code>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(shareModal.url);
                                    setCopiedModalLink(true);
                                    setTimeout(() => setCopiedModalLink(false), 2000);
                                }}
                                className="btn btn-primary"
                                style={{
                                    padding: '7px 14px',
                                    fontSize: '0.825rem',
                                    borderRadius: '8px',
                                    flexShrink: 0,
                                }}
                            >
                                {copiedModalLink ? (
                                    <>
                                        <Check size={14} /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} /> Copy
                                    </>
                                )}
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setShareModal(prev => ({ ...prev, isOpen: false }))}
                                className="btn btn-outline"
                                style={{ padding: '8px 18px', fontSize: '0.9rem', borderRadius: '10px' }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
