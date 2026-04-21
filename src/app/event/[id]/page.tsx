import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import MemoryPageClient from './MemoryPageClient';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

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

    return (
        <>
            <Navbar />
            <div className="container" style={{ paddingTop: '2rem', paddingBottom: '0' }}>
                <Link href="/dashboard" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', width: 'auto', gap: '8px', padding: '10px 16px' }}>
                    &larr; Back to Dashboard
                </Link>
            </div>
            <MemoryPageClient event={event} />
        </>
    );
}
