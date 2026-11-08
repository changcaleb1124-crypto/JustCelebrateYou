import { getCurrentUserId } from '@/lib/session';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const userId = await getCurrentUserId();
    if (!userId) {
        redirect('/login');
    }

    return <>{children}</>;
}
