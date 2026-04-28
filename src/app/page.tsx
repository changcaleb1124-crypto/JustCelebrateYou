import Link from 'next/link';

export default function LandingPage() {
    return (
        <main className="container animate-fade-in" style={{ textAlign: 'center', marginTop: '15vh' }}>
            <h1 className="hero-title">Welcome to JustCelebrateYou</h1>
            <p className="hero-subtitle mb-6" style={{ marginBottom: '3rem' }}>
                A warm, private space for your friends and family to share celebrational video messages for special occasions.
            </p>

            <div className="flex justify-center gap-4">
                <Link href="/login" className="btn btn-primary" style={{ width: 'auto' }}>
                    Get Started
                </Link>
            </div>
        </main>
    );
}
