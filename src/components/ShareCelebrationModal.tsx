'use client';

import { useState, useEffect, useRef } from 'react';
import { Gift, Mail, Copy, Check, X, AlertCircle } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { copyToClipboard } from '@/lib/url';

export interface ShareCelebrationModalProps {
    isOpen: boolean;
    type: 'contributor' | 'recipient';
    url: string;
    recipientName: string;
    messageCount: number;
    onClose: () => void;
    onSwitchToInvite?: () => void;
}

export default function ShareCelebrationModal({
    isOpen,
    type,
    url,
    recipientName,
    messageCount,
    onClose,
    onSwitchToInvite,
}: ShareCelebrationModalProps) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [failedKey, setFailedKey] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const activeKey = `${type}:${url}`;
    const copied = copiedKey === activeKey;
    const copyFailed = failedKey === activeKey;

    const handleClose = () => {
        setCopiedKey(null);
        setFailedKey(null);
        onClose();
    };

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

    if (!isOpen) return null;

    const cleanRecipient = recipientName?.trim() || 'recipient';
    const isContributor = type === 'contributor';
    const showEmptyNotice = !isContributor && messageCount === 0;

    const selectInputText = () => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    };

    const handleCopy = async () => {
        const ok = await copyToClipboard(url);
        if (ok) {
            setCopiedKey(activeKey);
            setFailedKey(null);
        } else {
            setCopiedKey(null);
            setFailedKey(activeKey);
            selectInputText();
        }
    };

    return (
        <ModalPortal>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-celebration-modal-title"
                className="modal-overlay"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        handleClose();
                    }
                }}
            >
                <div
                    className="modal-content"
                    style={{
                        maxWidth: '480px',
                        position: 'relative',
                        textAlign: 'left',
                    }}
                >
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Close dialog"
                        style={{
                            position: 'absolute',
                            top: '1.25rem',
                            right: '1.25rem',
                            background: 'none',
                            border: 'none',
                            color: '#6B7280',
                            cursor: 'pointer',
                            padding: '4px',
                        }}
                    >
                        <X size={20} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.65rem' }}>
                        {isContributor ? (
                            <Mail size={22} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                        ) : (
                            <Gift size={22} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                        )}
                        <h2
                            id="share-celebration-modal-title"
                            style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F2937', margin: 0 }}
                        >
                            {isContributor ? 'Invite contributors' : `Share with ${cleanRecipient}`}
                        </h2>
                    </div>

                    {showEmptyNotice && (
                        <div
                            role="status"
                            style={{
                                backgroundColor: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                borderRadius: '10px',
                                padding: '0.75rem 0.9rem',
                                marginBottom: '1rem',
                                fontSize: '0.85rem',
                                color: '#92400E',
                                lineHeight: 1.5,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <AlertCircle size={17} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <div>
                                        No video messages have been added yet. You can share it now or invite contributors first.
                                    </div>
                                    {onSwitchToInvite && (
                                        <button
                                            type="button"
                                            onClick={onSwitchToInvite}
                                            style={{
                                                marginTop: '6px',
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                color: '#B45309',
                                                fontWeight: 600,
                                                fontSize: '0.85rem',
                                                textDecoration: 'underline',
                                                textUnderlineOffset: '2px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Invite contributors instead
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {isContributor ? (
                        <div style={{ color: '#4B5563', fontSize: '0.925rem', lineHeight: 1.55, marginBottom: '1.15rem' }}>
                            <p style={{ margin: '0 0 0.6rem 0' }}>
                                Share this link with friends and family so they can record or upload a video message for{' '}
                                <strong>{cleanRecipient}</strong>.
                            </p>
                            <p style={{ margin: 0 }}>
                                Anyone with the link can watch existing videos and add a message without an account. Copy and send the link yourself in a text, chat, or email.
                            </p>
                        </div>
                    ) : (
                        <div style={{ color: '#4B5563', fontSize: '0.925rem', lineHeight: 1.55, marginBottom: '1.15rem' }}>
                            <p style={{ margin: '0 0 0.6rem 0' }}>
                                Send this link to <strong>{cleanRecipient}</strong> when you are ready for them to receive their celebration.
                            </p>
                            <p style={{ margin: 0 }}>
                                When <strong>{cleanRecipient}</strong> opens it and saves the celebration to their account, they can revisit and watch their video messages anytime from their Saved for You library. Copy and send the link yourself in a text, card, or email.
                            </p>
                        </div>
                    )}

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label
                            htmlFor="share-celebration-url-input"
                            style={{
                                display: 'block',
                                fontSize: '0.775rem',
                                fontWeight: 600,
                                color: '#6B7280',
                                marginBottom: '6px',
                            }}
                        >
                            {isContributor ? 'Contributor link' : `Recipient link for ${cleanRecipient}`}
                        </label>
                        <input
                            ref={inputRef}
                            id="share-celebration-url-input"
                            type="text"
                            readOnly
                            value={url}
                            onFocus={(e) => e.currentTarget.select()}
                            onClick={(e) => e.currentTarget.select()}
                            style={{
                                width: '100%',
                                backgroundColor: '#F9FAFB',
                                border: copyFailed ? '1px solid #DC2626' : '1px solid #D1D5DB',
                                borderRadius: '10px',
                                padding: '0.7rem 0.85rem',
                                fontSize: '0.85rem',
                                color: '#1F2937',
                                fontFamily: 'monospace',
                            }}
                        />

                        {copied && !copyFailed && (
                            <p
                                role="status"
                                style={{
                                    margin: '6px 0 0 0',
                                    fontSize: '0.825rem',
                                    color: '#059669',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                            >
                                <Check size={14} strokeWidth={2.5} />
                                {isContributor
                                    ? 'Copied! Paste it into a text, chat, or email to your contributors.'
                                    : `Copied! Paste it into a message or email to ${cleanRecipient}.`}
                            </p>
                        )}

                        {copyFailed && (
                            <p
                                role="alert"
                                style={{
                                    margin: '6px 0 0 0',
                                    fontSize: '0.825rem',
                                    color: '#DC2626',
                                    fontWeight: 500,
                                }}
                            >
                                Couldn’t copy automatically. Select and copy the link above.
                            </p>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="btn btn-outline"
                            style={{
                                padding: '9px 16px',
                                fontSize: '0.9rem',
                                borderRadius: '10px',
                                width: 'auto',
                            }}
                        >
                            {copied ? 'Done' : 'Go back'}
                        </button>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="btn btn-primary"
                            style={{
                                padding: '9px 18px',
                                fontSize: '0.9rem',
                                borderRadius: '10px',
                                width: 'auto',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            {copied ? (
                                <>
                                    <Check size={16} /> Copied
                                </>
                            ) : (
                                <>
                                    <Copy size={16} />
                                    {isContributor ? 'Copy contributor link' : 'Copy recipient link'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
