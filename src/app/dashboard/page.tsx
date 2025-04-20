export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardPage from './DashboardPage';

export default async function ProtectedDashboard() {
    const cookieStore = cookies();
    const token = cookieStore.get('access_token')?.value;
    const role = cookieStore.get('role')?.value;

    if (!token || role !== 'admin') {
        redirect('/login');
    }

    return <DashboardPage />;
}
