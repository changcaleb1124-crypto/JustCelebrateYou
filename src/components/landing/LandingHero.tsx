'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CalendarHeart, ArrowRight } from 'lucide-react';

export default function LandingHero() {
    return (
        <section className="hero-wrapper">
            <div className="landing-container">
                <div className="hero-grid">
                    {/* Left Column: Narrative & Primary Action */}
                    <div className="hero-narrative">
                        <h1 className="hero-headline">
                            Bring their favorite people together.
                        </h1>

                        <p className="hero-description">
                            Collect heartfelt video messages from friends and family in one celebration they can keep and revisit.
                        </p>

                        <div className="hero-actions-container">
                            <Link 
                                href="/login?redirect=/dashboard/create" 
                                className="btn btn-primary hero-primary-btn"
                            >
                                Create a Celebration
                            </Link>
                            <p className="hero-supporting-line">
                                No app download needed.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Simplified Celebration Preview Card */}
                    <div className="hero-visual-wrapper">
                        <div className="hero-visual-card">
                            {/* Card Header: Celebration Title, Recipient, and Sample Label */}
                            <div className="hero-visual-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <div 
                                        style={{ 
                                            width: '32px', 
                                            height: '32px', 
                                            borderRadius: '8px', 
                                            backgroundColor: '#FFF2EB', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <CalendarHeart size={18} style={{ color: 'var(--accent-color)' }} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div 
                                            style={{ 
                                                fontWeight: 700, 
                                                fontSize: '0.95rem', 
                                                color: '#1F2937', 
                                                lineHeight: 1.25,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}
                                        >
                                            Grandma Rose’s 80th
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '1px' }}>
                                            For Rose
                                        </div>
                                    </div>
                                </div>

                                <span className="hero-sample-badge">
                                    Sample celebration
                                </span>
                            </div>

                            {/* 3 Message Thumbnails in a Row */}
                            <div className="hero-thumbnails-grid">
                                {/* Thumbnail 1: Sarah & Kids */}
                                <div className="hero-thumb-cell">
                                    <Image 
                                        src="/demo/family-wishes.jpg" 
                                        alt="Sarah and kids"
                                        fill
                                        sizes="(max-width: 768px) 30vw, 130px"
                                        style={{ objectFit: 'cover' }}
                                        priority
                                    />
                                    <div className="hero-thumb-overlay">
                                        <span className="hero-thumb-name">Sarah & Kids</span>
                                    </div>
                                </div>

                                {/* Thumbnail 2: Uncle Marcus */}
                                <div className="hero-thumb-cell">
                                    <Image 
                                        src="/demo/uncle-marcus.jpg" 
                                        alt="Uncle Marcus waving"
                                        fill
                                        sizes="(max-width: 768px) 30vw, 130px"
                                        style={{ objectFit: 'cover' }}
                                        priority
                                    />
                                    <div className="hero-thumb-overlay">
                                        <span className="hero-thumb-name">Uncle Marcus</span>
                                    </div>
                                </div>

                                {/* Thumbnail 3: The Book Club */}
                                <div className="hero-thumb-cell">
                                    <Image 
                                        src="/demo/friends-group.jpg" 
                                        alt="The Book Club friends"
                                        fill
                                        sizes="(max-width: 768px) 30vw, 130px"
                                        style={{ objectFit: 'cover' }}
                                        priority
                                    />
                                    <div className="hero-thumb-overlay">
                                        <span className="hero-thumb-name">The Book Club</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quieter "See an example →" link connecting to interactive demo */}
                            <div className="hero-example-link-wrapper">
                                <a 
                                    href="#demo-preview" 
                                    className="hero-example-link"
                                >
                                    <span>See an example</span>
                                    <ArrowRight size={14} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
