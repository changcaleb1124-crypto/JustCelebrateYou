'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function CreateCelebrationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ title: '', recipient: '', description: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                // Automatically save owner token
                localStorage.setItem(`owner_${data.id}`, 'true');
                router.push(`/event/${data.id}?created=true`);
            } else {
                alert(data.error || 'Failed to create celebration');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to create celebration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="container animate-fade-in" style={{ paddingTop: '1.5rem', maxWidth: '640px' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <Link href="/dashboard" style={{ fontSize: '0.875rem', color: '#666', textDecoration: 'none' }}>
                        &larr; Back to Dashboard
                    </Link>
                </div>

                <div className="hero" style={{ marginBottom: '2rem', paddingTop: 0 }}>
                    <h1 className="hero-title" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
                        Create a Celebration
                    </h1>
                    <p className="hero-subtitle" style={{ fontSize: '1rem', color: '#666' }}>
                        Set up a celebration page for friends and family to share heartfelt video messages.
                    </p>
                </div>

                <div className="card" style={{ padding: 'clamp(1.25rem, 4vw, 2.25rem)' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="recipient">Who is this for?</label>
                            <input
                                id="recipient"
                                type="text"
                                className="form-input"
                                placeholder="e.g. Grandma Rose, Coach Dave, Maya"
                                required
                                value={formData.recipient}
                                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="title">Occasion / Celebration Title</label>
                            <input
                                id="title"
                                type="text"
                                className="form-input"
                                placeholder="e.g. 80th Birthday Celebration, Graduation Tribute"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="description">Welcome Message (Optional)</label>
                            <textarea
                                id="description"
                                className="form-input form-textarea"
                                placeholder="Add a short note explaining what you're doing... e.g. 'Leave a short video message wishing Rose a happy birthday!'"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Celebration'}
                        </button>
                    </form>
                </div>
            </main>
        </>
    );
}
