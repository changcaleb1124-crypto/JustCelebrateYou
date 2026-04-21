'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ClaimClient({ event, isLoggedIn, token }: any) {
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
                alert(data.error || 'Failed to claim');
            }
        } catch (e) {
            alert('Error occurred while claiming.');
        } finally {
            setClaiming(false);
        }
    };

    return (
        <main className="container animate-fade-in" style={{ paddingTop: '10vh', maxWidth: '500px', textAlign: 'center' }}>
            <div className="card shadow-sm p-8" style={{ border: '2px solid #F4B942', background: '#FFF9ED' }}>
                <h1 className="hero-title mb-4" style={{ fontSize: '2rem', color: '#B37D1A' }}>A Gift For You!</h1>
                <p className="mb-6" style={{ color: '#8A5D07', fontSize: '1.1rem', lineHeight: '1.6' }}>
                    This celebration for <strong>{event.recipient}</strong> was made for you. Keep it in your own library forever.
                </p>
                
                {isLoggedIn ? (
                    <button className="btn btn-primary w-full py-3" onClick={handleClaim} disabled={claiming} style={{ fontSize: '1.1rem' }}>
                        {claiming ? 'Claiming...' : 'Claim Your Celebration'}
                    </button>
                ) : (
                    <div>
                        <p className="mb-4 text-sm" style={{ color: '#B37D1A' }}>
                            You need an account to save this. Create one or login below, then you can claim it immediately.
                        </p>
                        <Link href={`/login?redirect=/claim/${token}`} className="btn btn-primary py-3 block" style={{ fontSize: '1.1rem', backgroundColor: '#8A5D07', color: 'white', textDecoration: 'none' }}>
                            Create Account / Log In
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
