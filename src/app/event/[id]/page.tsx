import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import MemoryPageClient from './MemoryPageClient';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { cookies } from 'next/headers';

export default async function MemoryPage(props: { params: Promise<{ id: string }> }) {
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
    const isLoggedIn = !!userId;

    return (
        <>
            <Navbar />
            {isLoggedIn && (
                <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '0' }}>
                    <Link 
                        href="/dashboard" 
                        className="btn btn-outline" 
                        style={{ display: 'inline-flex', alignItems: 'center', width: 'auto', gap: '8px', padding: '8px 14px', fontSize: '0.875rem' }}
                    >
                        &larr; Back to Dashboard
                    </Link>
                </div>
            )}
            <MemoryPageClient event={event} />
        </>
    );
}
