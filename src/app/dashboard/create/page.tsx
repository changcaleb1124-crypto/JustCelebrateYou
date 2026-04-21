'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function Home() {
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
                alert(data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="container animate-fade-in" style={{ paddingTop: '2rem' }}>
                <div className="hero">
                    <h1 className="hero-title">JustCelebrateYou</h1>
                    <p className="hero-subtitle">
                        Create a beautiful, private space for friends and family to share video messages for special occasions.
                    </p>
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="recipient">Who is this for?</label>
                            <input
                                id="recipient"
                                type="text"
                                className="form-input"
                                placeholder="e.g. Grandma Rose"
                                required
                                value={formData.recipient}
                                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="title">Occasion / Event Title</label>
                            <input
                                id="title"
                                type="text"
                                className="form-input"
                                placeholder="e.g. 80th Birthday Celebration"
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
                                placeholder="Add a short note explaining what you're doing... e.g. 'Leave a short video wishing Rose a happy birthday!'"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full mt-6" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Memory Page'}
                        </button>
                    </form>
                </div>
            </main>
        </>
    );
}
