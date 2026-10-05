import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import MemoryPageClient from './MemoryPageClient';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft } from 'lucide-react';

export default async function CelebrationPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;

    const event = await prisma.event.findUnique({
        where: { id },
        include: {
            messages: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!event) notFound();

    const userId = (await cookies()).get('session')?.value;
    let currentUser: { name: string | null; email: string } | null = null;

    if (userId) {
        const u = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true }
        });
        if (u) currentUser = u;
    }

    const isCreator = Boolean(userId && event.userId && userId === event.userId);
    const sanitizedEvent = {
        ...event,
        claimToken: isCreator ? event.claimToken : null,
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2' }}>
            <Navbar user={currentUser ? { name: currentUser.name, email: currentUser.email } : undefined} />
            {userId && (
                <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '0', maxWidth: '860px' }}>
                    <Link 
                        href="/dashboard" 
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#6B7280',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            textDecoration: 'none'
                        }}
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                </div>
            )}
            <MemoryPageClient
                event={sanitizedEvent}
                currentUserId={userId || null}
            />
        </div>
    );
}
