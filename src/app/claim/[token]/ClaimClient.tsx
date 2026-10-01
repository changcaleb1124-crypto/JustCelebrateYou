'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ClaimClientProps {
    event: {
        id: string;
        title: string;
        recipient: string;
    };
    isLoggedIn: boolean;
    token: string;
}

export default function ClaimClient({ event, isLoggedIn, token }: ClaimClientProps) {
    const [claiming, setClaiming] = useState(false);
    const router = useRouter();

    const handleClaim = async () => {
        setClaiming(true);
        try {
            const res = await fetch('/api/events/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            if (res.ok) {
                router.push('/dashboard');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to claim celebration');
            }
        } catch {
            alert('Error occurred while claiming.');
        } finally {
            setClaiming(false);
        }
    };

    return (
        <main className="container animate-fade-in" style={{ paddingTop: 'clamp(2rem, 6vh, 4rem)', maxWidth: '480px', textAlign: 'center' }}>
            <div className="card shadow-md" style={{ border: '2px solid #F4B942', background: '#FFF9ED', padding: 'clamp(1.5rem, 5vw, 2.5rem)' }}>
                <h1 className="hero-title mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', color: '#B37D1A' }}>
                    A Gift For You!
                </h1>
                <p className="mb-6" style={{ color: '#8A5D07', fontSize: '1.05rem', lineHeight: '1.6' }}>
                    This celebration for <strong>{event.recipient}</strong> was made for you. Save it to your account library to revisit anytime.
                </p>
                
                {isLoggedIn ? (
                    <button className="btn btn-primary w-full" onClick={handleClaim} disabled={claiming} style={{ fontSize: '1.05rem' }}>
                        {claiming ? 'Claiming...' : 'Claim Your Celebration'}
                    </button>
                ) : (
                    <div>
                        <p className="mb-4 text-sm" style={{ color: '#B37D1A' }}>
                            You need an account to save this celebration. Log in or create an account below to claim it.
                        </p>
                        <Link 
                            href={`/login?redirect=/claim/${token}`} 
                            className="btn btn-primary w-full" 
                            style={{ fontSize: '1.05rem', backgroundColor: '#B37D1A' }}
                        >
                            Log In / Create Account
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
