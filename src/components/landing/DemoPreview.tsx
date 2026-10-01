'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CalendarHeart, Video, Upload, Share2, Sparkles, Gift } from 'lucide-react';

export default function DemoPreview() {
    const [activePerspective, setActivePerspective] = useState<'contributor' | 'recipient' | 'creator'>('contributor');

    return (
        <section id="demo-preview" className="landing-section" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
            <div className="landing-container">
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div className="section-badge">
                        <Sparkles size={16} />
                        <span>Interactive Demo Walkthrough</span>
                    </div>
                    <h2 className="section-title">See what a celebration looks like.</h2>
                    <p className="section-subtitle">
                        Explore this labeled visual sample to see how friends contribute, how the recipient views their messages, and how the creator manages the page.
                    </p>
                </div>

                {/* Perspective Switcher Tabs */}
                <div style={{ maxWidth: '640px', margin: '0 auto 1.5rem auto' }}>
                    <div className="demo-tabs" role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activePerspective === 'contributor'}
                            className={`demo-tab-btn ${activePerspective === 'contributor' ? 'active' : ''}`}
                            onClick={() => setActivePerspective('contributor')}
                        >
                            Contributor View
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activePerspective === 'recipient'}
                            className={`demo-tab-btn ${activePerspective === 'recipient' ? 'active' : ''}`}
                            onClick={() => setActivePerspective('recipient')}
                        >
                            Recipient View
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activePerspective === 'creator'}
                            className={`demo-tab-btn ${activePerspective === 'creator' ? 'active' : ''}`}
                            onClick={() => setActivePerspective('creator')}
                        >
                            Creator View
                        </button>
                    </div>

                    {/* Educational Explanatory Notice */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        color: '#555',
                        textAlign: 'center',
                        border: '1px solid var(--border-color)',
                        marginBottom: '1.5rem'
                    }}>
                        {activePerspective === 'contributor' && (
                            <span>
                                <strong>Contributor Perspective:</strong> Anyone with your celebration link can record up to 60s or upload a video file up to 50MB directly in their browser.
                            </span>
                        )}
                        {activePerspective === 'recipient' && (
                            <span>
                                <strong>Recipient Perspective:</strong> The recipient receives the page on their special day, watches all messages, and can claim the celebration to save it to their account.
                            </span>
                        )}
                        {activePerspective === 'creator' && (
                            <span>
                                <strong>Creator Perspective:</strong> You retain access in your dashboard, can copy the share link, generate the recipient gift link, and moderate messages.
                            </span>
                        )}
                    </div>
                </div>

                {/* Main Demo Card */}
                <div className="demo-card">
                    {/* Demo Warning Banner */}
                    <div className="demo-top-bar">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                backgroundColor: '#B37D1A',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                letterSpacing: '0.04em'
                            }}>
                                DEMO SAMPLE
                            </span>
                            <span>Visual preview of an active celebration page (Non-recording demo)</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#8A5D07' }}>Sample Data</span>
                    </div>

                    <div style={{ padding: 'clamp(1.25rem, 3vw, 2.5rem)' }}>
                        {/* Demo Page Header */}
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                                <CalendarHeart size={44} style={{ color: 'var(--accent-color)' }} />
                            </div>
                            <h3 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 700, marginBottom: '0.25rem' }}>
                                Grandma Rose’s 80th Birthday Celebration
                            </h3>
                            <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '1rem' }}>
                                For Rose
                            </p>
                            <div style={{ width: '48px', height: '3px', backgroundColor: 'var(--accent-color)', margin: '0 auto 1rem auto', borderRadius: '2px' }} />
                            <p style={{ color: '#555', maxWidth: '580px', margin: '0 auto', fontSize: '0.95rem' }}>
                                “Leave a short video message wishing Grandma Rose a happy 80th birthday!”
                            </p>
                        </div>

                        {/* Demo Contributor Action Bar (Non-Deceptive) */}
                        <div style={{
                            backgroundColor: activePerspective === 'contributor' ? 'rgba(255, 122, 89, 0.08)' : '#fafafa',
                            border: activePerspective === 'contributor' ? '2px dashed var(--accent-color)' : '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1.25rem',
                            marginBottom: '2rem',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666', marginBottom: '0.75rem' }}>
                                {activePerspective === 'contributor' ? '⚡ Active Contributor Bar (As seen by guests):' : 'Contributor Action Bar (Sample):'}
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    backgroundColor: 'var(--accent-color)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    cursor: 'default'
                                }}>
                                    <Video size={16} />
                                    <span>Record Message (Sample)</span>
                                </div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    backgroundColor: 'white',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-color)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    cursor: 'default'
                                }}>
                                    <Upload size={16} />
                                    <span>Upload Video (Sample)</span>
                                </div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    backgroundColor: 'white',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-color)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    cursor: 'default'
                                }}>
                                    <Share2 size={16} />
                                    <span>Share Link (Sample)</span>
                                </div>
                            </div>
                        </div>

                        {/* Creator/Recipient Claim Notice Banner */}
                        {(activePerspective === 'recipient' || activePerspective === 'creator') && (
                            <div style={{
                                background: '#FFF9ED',
                                border: '1px solid #F4B942',
                                borderRadius: 'var(--radius-md)',
                                padding: '1.25rem',
                                marginBottom: '2rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: '#FFF3D6',
                                    color: '#B37D1A',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Gift size={20} />
                                </div>
                                <div style={{ flex: 1, minWidth: '220px' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#B37D1A', marginBottom: '0.2rem' }}>
                                        {activePerspective === 'recipient' ? 'A Gift for Rose — Save to Account' : 'Gift this Celebration to Rose'}
                                    </h4>
                                    <p style={{ fontSize: '0.85rem', color: '#8A5D07' }}>
                                        {activePerspective === 'recipient' 
                                            ? 'Rose can claim this celebration to save it to her personal account and revisit the messages anytime.'
                                            : 'The creator generates an invite link so Rose can claim this celebration into her own account library.'}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#B37D1A',
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600
                                }}>
                                    {activePerspective === 'recipient' ? 'Claim Celebration (Sample)' : 'Generate Invite Link (Sample)'}
                                </div>
                            </div>
                        )}

                        {/* Video Messages Sample Gallery (3 Realistic Reels) */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                                    Video Messages (3 Sample Messages)
                                </h4>
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>Demonstration preview &bull; Live celebrations support full video playback</span>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                                gap: '1.25rem'
                            }}>
                                {/* Sample Reel 1: Uncle Marcus */}
                                <div className="demo-reel-card">
                                    <Image 
                                        src="/demo/uncle-marcus.jpg" 
                                        alt="Sample demonstration message from Uncle Marcus"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 300px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.85) 100%)', zIndex: 1 }} />
                                    <span className="demo-reel-tag" style={{ zIndex: 2 }}>Sample Message</span>
                                    <span className="demo-reel-duration" style={{ zIndex: 2 }}>0:48 (Sample)</span>
                                    <div style={{ zIndex: 2 }}>
                                        <div style={{ fontWeight: 600, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Uncle Marcus</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>“Happy 80th, Rose! Love you!”</div>
                                    </div>
                                </div>

                                {/* Sample Reel 2: Sarah & Kids */}
                                <div className="demo-reel-card">
                                    <Image 
                                        src="/demo/family-wishes.jpg" 
                                        alt="Sample demonstration message from Sarah and kids"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 300px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.85) 100%)', zIndex: 1 }} />
                                    <span className="demo-reel-tag" style={{ zIndex: 2 }}>Sample Message</span>
                                    <span className="demo-reel-duration" style={{ zIndex: 2 }}>0:58 (Sample)</span>
                                    <div style={{ zIndex: 2 }}>
                                        <div style={{ fontWeight: 600, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Sarah, Liam & Emma</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>“Sending hugs from Denver!”</div>
                                    </div>
                                </div>

                                {/* Sample Reel 3: The Book Club */}
                                <div className="demo-reel-card">
                                    <Image 
                                        src="/demo/friends-group.jpg" 
                                        alt="Sample demonstration message from friends"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 300px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.85) 100%)', zIndex: 1 }} />
                                    <span className="demo-reel-tag" style={{ zIndex: 2 }}>Sample Message</span>
                                    <span className="demo-reel-duration" style={{ zIndex: 2 }}>0:35 (Sample)</span>
                                    <div style={{ zIndex: 2 }}>
                                        <div style={{ fontWeight: 600, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>The Book Club</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>“Cheers to many more chapters!”</div>
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
