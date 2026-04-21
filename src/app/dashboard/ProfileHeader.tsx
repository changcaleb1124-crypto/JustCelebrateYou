'use client';

import { useState, useEffect } from 'react';
import { Settings, X, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfileHeader({ user }: { user: { email: string, name: string | null } }) {
    const [localName, setLocalName] = useState(user.name);
    const greetingName = localName || 'there';
    
    const [showModal, setShowModal] = useState(false);
    const [nameInput, setNameInput] = useState(user.name || '');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const router = useRouter();

    // Sync if server sends updated prop
    useEffect(() => {
        setLocalName(user.name);
        setNameInput(user.name || '');
    }, [user.name]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');
        
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setLocalName(nameInput.trim()); // Immediate UI update
                setSuccessMsg('Name updated successfully');
                router.refresh(); // Background refetch
                
                // Close modal gracefully after displaying success
                setTimeout(() => {
                    setShowModal(false);
                    setSuccessMsg('');
                }, 1500);
            } else {
                setErrorMsg(data.error || 'Failed to update profile');
            }
        } catch (e) {
            setErrorMsg('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Your Memories</h1>
            <p style={{ color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Welcome back, {greetingName}
                <button 
                    onClick={() => { setShowModal(true); setNameInput(localName || ''); setErrorMsg(''); setSuccessMsg(''); }} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', display: 'flex', padding: 4, borderRadius: '50%' }} 
                    title="Edit Profile"
                >
                    <Settings size={16} />
                </button>
            </p>
            
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ maxWidth: '400px', width: '100%', position: 'relative' }}>
                        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                            <X size={20} />
                        </button>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-color)' }}>Edit Profile</h2>
                        <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Choose how you'd like to be greeted.</p>
                        
                        {errorMsg && <div style={{ color: 'var(--error-color)', marginBottom: '1rem', fontWeight: 500, backgroundColor: 'rgba(220,38,38,0.1)', padding: '0.75rem', borderRadius: '4px' }}>{errorMsg}</div>}
                        {successMsg && <div style={{ color: 'green', marginBottom: '1rem', fontWeight: 500, backgroundColor: 'rgba(0,128,0,0.1)', padding: '0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} /> {successMsg}</div>}
                        
                        <form onSubmit={handleSave} style={{ textAlign: 'left' }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="edit-name">Display Name</label>
                                <input
                                    id="edit-name"
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter your name"
                                    required
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
