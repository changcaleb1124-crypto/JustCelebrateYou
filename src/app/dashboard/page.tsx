import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Video } from 'lucide-react';
import DashboardClient, { type EventPreview } from './DashboardClient';
import ProfileHeader from './ProfileHeader';
import Navbar from '@/components/Navbar';

export default async function DashboardPage() {
    const userId = (await cookies()).get('session')?.value;
    if (!userId) redirect('/login');

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            events: {
                include: { _count: { select: { messages: true } } },
                orderBy: { createdAt: 'desc' }
            },
            receivedEvents: {
                include: { _count: { select: { messages: true } } },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!user) redirect('/login');

    return (
        <>
            <Navbar />
            <main className="container animate-fade-in" style={{ paddingTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                    <ProfileHeader user={user} />
                    <Link href="/dashboard/create" className="btn btn-primary flex items-center gap-2" style={{ width: 'auto', padding: '10px 18px', fontSize: '0.95rem' }}>
                        <Plus size={18} />
                        Create Celebration
                    </Link>
                </div>

                {user.events.length === 0 && user.receivedEvents.length === 0 ? (
                    <div className="card text-center" style={{ padding: 'clamp(2.5rem, 6vw, 4rem) 1.5rem', color: '#666' }}>
                        <Video size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-color)' }}>No Celebrations Yet</h2>
                        <p style={{ marginBottom: '1.5rem' }}>Create your first JustCelebrateYou page to start collecting video messages.</p>
                        <Link href="/dashboard/create" className="btn btn-primary flex items-center" style={{ width: 'auto', margin: '0 auto', fontSize: '1rem' }}>
                            Create Celebration
                        </Link>
                    </div>
                ) : (
                    <>
                        {user.events.length > 0 && (
                            <div style={{ marginBottom: '3.5rem' }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '1.25rem' }}>Created by You</h2>
                                <div className="gallery-grid">
                                    {user.events.map((event) => (
                                        <DashboardClient key={event.id} event={event as EventPreview} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {user.receivedEvents && user.receivedEvents.length > 0 && (
                            <div>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '1.25rem' }}>Saved for You</h2>
                                <div className="gallery-grid">
                                    {user.receivedEvents.map((event) => (
                                        <DashboardClient key={event.id} event={event as EventPreview} isReceived={true} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
