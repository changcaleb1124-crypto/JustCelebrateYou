import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import DashboardClient, { type EventPreview } from './DashboardClient';
import Navbar from '@/components/Navbar';
import { getCurrentUserId } from '@/lib/session';

export default async function DashboardPage(props: {
    searchParams?: Promise<{ tab?: string; claimed?: string }>;
}) {
    const searchParams = props.searchParams ? await props.searchParams : {};
    const initialTab = searchParams?.tab === 'saved' ? 'saved' : 'created';
    const justClaimed = searchParams?.claimed === 'true';

    const userId = await getCurrentUserId();
    if (!userId) redirect('/login');

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            events: {
                include: {
                    _count: { select: { messages: true } },
                    recipientUser: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            },
            receivedEvents: {
                include: {
                    _count: { select: { messages: true } },
                    user: { select: { name: true } },
                    recipientUser: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!user) redirect('/login');

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2' }}>
            <Navbar user={{ name: user.name, email: user.email }} />
            <main>
                <DashboardClient
                    user={{ id: user.id, name: user.name, email: user.email }}
                    createdEvents={user.events as unknown as EventPreview[]}
                    savedEvents={user.receivedEvents as unknown as EventPreview[]}
                    initialTab={initialTab}
                    justClaimed={justClaimed}
                />
            </main>
        </div>
    );
}
