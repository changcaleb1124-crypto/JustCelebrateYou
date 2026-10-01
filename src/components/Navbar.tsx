'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarHeart, Menu, X } from 'lucide-react';

interface NavbarProps {
    isLanding?: boolean;
}

export default function Navbar({ isLanding = false }: NavbarProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
        }}>
            <div style={{
                maxWidth: '1140px',
                margin: '0 auto',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
            }}>
                {/* Brand Logo */}
                <Link 
                    href="/" 
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: 'clamp(1.05rem, 3vw, 1.25rem)', 
                        fontWeight: 700, 
                        color: 'var(--accent-color)', 
                        textDecoration: 'none',
                        flexShrink: 0
                    }}
                >
                    <CalendarHeart size={22} style={{ color: 'var(--accent-color)' }} />
                    <span>JustCelebrateYou</span>
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

                            {/* Mobile Hamburger Button for anchor links */}
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
                    /* Dashboard / App Navigation */
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Link href="/dashboard" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-color)', padding: '4px 6px' }}>
                            Dashboard
                        </Link>
                        <Link 
                            href="/dashboard/create" 
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
                        <Link href="/login" style={{ fontSize: '0.85rem', fontWeight: 500, color: '#666', padding: '4px 6px' }}>
                            Log In / Out
                        </Link>
                    </div>
                )}
            </div>

            {/* Mobile Expandable Menu for Landing Page */}
            {isLanding && mobileMenuOpen && (
                <div style={{
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'white',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                }}>
                    <a 
                        href="#how-it-works" 
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ fontSize: '0.95rem', color: '#444', fontWeight: 500, padding: '4px 0' }}
                    >
                        How It Works
                    </a>
                    <a 
                        href="#demo-preview" 
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ fontSize: '0.95rem', color: '#444', fontWeight: 500, padding: '4px 0' }}
                    >
                        Demo Preview
                    </a>
                    <a 
                        href="#occasions" 
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ fontSize: '0.95rem', color: '#444', fontWeight: 500, padding: '4px 0' }}
                    >
                        Occasions
                    </a>
                    <a 
                        href="#faq" 
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ fontSize: '0.95rem', color: '#444', fontWeight: 500, padding: '4px 0' }}
                    >
                        FAQ
                    </a>
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
