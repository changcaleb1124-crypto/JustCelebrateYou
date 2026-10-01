'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Smartphone, Video, Share2, ArrowRight, CalendarHeart, Gift } from 'lucide-react';

export default function LandingHero() {
    return (
        <section className="hero-wrapper">
            <div className="landing-container">
                <div className="hero-grid">
                    {/* Left Column: Narrative & Action */}
                    <div style={{ textAlign: 'left' }}>
                        <div className="section-badge animate-fade-in">
                            <CalendarHeart size={15} />
                            <span>Group video celebrations made simple</span>
                        </div>

                        <h1 className="hero-title animate-fade-in" style={{ fontSize: 'clamp(2.1rem, 4.5vw, 3.5rem)', marginTop: '0.5rem', textAlign: 'inherit' }}>
                            Gather heartfelt video messages for the people you love.
                        </h1>

                        <p className="section-subtitle animate-fade-in" style={{ margin: '1.25rem 0 0 0', maxWidth: '560px', textAlign: 'inherit', fontSize: '1.1rem' }}>
                            One simple link collects video wishes from family and friends across distance. Share the celebration on their special day, and let them save the collection to their account to revisit anytime.
                        </p>

                        <div className="hero-actions animate-fade-in">
                            <Link 
                                href="/login?redirect=/dashboard/create" 
                                className="btn btn-primary"
                                style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    padding: '16px 28px',
                                    fontSize: '1.05rem',
                                    fontWeight: 600
                                }}
                            >
                                Create a Celebration
                                <ArrowRight size={18} />
                            </Link>
                            <a 
                                href="#demo-preview" 
                                className="btn btn-outline"
                                style={{ 
                                    padding: '16px 24px',
                                    fontSize: '1.05rem',
                                    backgroundColor: 'white'
                                }}
                            >
                                View Demo Preview
                            </a>
                        </div>

                        <div className="hero-trust-row animate-fade-in" style={{ marginTop: '2rem' }}>
                            <div className="hero-trust-item">
                                <Smartphone size={16} style={{ color: 'var(--accent-color)' }} />
                                <span>No app downloads</span>
                            </div>
                            <div className="hero-trust-item">
                                <Video size={16} style={{ color: 'var(--accent-blue)' }} />
                                <span>Record or upload</span>
                            </div>
                            <div className="hero-trust-item">
                                <Share2 size={16} style={{ color: '#F4B942' }} />
                                <span>Simple link sharing</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Visual Celebration Card Preview */}
                    <div className="animate-fade-in" style={{ position: 'relative' }}>
                        <div className="hero-visual-card">
                            {/* Card Top Bar */}
                            <div className="hero-visual-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CalendarHeart size={20} style={{ color: 'var(--accent-color)' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-color)' }}>
                                            Grandma Rose’s 80th
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#666' }}>
                                            For Rose &bull; 3 sample messages
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    backgroundColor: '#FFF3D6',
                                    color: '#B37D1A',
                                    padding: '3px 8px',
                                    borderRadius: '999px',
                                    border: '1px solid #F4B942'
                                }}>
                                    Fictional Sample
                                </span>
                            </div>

                            {/* Recipient Reaction Preview Banner */}
                            <div className="hero-recipient-badge">
                                <div style={{
                                    position: 'relative',
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    border: '2px solid white',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                                }}>
                                    <Image 
                                        src="/demo/recipient-joy.jpg" 
                                        alt="Grandma Rose enjoying her video messages"
                                        fill
                                        sizes="46px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#B37D1A' }}>
                                        Watching video greetings from family
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#8A5D07', marginTop: '1px' }}>
                                        Sample visual preview of recipient experience
                                    </div>
                                </div>
                            </div>

                            {/* Believable Video Message Thumbnails */}
                            <div className="hero-thumbnails-grid">
                                {/* Thumbnail 1: Family */}
                                <div className="hero-thumb-cell">
                                    <Image 
                                        src="/demo/family-wishes.jpg" 
                                        alt="Sarah and kids sending happy birthday video"
                                        fill
                                        sizes="(max-width: 768px) 33vw, 150px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <div className="hero-thumb-overlay">
                                        <div className="hero-thumb-name">Sarah & Kids</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <Video size={10} /> 0:58
                                        </div>
                                    </div>
                                </div>

                                {/* Thumbnail 2: Uncle Marcus */}
                                <div className="hero-thumb-cell">
                                    <Image 
                                        src="/demo/uncle-marcus.jpg" 
                                        alt="Uncle Marcus waving in a video greeting"
                                        fill
                                        sizes="(max-width: 768px) 33vw, 150px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <div className="hero-thumb-overlay">
                                        <div className="hero-thumb-name">Uncle Marcus</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <Video size={10} /> 0:48
                                        </div>
                                    </div>
                                </div>

                                {/* Thumbnail 3: Friends */}
                                <div className="hero-thumb-cell">
                                    <Image 
                                        src="/demo/friends-group.jpg" 
                                        alt="The Book Club friends celebrating together"
                                        fill
                                        sizes="(max-width: 768px) 33vw, 150px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <div className="hero-thumb-overlay">
                                        <div className="hero-thumb-name">The Book Club</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <Video size={10} /> 0:35
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Keepsake Tag */}
                            <div style={{
                                marginTop: '0.85rem',
                                paddingTop: '0.75rem',
                                borderTop: '1px solid #f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.75rem',
                                color: '#666'
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Gift size={13} style={{ color: '#B37D1A' }} />
                                    <span>Recipient can claim & revisit in their library</span>
                                </span>
                                <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>
                                    JustCelebrateYou
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
