import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import DashboardClient, { type EventPreview } from './DashboardClient';
import Navbar from '@/components/Navbar';

export default async function DashboardPage() {
    const userId = (await cookies()).get('session')?.value;
    if (!userId) redirect('/login');

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            events: {
                include: {
                    _count: { select: { messages: true } },
                    recipientUser: { select: { id: true, name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
            },
            receivedEvents: {
                include: {
                    _count: { select: { messages: true } },
                    user: { select: { id: true, name: true, email: true } },
                    recipientUser: { select: { id: true, name: true, email: true } },
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
                />
            </main>
        </div>
    );
}
