'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarHeart, Menu, X, ChevronDown, Settings, LogOut, KeyRound } from 'lucide-react';
import AccountSettingsModal from './AccountSettingsModal';

interface NavbarProps {
    isLanding?: boolean;
    user?: { name: string | null; email?: string | null };
}

export default function Navbar({ isLanding = false, user: initialUser }: NavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    
    // User state
    const [fetchedUser, setFetchedUser] = useState<{ name: string | null; email?: string | null } | null>(null);
    const [userOverride, setUserOverride] = useState<{ name: string | null; email?: string | null } | null>(null);
    const currentUser = userOverride ?? initialUser ?? fetchedUser;

    // Profile settings modal state
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [initialSettingsTab, setInitialSettingsTab] = useState<'profile' | 'password'>('profile');

    const profileMenuRef = useRef<HTMLDivElement>(null);
    const profileBtnRef = useRef<HTMLButtonElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const mobileBtnRef = useRef<HTMLButtonElement>(null);

    // Fetch user on client only if unprovided on non-landing routes
    useEffect(() => {
        if (!initialUser && !isLanding) {
            fetch('/api/auth/profile')
                .then(res => res.json())
                .then(data => {
                    if (data?.user) {
                        setFetchedUser(data.user);
                    }
                })
                .catch(() => {});
        }
    }, [initialUser, isLanding]);

    // Close menus on outside click or Escape
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setProfileMenuOpen(false);
            }
            if (
                mobileMenuOpen &&
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(e.target as Node) &&
                mobileBtnRef.current &&
                !mobileBtnRef.current.contains(e.target as Node)
            ) {
                setMobileMenuOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (mobileMenuOpen) {
                    setMobileMenuOpen(false);
                    mobileBtnRef.current?.focus();
                }
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
    }, [profileMenuOpen, showSettingsModal, mobileMenuOpen]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (e) {
            console.error('Logout error:', e);
            router.push('/login');
        }
    };

    const userInitial = currentUser?.name
        ? currentUser.name.trim().charAt(0).toUpperCase()
        : currentUser?.email
        ? currentUser.email.charAt(0).toUpperCase()
        : '?';

    const isDashboard = pathname === '/dashboard';

    return (
        <nav 
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backgroundColor: 'rgba(250, 247, 242, 0.95)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid #EDE8E1',
            }}
        >
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
                    aria-label="JustCelebrateYou home"
                    className="brand-logo"
                    style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '7px', 
                        textDecoration: 'none',
                        flexShrink: 0,
                        lineHeight: 1,
                        borderRadius: '6px',
                    }}
                >
                    <CalendarHeart 
                        size={22} 
                        color="#FF795C" 
                        strokeWidth={2.2} 
                        style={{ flexShrink: 0 }} 
                        aria-hidden="true" 
                    />
                    <span 
                        className="brand-logo-text"
                        style={{ 
                            fontSize: 'clamp(1.05rem, 3.5vw, 1.25rem)', 
                            fontWeight: 700, 
                            letterSpacing: '-0.02em',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'baseline',
                        }}
                    >
                        <span style={{ color: '#1F2937' }}>JustCelebrate</span>
                        <span style={{ color: '#FF795C' }}>You</span>
                    </span>
                </Link>

                {/* Landing Navigation */}
                {isLanding ? (
                    <>
                        {/* Desktop Navigation: Right side */}
                        <div 
                            className="landing-desktop-links" 
                            style={{
                                display: 'none',
                                alignItems: 'center',
                                gap: '1.5rem',
                            }}
                        >
                            <a 
                                href="#how-it-works" 
                                style={{ 
                                    fontSize: '0.925rem', 
                                    color: '#4B5563', 
                                    fontWeight: 500,
                                    textDecoration: 'none',
                                    transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#1F2937')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#4B5563')}
                            >
                                How It Works
                            </a>
                            <a 
                                href="#faq" 
                                style={{ 
                                    fontSize: '0.925rem', 
                                    color: '#4B5563', 
                                    fontWeight: 500,
                                    textDecoration: 'none',
                                    transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#1F2937')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#4B5563')}
                            >
                                FAQ
                            </a>
                            <Link 
                                href="/login" 
                                style={{ 
                                    fontSize: '0.925rem', 
                                    fontWeight: 500, 
                                    color: '#4B5563', 
                                    padding: '6px 4px',
                                    textDecoration: 'none',
                                    transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#1F2937')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#4B5563')}
                            >
                                Log In
                            </Link>
                            <Link 
                                href="/login?redirect=/dashboard/create" 
                                className="btn btn-primary" 
                                style={{ 
                                    padding: '9px 18px', 
                                    width: 'auto', 
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    borderRadius: '10px'
                                }}
                            >
                                Create Celebration
                            </Link>
                        </div>

                        {/* Mobile Hamburger Button: Single-row header on mobile */}
                        <button
                            ref={mobileBtnRef}
                            type="button"
                            aria-label="Toggle navigation menu"
                            aria-expanded={mobileMenuOpen}
                            aria-controls="landing-mobile-menu"
                            className="landing-mobile-menu-btn"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            style={{
                                display: 'none',
                                padding: '8px',
                                color: '#1F2937',
                                backgroundColor: 'transparent',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </>
                ) : currentUser ? (
                    /* Dashboard / App Navigation matching Mockup (Signed-in) */
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
                                            setInitialSettingsTab('profile');
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
                                        onClick={() => {
                                            setProfileMenuOpen(false);
                                            setInitialSettingsTab('password');
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
                                        <KeyRound size={15} style={{ color: '#6B7280' }} />
                                        Change Password
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
                ) : (
                    /* Public / Guest Navigation (Signed-out) */
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <Link
                            href={pathname && pathname !== '/' ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login'}
                            style={{
                                fontSize: '0.925rem',
                                fontWeight: 600,
                                color: '#4B5563',
                                padding: '6px 14px',
                                textDecoration: 'none',
                                borderRadius: '8px',
                                transition: 'all 0.15s ease',
                                border: '1px solid #E5E7EB',
                                backgroundColor: '#FFFFFF',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#1F2937';
                                e.currentTarget.style.borderColor = '#D1D5DB';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#4B5563';
                                e.currentTarget.style.borderColor = '#E5E7EB';
                            }}
                        >
                            Log In
                        </Link>
                    </div>
                )}
            </div>

            {/* Profile & Password Settings Modal */}
            <AccountSettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                user={currentUser}
                onUserUpdate={(updated) => {
                    setUserOverride(prev => ({ ...(prev || currentUser || { name: null, email: null }), name: updated.name }));
                }}
                initialTab={initialSettingsTab}
            />

            {/* Mobile Navigation Drawer for Landing */}
            {isLanding && mobileMenuOpen && (
                <div
                    ref={mobileMenuRef}
                    id="landing-mobile-menu"
                    role="dialog"
                    aria-label="Mobile Navigation Menu"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#FFFFFF',
                        borderBottom: '1px solid #EDE8E1',
                        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.08)',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        zIndex: 99,
                        animation: 'fadeIn 0.15s ease',
                    }}
                >
                    <a 
                        href="#how-it-works" 
                        className="landing-mobile-menu-link"
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ 
                            fontSize: '1rem', 
                            fontWeight: 500, 
                            color: '#1F2937', 
                            padding: '10px 0',
                            borderBottom: '1px solid #F3F4F6',
                            textDecoration: 'none'
                        }}
                    >
                        How It Works
                    </a>
                    <a 
                        href="#faq" 
                        className="landing-mobile-menu-link"
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ 
                            fontSize: '1rem', 
                            fontWeight: 500, 
                            color: '#1F2937', 
                            padding: '10px 0',
                            borderBottom: '1px solid #F3F4F6',
                            textDecoration: 'none'
                        }}
                    >
                        FAQ
                    </a>
                    <Link 
                        href="/login" 
                        className="landing-mobile-menu-link"
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ 
                            fontSize: '1rem', 
                            fontWeight: 500, 
                            color: '#1F2937', 
                            padding: '10px 0',
                            borderBottom: '1px solid #F3F4F6',
                            textDecoration: 'none'
                        }}
                    >
                        Log In
                    </Link>
                    <Link 
                        href="/login?redirect=/dashboard/create" 
                        className="btn btn-primary landing-mobile-menu-link"
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ 
                            width: '100%',
                            minHeight: '48px',
                            padding: '12px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            borderRadius: '12px',
                            marginTop: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        Create Celebration
                    </Link>
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
                :global(.landing-mobile-menu-btn:focus-visible),
                :global(.landing-mobile-menu-link:focus-visible) {
                    outline: 2px solid var(--accent-color) !important;
                    outline-offset: 2px !important;
                }
            `}</style>
        </nav>
    );
}
