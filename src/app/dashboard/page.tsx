import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getDashboardStats } from '@/services/dashboard';
import { DashboardView } from '@/views/DashboardPage';
import { routes } from '@/routes/routes';

export default async function DashboardRoute() {
    const user = await getCurrentUser();
    if (!user) redirect(routes.LOGIN);

    const stats = await getDashboardStats(user.id);
    return <DashboardView stats={stats} userName={user.name} />;
}
