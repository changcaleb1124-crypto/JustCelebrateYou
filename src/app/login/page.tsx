'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginFlow() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/dashboard';
    
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name, isSignup })
            });

            const data = await res.json();
            if (res.ok) {
                router.push(redirectUrl);
                router.refresh();
            } else {
                setError(data.error || 'Failed to login');
            }
        } catch (e) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card text-center" style={{ padding: '2.5rem' }}>
            <h1 className="hero-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
                Join or log in to access your JustCelebrateYou
            </p>

            <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid #eaeaea' }}>
                <button 
                    type="button" 
                    onClick={() => { setIsSignup(false); setError(''); }} 
                    style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', borderBottom: !isSignup ? '2px solid var(--accent-color)' : '2px solid transparent', fontWeight: !isSignup ? 600 : 400, color: !isSignup ? 'var(--accent-color)' : '#666', cursor: 'pointer' }}
                >
                    Log In
                </button>
                <button 
                    type="button" 
                    onClick={() => { setIsSignup(true); setError(''); }} 
                    style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', borderBottom: isSignup ? '2px solid var(--accent-color)' : '2px solid transparent', fontWeight: isSignup ? 600 : 400, color: isSignup ? 'var(--accent-color)' : '#666', cursor: 'pointer' }}
                >
                    Sign Up
                </button>
            </div>

            {error && <div style={{ color: 'var(--error-color)', marginBottom: '1rem', fontWeight: 500, backgroundColor: 'rgba(220, 38, 38, 0.1)', padding: '0.75rem', borderRadius: '4px' }}>{error}</div>}

            <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
                {isSignup && (
                    <div className="form-group animate-fade-in">
                        <label className="form-label" htmlFor="name">Name</label>
                        <input
                            id="name"
                            type="text"
                            className="form-input"
                            placeholder="Enter your name"
                            required={isSignup}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                )}
                
                <div className="form-group">
                    <label className="form-label" htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        className="form-input"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        className="form-input"
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1rem' }} disabled={loading}>
                    {loading ? 'Entering...' : isSignup ? 'Create Account' : 'Log In'}
                </button>
            </form>
        </div>
    );
}

export default function LoginPage() {
    return (
        <main className="container animate-fade-in" style={{ maxWidth: '450px', marginTop: '10vh' }}>
            <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
                <LoginFlow />
            </Suspense>
        </main>
    );
}
