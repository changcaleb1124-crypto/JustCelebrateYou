import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/admin';
import TestRecorderClient from './TestRecorderClient';

export const dynamic = 'force-dynamic';

export default async function TestRecorderPage() {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
        redirect('/login');
    }

    return <TestRecorderClient />;
}
