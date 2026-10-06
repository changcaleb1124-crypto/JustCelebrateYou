'use client';

import Link from 'next/link';
import { CalendarHeart, ArrowRight } from 'lucide-react';

export default function LandingFooter() {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <section className="landing-section" style={{ paddingBottom: '2rem' }}>
            <div className="landing-container">
                {/* Concluding CTA Banner */}
                <div className="cta-banner">
                    <h2>Ready to celebrate someone special?</h2>
                    <p>
                        Start a celebration page today, invite friends and family to share their video messages, and give them a collection they can revisit.
                    </p>
                    <div>
                        <Link 
                            href="/login?redirect=/dashboard/create" 
                            className="btn"
                            style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: 'white',
                                color: 'var(--accent-color)',
                                fontWeight: 700,
                                padding: '16px 36px',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-md)',
                                fontSize: '1.125rem'
                            }}
                        >
                            Create a Celebration
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>

                {/* Footer Bar */}
                <footer className="landing-footer">
                    <div className="footer-inner">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', lineHeight: 1 }}>
                            <CalendarHeart size={22} color="#FF795C" strokeWidth={2.2} style={{ flexShrink: 0 }} aria-hidden="true" />
                            <span style={{ fontWeight: 700, letterSpacing: '-0.02em', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                                <span style={{ color: '#1F2937' }}>JustCelebrate</span>
                                <span style={{ color: '#FF795C' }}>You</span>
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Link href="/login" style={{ color: '#555', textDecoration: 'none' }}>
                                Log In
                            </Link>
                            <Link href="/login?redirect=/dashboard/create" style={{ color: '#555', textDecoration: 'none' }}>
                                Create Celebration
                            </Link>
                            <Link href="/dashboard" style={{ color: '#555', textDecoration: 'none' }}>
                                Dashboard
                            </Link>
                            <button 
                                onClick={scrollToTop} 
                                style={{ color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                Back to Top &uarr;
                            </button>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: '#888' }}>
                            &copy; {new Date().getFullYear()} JustCelebrateYou. All rights reserved.
                        </div>
                    </div>
                </footer>
            </div>
        </section>
    );
}
