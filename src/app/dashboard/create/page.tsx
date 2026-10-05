'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import CelebrationCover from '@/components/CelebrationCover';
import { Upload, X, ArrowLeft } from 'lucide-react';

export default function CreateCelebrationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        recipient: '',
        description: '',
        occasion: '',
    });
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
    const [fileError, setFileError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError('');
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setFileError('Please select a JPG, PNG, or WebP image.');
            return;
        }

        const MAX_SIZE = 4 * 1024 * 1024; // 4MB
        if (file.size > MAX_SIZE) {
            setFileError('Image is too large. Maximum size is 4MB.');
            return;
        }

        setCoverFile(file);
        setCoverPreviewUrl(URL.createObjectURL(file));
    };

    const handleRemoveSelectedFile = () => {
        setCoverFile(null);
        if (coverPreviewUrl) {
            URL.revokeObjectURL(coverPreviewUrl);
            setCoverPreviewUrl(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Create the celebration record
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    recipient: formData.recipient,
                    description: formData.description,
                    occasion: formData.occasion || null,
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to create celebration');
            }

            localStorage.setItem(`owner_${data.id}`, 'true');

            // 2. If a cover image was optionally provided, upload it
            if (coverFile) {
                try {
                    const uploadData = new FormData();
                    uploadData.append('file', coverFile);
                    await fetch(`/api/events/${data.id}/cover`, {
                        method: 'POST',
                        body: uploadData,
                    });
                } catch (coverErr) {
                    console.error('Optional cover upload error:', coverErr);
                    // Non-blocking: celebration is created even if image upload encountered an issue
                }
            }

            router.push(`/event/${data.id}?created=true`);
        } catch (e: unknown) {
            console.error(e);
            alert((e as Error).message || 'Failed to create celebration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2' }}>
            <Navbar />
            <main className="container animate-fade-in" style={{ paddingTop: '1.5rem', paddingBottom: '3rem', maxWidth: '640px' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                    <Link
                        href="/dashboard"
                        style={{
                            fontSize: '0.9rem',
                            color: '#6B7280',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 500
                        }}
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                </div>

                <div className="hero" style={{ marginBottom: '1.75rem', paddingTop: 0 }}>
                    <h1 className="hero-title" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', color: '#1F2937' }}>
                        Create a Celebration
                    </h1>
                    <p className="hero-subtitle" style={{ fontSize: '1rem', color: '#6B7280' }}>
                        Set up a celebration page for friends and family to share heartfelt video messages.
                    </p>
                </div>

                <div
                    className="card"
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #EDE8E1',
                        padding: 'clamp(1.25rem, 4vw, 2.25rem)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
                    }}
                >
                    <form onSubmit={handleSubmit}>
                        {/* Recipient */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="recipient" style={{ color: '#1F2937', fontWeight: 600 }}>
                                Who is this for?
                            </label>
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

                        {/* Title */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="title" style={{ color: '#1F2937', fontWeight: 600 }}>
                                Celebration Title
                            </label>
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

                        {/* Occasion Selection */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="occasion" style={{ color: '#1F2937', fontWeight: 600 }}>
                                Occasion (Optional)
                            </label>
                            <select
                                id="occasion"
                                className="form-input"
                                value={formData.occasion}
                                onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                                style={{ backgroundColor: '#FFFFFF' }}
                            >
                                <option value="">Select an occasion (optional)</option>
                                <option value="birthday">Birthday</option>
                                <option value="graduation">Graduation</option>
                                <option value="anniversary">Anniversary</option>
                                <option value="appreciation">General Appreciation</option>
                                <option value="other">Other / Not Listed</option>
                            </select>
                            <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '4px', marginBottom: 0 }}>
                                Helps us choose a thoughtful default illustration if you don&apos;t upload a cover photo.
                            </p>
                        </div>

                        {/* Optional Cover Image Section */}
                        <div className="form-group" style={{ marginTop: '1.25rem' }}>
                            <label className="form-label" style={{ color: '#1F2937', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                Celebration Cover (Optional)
                            </label>
                            
                            {/* Live Preview Box */}
                            <div style={{ marginBottom: '10px', maxWidth: '340px' }}>
                                <CelebrationCover
                                    coverUrl={coverPreviewUrl}
                                    occasion={formData.occasion}
                                    title={formData.title || 'Celebration'}
                                    recipient={formData.recipient}
                                />
                            </div>

                            {coverFile ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 500 }}>
                                        Selected: {coverFile.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveSelectedFile}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#DC2626',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        <X size={14} /> Remove
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <label
                                        htmlFor="cover-file-input"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 14px',
                                            backgroundColor: '#FFFFFF',
                                            border: '1px solid #D1D5DB',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#374151',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Upload size={15} /> Upload Cover Photo
                                    </label>
                                    <input
                                        id="cover-file-input"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                    <span style={{ fontSize: '0.8rem', color: '#6B7280', display: 'block', marginTop: '4px' }}>
                                        Optional. Every celebration has a thoughtful default illustration if omitted.
                                    </span>
                                </div>
                            )}

                            {fileError && (
                                <p style={{ fontSize: '0.825rem', color: '#DC2626', marginTop: '4px' }}>
                                    {fileError}
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="form-group" style={{ marginTop: '1.25rem' }}>
                            <label className="form-label" htmlFor="description" style={{ color: '#1F2937', fontWeight: 600 }}>
                                Welcome Message (Optional)
                            </label>
                            <textarea
                                id="description"
                                className="form-input form-textarea"
                                placeholder="Add a short note explaining what you're doing... e.g. 'Leave a short video message wishing Rose a happy birthday!'"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full mt-4"
                            disabled={loading}
                            style={{ padding: '12px', fontSize: '1rem', borderRadius: '12px', fontWeight: 600 }}
                        >
                            {loading ? 'Creating...' : 'Create Celebration'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
