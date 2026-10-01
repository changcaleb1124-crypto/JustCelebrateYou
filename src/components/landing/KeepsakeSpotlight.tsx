'use client';

import { Gift, ShieldCheck, Heart, Library } from 'lucide-react';

export default function KeepsakeSpotlight() {
    return (
        <section className="landing-section" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
            <div className="landing-container">
                <div className="keepsake-wrapper">
                    <div className="keepsake-grid">
                        <div>
                            <div className="section-badge" style={{ backgroundColor: '#FFF3D6', color: '#B37D1A' }}>
                                <Gift size={15} />
                                <span>The Keepsake Experience</span>
                            </div>

                            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', fontWeight: 700, color: 'var(--text-color)', marginBottom: '1rem', lineHeight: 1.2 }}>
                                A gift they can return to whenever they need a lift.
                            </h2>

                            <p style={{ color: '#555', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                                Group messages often get buried in chat histories or lost across phones. When the recipient claims their celebration, the entire collection is saved to their personal account library.
                            </p>

                            <p style={{ color: '#555', fontSize: '1.05rem', lineHeight: 1.6 }}>
                                You also retain access in your own dashboard, allowing both of you to revisit the celebration whenever you want to feel close.
                            </p>
                        </div>

                        <div className="dual-access-box">
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-color)', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.65rem' }}>
                                Dual-Access Library
                            </div>

                            <div className="dual-access-item">
                                <div className="dual-access-item-icon">
                                    <Library size={18} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-color)' }}>
                                        Recipient: ‘Saved for You’
                                    </div>
                                    <div style={{ fontSize: '0.825rem', color: '#666', marginTop: '2px', lineHeight: 1.45 }}>
                                        Organized in the recipient’s personal library as soon as they claim their gift link.
                                    </div>
                                </div>
                            </div>

                            <div className="dual-access-item">
                                <div className="dual-access-item-icon" style={{ backgroundColor: 'rgba(255, 122, 89, 0.12)', color: 'var(--accent-color)' }}>
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-color)' }}>
                                        Creator: ‘Created by You’
                                    </div>
                                    <div style={{ fontSize: '0.825rem', color: '#666', marginTop: '2px', lineHeight: 1.45 }}>
                                        Remains in your creator dashboard alongside message counts and moderation controls.
                                    </div>
                                </div>
                            </div>

                            <div className="dual-access-item">
                                <div className="dual-access-item-icon" style={{ backgroundColor: 'rgba(93, 173, 226, 0.15)', color: 'var(--accent-blue)' }}>
                                    <Heart size={18} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-color)' }}>
                                        Shared Connection
                                    </div>
                                    <div style={{ fontSize: '0.825rem', color: '#666', marginTop: '2px', lineHeight: 1.45 }}>
                                        Both can log in anytime to re-watch the videos and remember how much they are celebrated.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
