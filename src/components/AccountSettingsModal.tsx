'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    User as UserIcon,
    KeyRound,
    X,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ShieldCheck,
    Check,
} from 'lucide-react';
import ModalPortal from './ModalPortal';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: { name?: string | null; email?: string | null } | null;
    onUserUpdate?: (updated: { name: string }) => void;
    initialTab?: 'profile' | 'password';
}

export default function AccountSettingsModal({
    isOpen,
    onClose,
    user,
    onUserUpdate,
    initialTab = 'profile',
}: AccountSettingsModalProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>(initialTab);

    // Profile state
    const [nameInput, setNameInput] = useState(user?.name || '');
    const [isSavingName, setIsSavingName] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    // Change Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isRedirecting, setIsRedirecting] = useState(false);

    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // Sync input when user prop changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setNameInput(user?.name || '');
            setActiveTab(initialTab);
            setProfileError('');
            setProfileSuccess('');
            setPasswordError('');
            setPasswordSuccess('');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsRedirecting(false);
        }
    }, [isOpen, user, initialTab]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Save profile display name
    const handleSaveName = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingName(true);
        setProfileError('');
        setProfileSuccess('');

        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.trim() }),
            });

            const data = await res.json();
            if (res.ok) {
                setProfileSuccess('Display name updated successfully!');
                onUserUpdate?.({ name: nameInput.trim() });
                router.refresh();
                setTimeout(() => {
                    setProfileSuccess('');
                }, 2000);
            } else {
                setProfileError(data.error || 'Failed to update display name.');
            }
        } catch {
            setProfileError('An unexpected network error occurred. Please try again.');
        } finally {
            setIsSavingName(false);
        }
    };

    // Change password handler
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        // Client-side validations
        if (!currentPassword) {
            setPasswordError('Please enter your current password.');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters long.');
            return;
        }
        const newBytes = new TextEncoder().encode(newPassword).length;
        if (newBytes > 72) {
            setPasswordError('Your password is too long. Please shorten it. Some symbols and emoji count toward the limit more quickly.');
            return;
        }
        if (newPassword === currentPassword) {
            setPasswordError('New password must be different from your current password.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New password and confirmation do not match.');
            return;
        }

        setIsChangingPassword(true);

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setPasswordSuccess(
                    data.message || 'Password changed successfully! All active sessions revoked. Please sign in again.'
                );
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setIsRedirecting(true);

                // Invalidate local state and navigate to login after 2 seconds
                setTimeout(() => {
                    window.location.href = '/login?changed=true';
                }, 2200);
            } else {
                setPasswordError(data.error || 'Failed to change password. Please check your credentials.');
            }
        } catch {
            setPasswordError('An unexpected network error occurred. Please try again.');
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (!isOpen) return null;

    // Password criteria helpers
    const hasMinLength = newPassword.length >= 8;
    const newPasswordBytes = new TextEncoder().encode(newPassword).length;
    const hasValidByteLength = newPasswordBytes <= 72;
    const isDifferentFromCurrent = !!(newPassword && currentPassword && newPassword !== currentPassword);
    const passwordsMatch = !!(confirmPassword && newPassword === confirmPassword);

    return (
        <ModalPortal>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-settings-title"
                className="modal-overlay"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !isChangingPassword && !isRedirecting) {
                        onClose();
                    }
                }}
            >
                <div
                    className="modal-content"
                    style={{
                        maxWidth: '480px',
                        padding: '1.75rem',
                        position: 'relative',
                    }}
                >
                    {/* Close button */}
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        disabled={isChangingPassword || isRedirecting}
                        aria-label="Close dialog"
                        style={{
                            position: 'absolute',
                            top: '1.25rem',
                            right: '1.25rem',
                            background: 'none',
                            border: 'none',
                            cursor: isChangingPassword || isRedirecting ? 'not-allowed' : 'pointer',
                            color: '#6B7280',
                            padding: '6px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={20} />
                    </button>

                    {/* Header */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div
                                style={{
                                    backgroundColor: 'rgba(255, 122, 89, 0.12)',
                                    color: 'var(--accent-color)',
                                    padding: '6px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                }}
                            >
                                <ShieldCheck size={20} />
                            </div>
                            <h2
                                id="account-settings-title"
                                style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    color: '#1F2937',
                                    margin: 0,
                                }}
                            >
                                Account Settings
                            </h2>
                        </div>
                        <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: 0 }}>
                            Manage your personal profile and security credentials.
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    <div
                        role="tablist"
                        style={{
                            display: 'flex',
                            gap: '8px',
                            padding: '4px',
                            backgroundColor: '#F3F4F6',
                            borderRadius: '10px',
                            marginBottom: '1.5rem',
                        }}
                    >
                        <button
                            type="button"
                            role="tab"
                            id="tab-profile"
                            aria-selected={activeTab === 'profile'}
                            aria-controls="panel-profile"
                            onClick={() => setActiveTab('profile')}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                fontSize: '0.875rem',
                                fontWeight: activeTab === 'profile' ? 600 : 500,
                                color: activeTab === 'profile' ? '#1F2937' : '#6B7280',
                                backgroundColor: activeTab === 'profile' ? '#FFFFFF' : 'transparent',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: activeTab === 'profile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <UserIcon size={16} />
                            Profile
                        </button>
                        <button
                            type="button"
                            role="tab"
                            id="tab-password"
                            aria-selected={activeTab === 'password'}
                            aria-controls="panel-password"
                            onClick={() => setActiveTab('password')}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                fontSize: '0.875rem',
                                fontWeight: activeTab === 'password' ? 600 : 500,
                                color: activeTab === 'password' ? '#1F2937' : '#6B7280',
                                backgroundColor: activeTab === 'password' ? '#FFFFFF' : 'transparent',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: activeTab === 'password' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <KeyRound size={16} />
                            Change Password
                        </button>
                    </div>

                    {/* Tab 1: Profile Panel */}
                    {activeTab === 'profile' && (
                        <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">
                            {profileError && (
                                <div
                                    role="alert"
                                    style={{
                                        color: '#DC2626',
                                        backgroundColor: '#FEF2F2',
                                        border: '1px solid #FCA5A5',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        marginBottom: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <AlertCircle size={16} />
                                    <span>{profileError}</span>
                                </div>
                            )}

                            {profileSuccess && (
                                <div
                                    role="status"
                                    style={{
                                        color: '#16A34A',
                                        backgroundColor: '#F0FDF4',
                                        border: '1px solid #BBF7D0',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        marginBottom: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <CheckCircle2 size={16} />
                                    <span>{profileSuccess}</span>
                                </div>
                            )}

                            <form onSubmit={handleSaveName}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label
                                        htmlFor="profile-email-read-only"
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#374151',
                                            display: 'block',
                                            marginBottom: '6px',
                                        }}
                                    >
                                        Email Address
                                    </label>
                                    <input
                                        id="profile-email-read-only"
                                        type="email"
                                        readOnly
                                        disabled
                                        value={user?.email || ''}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #E5E7EB',
                                            backgroundColor: '#F9FAFB',
                                            color: '#6B7280',
                                            fontSize: '0.95rem',
                                            cursor: 'not-allowed',
                                        }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
                                        Email address cannot be changed directly.
                                    </span>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label
                                        htmlFor="profile-name-input"
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#374151',
                                            display: 'block',
                                            marginBottom: '6px',
                                        }}
                                    >
                                        Display Name
                                    </label>
                                    <input
                                        id="profile-name-input"
                                        type="text"
                                        autoComplete="name"
                                        required
                                        placeholder="Enter your name"
                                        value={nameInput}
                                        onChange={(e) => setNameInput(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #D1D5DB',
                                            fontSize: '0.95rem',
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="btn btn-outline"
                                        disabled={isSavingName}
                                        style={{
                                            flex: 1,
                                            padding: '10px 16px',
                                            fontSize: '0.9rem',
                                            borderRadius: '10px',
                                            border: '1px solid #D1D5DB',
                                            color: '#4B5563',
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isSavingName}
                                        style={{
                                            flex: 1,
                                            padding: '10px 16px',
                                            fontSize: '0.9rem',
                                            borderRadius: '10px',
                                        }}
                                    >
                                        {isSavingName ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" /> Saving...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Tab 2: Change Password Panel */}
                    {activeTab === 'password' && (
                        <div role="tabpanel" id="panel-password" aria-labelledby="tab-password">
                            {/* Error state */}
                            {passwordError && (
                                <div
                                    role="alert"
                                    style={{
                                        color: '#DC2626',
                                        backgroundColor: '#FEF2F2',
                                        border: '1px solid #FCA5A5',
                                        padding: '0.75rem 0.85rem',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        marginBottom: '1rem',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '8px',
                                    }}
                                >
                                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>{passwordError}</span>
                                </div>
                            )}

                            {/* Success state */}
                            {passwordSuccess && (
                                <div
                                    role="status"
                                    style={{
                                        color: '#16A34A',
                                        backgroundColor: '#F0FDF4',
                                        border: '1px solid #BBF7D0',
                                        padding: '0.85rem 1rem',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        marginBottom: '1.25rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                        <CheckCircle2 size={18} />
                                        <span>Password Changed Successfully!</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#15803D' }}>
                                        {passwordSuccess}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#166534', marginTop: '4px' }}>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Redirecting to sign-in page...</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { window.location.href = '/login?changed=true'; }}
                                        style={{
                                            marginTop: '6px',
                                            padding: '6px 12px',
                                            backgroundColor: '#16A34A',
                                            color: '#FFFFFF',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            alignSelf: 'flex-start',
                                        }}
                                    >
                                        Sign In Now
                                    </button>
                                </div>
                            )}

                            {!passwordSuccess && (
                                <form onSubmit={handleChangePassword}>
                                    {/* Hidden username input for password manager association */}
                                    <input
                                        type="email"
                                        name="username"
                                        value={user?.email || ''}
                                        autoComplete="username"
                                        readOnly
                                        tabIndex={-1}
                                        aria-hidden="true"
                                        style={{ display: 'none' }}
                                    />

                                    {/* 1. Current Password */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label
                                                htmlFor="current-password-input"
                                                style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: 500,
                                                    color: '#374151',
                                                }}
                                            >
                                                Current Password
                                            </label>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="current-password-input"
                                                name="current-password"
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                autoComplete="current-password"
                                                required
                                                disabled={isChangingPassword}
                                                placeholder="Enter your current password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 42px 10px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #D1D5DB',
                                                    fontSize: '0.95rem',
                                                    backgroundColor: isChangingPassword ? '#F9FAFB' : '#FFFFFF',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                disabled={isChangingPassword}
                                                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                                                style={{
                                                    position: 'absolute',
                                                    right: '10px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#6B7280',
                                                    padding: '4px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* 2. New Password */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label
                                            htmlFor="new-password-input"
                                            style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: '#374151',
                                                display: 'block',
                                                marginBottom: '6px',
                                            }}
                                        >
                                            New Password
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="new-password-input"
                                                name="new-password"
                                                type={showNewPassword ? 'text' : 'password'}
                                                autoComplete="new-password"
                                                required
                                                minLength={8}
                                                disabled={isChangingPassword}
                                                placeholder="Enter at least 8 characters"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 42px 10px 12px',
                                                    borderRadius: '8px',
                                                    border: !hasValidByteLength ? '1px solid #DC2626' : '1px solid #D1D5DB',
                                                    fontSize: '0.95rem',
                                                    backgroundColor: isChangingPassword ? '#F9FAFB' : '#FFFFFF',
                                                }}
                                                aria-invalid={!hasValidByteLength}
                                                aria-describedby={!hasValidByteLength ? 'new-password-byte-error' : undefined}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                disabled={isChangingPassword}
                                                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                                                style={{
                                                    position: 'absolute',
                                                    right: '10px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#6B7280',
                                                    padding: '4px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>

                                        {/* Inline error ONLY when password exceeds existing byte limit */}
                                        {!hasValidByteLength && (
                                            <div
                                                role="alert"
                                                id="new-password-byte-error"
                                                style={{
                                                    marginTop: '6px',
                                                    color: '#DC2626',
                                                    fontSize: '0.8rem',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '6px',
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                                                <span>Your password is too long. Please shorten it. Some symbols and emoji count toward the limit more quickly.</span>
                                            </div>
                                        )}

                                        {/* Validation checklist */}
                                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.775rem',
                                                    color: hasMinLength ? '#16A34A' : '#6B7280',
                                                }}
                                            >
                                                <Check size={13} style={{ strokeWidth: hasMinLength ? 3 : 2 }} />
                                                <span>At least 8 characters</span>
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.775rem',
                                                    color: isDifferentFromCurrent ? '#16A34A' : '#6B7280',
                                                }}
                                            >
                                                <Check size={13} style={{ strokeWidth: isDifferentFromCurrent ? 3 : 2 }} />
                                                <span>Different from your current password.</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Confirm New Password */}
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label
                                            htmlFor="confirm-new-password-input"
                                            style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: '#374151',
                                                display: 'block',
                                                marginBottom: '6px',
                                            }}
                                        >
                                            Confirm New Password
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="confirm-new-password-input"
                                                name="confirm-new-password"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                autoComplete="new-password"
                                                required
                                                disabled={isChangingPassword}
                                                placeholder="Re-enter your new password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 42px 10px 12px',
                                                    borderRadius: '8px',
                                                    border: `1px solid ${
                                                        confirmPassword
                                                            ? passwordsMatch
                                                                ? '#10B981'
                                                                : '#EF4444'
                                                            : '#D1D5DB'
                                                    }`,
                                                    fontSize: '0.95rem',
                                                    backgroundColor: isChangingPassword ? '#F9FAFB' : '#FFFFFF',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                disabled={isChangingPassword}
                                                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                                style={{
                                                    position: 'absolute',
                                                    right: '10px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#6B7280',
                                                    padding: '4px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {confirmPassword && (
                                            <div
                                                style={{
                                                    marginTop: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.775rem',
                                                    color: passwordsMatch ? '#16A34A' : '#DC2626',
                                                }}
                                            >
                                                {passwordsMatch ? (
                                                    <>
                                                        <Check size={13} style={{ strokeWidth: 3 }} />
                                                        <span>Passwords match</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertCircle size={13} />
                                                        <span>Passwords do not match yet</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Security session revocation note */}
                                    <div
                                        style={{
                                            backgroundColor: '#F9FAFB',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px',
                                            padding: '0.65rem 0.85rem',
                                            marginBottom: '1.25rem',
                                            fontSize: '0.8rem',
                                            color: '#6B7280',
                                            lineHeight: 1.45,
                                        }}
                                    >
                                        Changing your password will sign you out on all devices. Sign in again with your new password.
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={isChangingPassword}
                                            className="btn btn-outline"
                                            style={{
                                                flex: 1,
                                                padding: '10px 16px',
                                                fontSize: '0.9rem',
                                                borderRadius: '10px',
                                                border: '1px solid #D1D5DB',
                                                color: '#4B5563',
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={isChangingPassword || !currentPassword || !hasMinLength || !hasValidByteLength || !passwordsMatch || (newPassword === currentPassword)}
                                            style={{
                                                flex: 1.25,
                                                padding: '10px 16px',
                                                fontSize: '0.9rem',
                                                borderRadius: '10px',
                                            }}
                                        >
                                            {isChangingPassword ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" /> Updating...
                                                </>
                                            ) : (
                                                'Update Password'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </ModalPortal>
    );
}
