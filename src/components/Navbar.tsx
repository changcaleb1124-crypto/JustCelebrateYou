import Link from 'next/link';

export default function Navbar() {
    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 5%',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-color)',
            boxShadow: 'var(--shadow-sm)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Link href="/dashboard" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-color)', textDecoration: 'none' }}>
                    JustCelebrateYou
                </Link>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Link href="/dashboard" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-color)' }}>
                    Dashboard
                </Link>
                <Link href="/dashboard/create" className="btn btn-primary" style={{ padding: '0.5rem 1rem', width: 'auto', fontSize: '0.875rem' }}>
                    Create Memory
                </Link>
                <Link href="/login" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#666' }}>
                    Logout
                </Link>
            </div>
        </nav>
    );
}
