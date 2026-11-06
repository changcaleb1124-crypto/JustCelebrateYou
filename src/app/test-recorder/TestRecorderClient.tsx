'use client';

import VideoRecorder from '@/components/VideoRecorder';

export default function TestRecorderClient() {
    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#111827' }}>
                Admin Video Recorder Diagnostics & Test Suite
            </h1>
            <p style={{ color: '#4B5563', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Standalone harness for verifying modal layouts, 50s, 55s, 59s, and 60s recording integrity, container timestamps, and playback verification.
            </p>
            <div style={{ position: 'relative', minHeight: '600px' }}>
                <VideoRecorder
                    eventId="a735d623-14b2-499b-ab72-8bf770384a8e"
                    onSuccess={() => console.log('Test success callback')}
                    onCancel={() => console.log('Test cancel callback')}
                />
            </div>
        </div>
    );
}
