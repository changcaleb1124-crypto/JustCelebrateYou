'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import AccountSettingsModal from '@/components/AccountSettingsModal';

export default function ProfileHeader({ user }: { user: { email: string; name: string | null } }) {
    const [updatedName, setUpdatedName] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    const displayName = updatedName !== null ? updatedName : user.name;
    const greetingName = displayName || 'there';

    return (
        <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Your Memories</h1>
            <p style={{ color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Welcome back, {greetingName}
                <button 
                    onClick={() => setShowModal(true)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', display: 'flex', padding: 4, borderRadius: '50%' }} 
                    title="Account Settings & Security"
                    aria-label="Account Settings & Security"
                >
                    <Settings size={16} />
                </button>
            </p>
            
            <AccountSettingsModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                user={{ name: displayName, email: user.email }}
                onUserUpdate={(updated) => setUpdatedName(updated.name)}
                initialTab="profile"
            />
        </div>
    );
}
