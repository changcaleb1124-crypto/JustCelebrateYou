import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ClaimClient from './ClaimClient';
import { cookies } from 'next/headers';

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const event = await prisma.event.findUnique({ where: { claimToken: token } });
    
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
    const isLoggedIn = !!userId;

    return (
        <>
            <Navbar user={currentUser ? { name: currentUser.name, email: currentUser.email } : undefined} />
            <ClaimClient event={event} isLoggedIn={isLoggedIn} token={token} />
        </>
    );
}
