'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarHeart, Menu, X, ChevronDown, User as UserIcon, Settings, LogOut, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
    isLanding?: boolean;
    user?: { name: string | null; email?: string | null };
}

export default function Navbar({ isLanding = false, user: initialUser }: NavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(initialUser || null);

    // Profile settings modal state
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [nameInput, setNameInput] = useState(initialUser?.name || '');
    const [isSavingName, setIsSavingName] = useState(false);
    const [nameError, setNameError] = useState('');
    const [nameSuccess, setNameSuccess] = useState('');

    const profileMenuRef = useRef<HTMLDivElement>(null);
    const profileBtnRef = useRef<HTMLButtonElement>(null);

    // Sync initialUser if updated
    useEffect(() => {
        if (initialUser) {
            setCurrentUser(initialUser);
            setNameInput(initialUser.name || '');
        }
    }, [initialUser]);

    // Close profile menu on outside click or Escape
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setProfileMenuOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (profileMenuOpen) {
                    setProfileMenuOpen(false);
                    profileBtnRef.current?.focus();
                }
                if (showSettingsModal) {
                    setShowSettingsModal(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [profileMenuOpen, showSettingsModal]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (e) {
            console.error('Logout error:', e);
            router.push('/login');
        }
    };

    const handleSaveName = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingName(true);
        setNameError('');
        setNameSuccess('');

        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput })
            });

            const data = await res.json();
            if (res.ok) {
                setCurrentUser(prev => prev ? { ...prev, name: nameInput.trim() } : { name: nameInput.trim() });
                setNameSuccess('Display name updated!');
                router.refresh();
                setTimeout(() => {
                    setShowSettingsModal(false);
                    setNameSuccess('');
                }, 1200);
            } else {
                setNameError(data.error || 'Failed to update name');
            }
        } catch {
            setNameError('An error occurred. Please try again.');
        } finally {
            setIsSavingName(false);
        }
    };

    const userInitial = currentUser?.name
        ? currentUser.name.trim().charAt(0).toUpperCase()
        : currentUser?.email
        ? currentUser.email.charAt(0).toUpperCase()
        : 'C';

    const isDashboard = pathname === '/dashboard';

    return (
        <nav style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}>
            <div style={{
                maxWidth: '1180px',
                margin: '0 auto',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
            }}>
                {/* Brand Logo */}
                <Link 
                    href="/" 
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: 'clamp(1.1rem, 3vw, 1.25rem)', 
                        fontWeight: 700, 
                        color: 'var(--accent-color)', 
                        textDecoration: 'none',
                        flexShrink: 0
                    }}
                >
                    <CalendarHeart size={22} style={{ color: 'var(--accent-color)' }} />
                    <span style={{ letterSpacing: '-0.01em' }}>JustCelebrateYou</span>
                </Link>

                {/* Landing Navigation (Desktop) */}
                {isLanding ? (
                    <>
                        <div className="landing-desktop-links" style={{
                            display: 'none',
                            alignItems: 'center',
                            gap: '1.5rem',
                        }}>
                            <a href="#how-it-works" style={{ fontSize: '0.9rem', color: '#555', fontWeight: 500 }}>How It Works</a>
                            <a href="#demo-preview" style={{ fontSize: '0.9rem', color: '#555', fontWeight: 500 }}>Demo Preview</a>
                            <a href="#occasions" style={{ fontSize: '0.9rem', color: '#555', fontWeight: 500 }}>Occasions</a>
                            <a href="#faq" style={{ fontSize: '0.9rem', color: '#555', fontWeight: 500 }}>FAQ</a>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Link 
                                href="/login" 
                                style={{ 
                                    fontSize: '0.875rem', 
                                    fontWeight: 500, 
                                    color: '#555', 
                                    padding: '6px 10px',
                                    display: 'inline-block'
                                }}
                            >
                                Log In
                            </Link>
                            <Link 
                                href="/login?redirect=/dashboard/create" 
                                className="btn btn-primary" 
                                style={{ 
                                    padding: '0.45rem 0.85rem', 
                                    width: 'auto', 
                                    fontSize: '0.85rem',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                Create Celebration
                            </Link>

                            <button
                                type="button"
                                aria-label="Toggle Navigation Menu"
                                className="landing-mobile-menu-btn"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                style={{
                                    display: 'none',
                                    padding: '6px',
                                    color: '#555',
                                    borderRadius: '6px',
                                }}
                            >
                                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                            </button>
                        </div>
                    </>
                ) : (
                    /* Dashboard / App Navigation matching Mockup */
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        {/* Dashboard Link with Coral Underline when Active */}
                        <Link
                            href="/dashboard"
                            style={{
                                fontSize: '0.925rem',
                                fontWeight: 600,
                                color: isDashboard ? 'var(--accent-color)' : '#4B5563',
                                padding: '6px 2px',
                                position: 'relative',
                                textDecoration: 'none',
                                borderBottom: isDashboard ? '2px solid var(--accent-color)' : '2px solid transparent',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            Dashboard
                        </Link>

                        {/* Profile Avatar & Accessible Dropdown */}
                        <div ref={profileMenuRef} style={{ position: 'relative' }}>
                            <button
                                ref={profileBtnRef}
                                type="button"
                                aria-haspopup="true"
                                aria-expanded={profileMenuOpen}
                                aria-label="User account menu"
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: '#FAF4EF',
                                    border: '1px solid #EADBCE',
                                    borderRadius: '9999px',
                                    padding: '3px 8px 3px 4px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '50%',
                                    backgroundColor: '#FF7A59',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                }}>
                                    {userInitial}
                                </span>
                                <ChevronDown size={14} style={{ color: '#6B7280' }} />
                            </button>

                            {/* Dropdown Menu */}
                            {profileMenuOpen && (
                                <div
                                    role="menu"
                                    aria-orientation="vertical"
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 'calc(100% + 8px)',
                                        width: '220px',
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                                        border: '1px solid rgba(0, 0, 0, 0.08)',
                                        padding: '0.5rem',
                                        zIndex: 200,
                                    }}
                                >
                                    {/* User Info Header */}
                                    <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #F3F4F6', marginBottom: '0.25rem' }}>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                            {currentUser?.name || 'Account'}
                                        </p>
                                        {currentUser?.email && (
                                            <p style={{ fontSize: '0.775rem', color: '#6B7280', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {currentUser.email}
                                            </p>
                                        )}
                                    </div>

                                    {/* Menu Items */}
                                    <button
                                        role="menuitem"
                                        type="button"
                                        onClick={() => {
                                            setProfileMenuOpen(false);
                                            setShowSettingsModal(true);
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.875rem',
                                            color: '#374151',
                                            borderRadius: '8px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            transition: 'background 0.1s ease'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        <Settings size={15} style={{ color: '#6B7280' }} />
                                        Account Settings
                                    </button>

                                    <button
                                        role="menuitem"
                                        type="button"
                                        onClick={handleLogout}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.875rem',
                                            color: '#DC2626',
                                            borderRadius: '8px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            transition: 'background 0.1s ease'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        <LogOut size={15} style={{ color: '#DC2626' }} />
                                        Log Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Settings Modal */}
            {showSettingsModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="settings-modal-title"
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
                        if (e.target === e.currentTarget) setShowSettingsModal(false);
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
                            position: 'relative',
                            border: '1px solid rgba(0,0,0,0.06)',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setShowSettingsModal(false)}
                            aria-label="Close dialog"
                            style={{
                                position: 'absolute',
                                top: '1.25rem',
                                right: '1.25rem',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#6B7280',
                                padding: '4px'
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                            <UserIcon size={20} style={{ color: 'var(--accent-color)' }} />
                            <h2 id="settings-modal-title" style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                Account Settings
                            </h2>
                        </div>
                        <p style={{ color: '#6B7280', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                            Customize how your name appears on celebrations you create.
                        </p>

                        {nameError && (
                            <div style={{ color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                {nameError}
                            </div>
                        )}
                        {nameSuccess && (
                            <div style={{ color: '#16A34A', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle2 size={16} /> {nameSuccess}
                            </div>
                        )}

                        <form onSubmit={handleSaveName}>
                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label" htmlFor="profile-display-name" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '6px' }}>
                                    Display Name
                                </label>
                                <input
                                    id="profile-display-name"
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter your name"
                                    required
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #D1D5DB',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowSettingsModal(false)}
                                    className="btn btn-outline"
                                    style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem', borderRadius: '10px' }}
                                    disabled={isSavingName}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem', borderRadius: '10px' }}
                                    disabled={isSavingName}
                                >
                                    {isSavingName ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                @media (min-width: 768px) {
                    :global(.landing-desktop-links) {
                        display: flex !important;
                    }
                }
                @media (max-width: 767px) {
                    :global(.landing-mobile-menu-btn) {
                        display: inline-flex !important;
                    }
                }
            `}</style>
        </nav>
    );
}
