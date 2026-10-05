'use client';

import { useState } from 'react';

interface CelebrationCoverProps {
    coverUrl?: string | null;
    occasion?: string | null;
    title: string;
    recipient?: string;
    className?: string;
    style?: React.CSSProperties;
    compact?: boolean;
}

export default function CelebrationCover({
    coverUrl,
    occasion,
    title,
    recipient,
    className = '',
    style = {},
    compact = false
}: CelebrationCoverProps) {
    const [imgFailed, setImgFailed] = useState(false);

    const hasValidCustomCover = Boolean(coverUrl && !imgFailed);
    const normalizedOccasion = occasion ? occasion.toLowerCase().trim() : null;

    return (
        <div
            className={`celebration-cover-container ${className}`}
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: compact ? '21 / 9' : '16 / 9',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F5EFEB',
                ...style,
            }}
        >
            {hasValidCustomCover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={coverUrl!}
                    alt={`${title} cover`}
                    onError={() => setImgFailed(true)}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                    }}
                />
            ) : (
                <DefaultCoverIllustration
                    occasion={normalizedOccasion}
                    recipient={recipient}
                />
            )}
        </div>
    );
}

function DefaultCoverIllustration({
    occasion,
    recipient
}: {
    occasion: string | null;
    recipient?: string;
}) {
    // 1. Birthday: Cake with candles & gentle stars
    if (occasion === 'birthday') {
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #FFF1E8 0%, #FFE6DA 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    userSelect: 'none'
                }}
            >
                <svg
                    width="72"
                    height="72"
                    viewBox="0 0 72 72"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(255, 122, 89, 0.15))' }}
                >
                    {/* Cake Base */}
                    <rect x="16" y="38" width="40" height="20" rx="4" fill="#FF7A59" fillOpacity="0.85" />
                    {/* Cake Frosting Layer */}
                    <path
                        d="M16 42C18.5 44 21 44 23.5 42C26 40 28.5 40 31 42C33.5 44 36 44 38.5 42C41 40 43.5 40 46 42C48.5 44 51 44 53.5 42C54.8 40.9 55.6 41.5 56 42V38H16V42Z"
                        fill="#FFFFFF"
                    />
                    {/* Middle Plate */}
                    <rect x="12" y="58" width="48" height="3" rx="1.5" fill="#E86B4D" />
                    {/* Candles */}
                    <rect x="25" y="24" width="3" height="14" rx="1.5" fill="#FFB088" />
                    <rect x="34.5" y="22" width="3" height="16" rx="1.5" fill="#FFB088" />
                    <rect x="44" y="24" width="3" height="14" rx="1.5" fill="#FFB088" />
                    {/* Candle Flames */}
                    <path d="M26.5 18C25.5 20 25.5 22 26.5 23C27.5 22 27.5 20 26.5 18Z" fill="#F59E0B" />
                    <path d="M36 15C35 17.5 35 20 36 21C37 20 37 17.5 36 15Z" fill="#F59E0B" />
                    <path d="M45.5 18C44.5 20 44.5 22 45.5 23C46.5 22 46.5 20 45.5 18Z" fill="#F59E0B" />
                    {/* Floating subtle spark */}
                    <circle cx="18" cy="24" r="1.5" fill="#F59E0B" opacity="0.6" />
                    <circle cx="53" cy="26" r="1.5" fill="#F59E0B" opacity="0.6" />
                </svg>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#C05621', marginTop: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Birthday Celebration
                </span>
            </div>
        );
    }

    // 2. Graduation: Cap & Diploma
    if (occasion === 'graduation') {
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #EFF4F8 0%, #DFE8F0 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    userSelect: 'none'
                }}
            >
                <svg
                    width="72"
                    height="72"
                    viewBox="0 0 72 72"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(71, 85, 105, 0.15))' }}
                >
                    {/* Mortarboard Top (Diamond) */}
                    <polygon points="36,18 60,28 36,38 12,28" fill="#334155" />
                    {/* Cap Skull Underneath */}
                    <path d="M22 33V43C22 43 27 49 36 49C45 49 50 43 50 43V33L36 39L22 33Z" fill="#1E293B" />
                    {/* Tassel String */}
                    <path d="M36 28L54 36V48" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Tassel Tuft */}
                    <ellipse cx="54" cy="49" rx="2.5" ry="3.5" fill="#F59E0B" />
                    {/* Small button on top */}
                    <circle cx="36" cy="28" r="2.5" fill="#0F172A" />
                </svg>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginTop: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Graduation Celebration
                </span>
            </div>
        );
    }

    // 3. Anniversary: Delicate Hearts
    if (occasion === 'anniversary') {
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #FDF2F2 0%, #FCE7E7 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    userSelect: 'none'
                }}
            >
                <svg
                    width="72"
                    height="72"
                    viewBox="0 0 72 72"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(225, 29, 72, 0.15))' }}
                >
                    {/* Left Heart */}
                    <path
                        d="M27 24C22.6 24 19 27.6 19 32C19 39 28 46 29 47C29.6 47.4 30.4 47.4 31 47C32 46 41 39 41 32C41 27.6 37.4 24 33 24C30.5 24 28.3 25.2 27 27C25.7 25.2 23.5 24 21 24H27Z"
                        fill="#F43F5E"
                        fillOpacity="0.8"
                    />
                    {/* Right Heart (overlapping slightly) */}
                    <path
                        d="M45 20C41.7 20 39 22.7 39 26C39 31.2 46 36.5 46.8 37.2C47.2 37.5 47.8 37.5 48.2 37.2C49 36.5 56 31.2 56 26C56 22.7 53.3 20 50 20C48.1 20 46.5 20.9 45.5 22.2C44.5 20.9 42.9 20 41 20H45Z"
                        fill="#FF7A59"
                        fillOpacity="0.9"
                    />
                    {/* Subtle sparkle dots */}
                    <circle cx="16" cy="22" r="1.5" fill="#FB7185" />
                    <circle cx="55" cy="44" r="1.5" fill="#FB7185" />
                </svg>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#BE123C', marginTop: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Anniversary Celebration
                </span>
            </div>
        );
    }

    // 4. General Appreciation / Legacy / Unknown Occasion:
    // Classic illustrated gift box with ribbon and heart (matching the dashboard concept mockup)
    const initial = recipient ? recipient.trim().charAt(0).toUpperCase() : null;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #FAF4EE 0%, #F5ECE3 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                userSelect: 'none'
            }}
        >
            <svg
                width="68"
                height="68"
                viewBox="0 0 68 68"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: 'drop-shadow(0 2px 6px rgba(180, 83, 9, 0.1))' }}
            >
                {/* Gift Box Base */}
                <rect x="18" y="28" width="32" height="24" rx="3" fill="#FFFFFF" stroke="#D97706" strokeWidth="1.8" />
                {/* Gift Box Lid */}
                <rect x="15" y="23" width="38" height="7" rx="2" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.8" />
                {/* Vertical Ribbon */}
                <rect x="31.5" y="23" width="5" height="29" fill="#FF7A59" />
                {/* Ribbon Bow Loops */}
                <path
                    d="M34 23C31 17 22 17 25 22C27 24 33 23 34 23Z"
                    fill="#FF7A59"
                    stroke="#FF7A59"
                    strokeWidth="1"
                />
                <path
                    d="M34 23C37 17 46 17 43 22C41 24 35 23 34 23Z"
                    fill="#FF7A59"
                    stroke="#FF7A59"
                    strokeWidth="1"
                />
                {/* Little heart on gift front */}
                <path
                    d="M34 38.5C32.8 37 30 37 30 38.8C30 40.5 34 43 34 43C34 43 38 40.5 38 38.8C38 37 35.2 37 34 38.5Z"
                    fill="#FF7A59"
                />
                {/* Gentle sparkle stars */}
                <path d="M14 18L15 15L18 14L15 13L14 10L13 13L10 14L13 15L14 18Z" fill="#F59E0B" opacity="0.7" />
                <path d="M53 19L54 17L56 16L54 15L53 13L52 15L50 16L52 17L53 19Z" fill="#F59E0B" opacity="0.7" />
            </svg>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400E', marginTop: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {initial ? `Celebration for ${recipient}` : 'Celebration'}
            </span>
        </div>
    );
}
