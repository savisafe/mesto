import Link from 'next/link';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import { DashboardStats } from '@/views/dashboard/DashboardStats';
import { OwnerOnly } from '@/views/dashboard/OwnerOnly';
import { routes } from '@/routes/routes';
import type { DashboardStats as DashboardStatsData } from '@/services/dashboard';

interface Props {
    stats: DashboardStatsData;
    userName: string;
}

export function DashboardView({ stats, userName }: Props) {
    if (stats.businesses.length === 0) {
        return <EmptyDashboard userName={userName} />;
    }

    return (
        <LayoutPage>
            <div className="max-w-6xl mx-auto">
                <header className="mb-10">
                    <p className="text-purple-300 text-sm mb-1">Добро пожаловать</p>
                    <h1 className="text-4xl font-bold text-white tracking-tight">{userName}</h1>
                </header>

                <DashboardStats stats={stats} />

                <OwnerOnly>
                    <section className="mb-10">
                        <SectionHeader title="Мои бизнесы" href={routes.MY_BUSINESS} />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats.businesses.map((biz) => (
                                <article
                                    key={biz.id}
                                    className="bg-white/5 backdrop-blur border border-purple-700/40 rounded-2xl p-5 hover:bg-white/10 transition"
                                >
                                    <h3 className="text-white font-semibold text-lg mb-1">
                                        {biz.name}
                                    </h3>
                                    {biz.description && (
                                        <p className="text-purple-300 text-sm line-clamp-2">
                                            {biz.description}
                                        </p>
                                    )}
                                    <p className="text-purple-400 text-xs mt-3">Активен</p>
                                </article>
                            ))}
                        </div>
                    </section>
                </OwnerOnly>
            </div>
        </LayoutPage>
    );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
    return (
        <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            {href && (
                <Link
                    href={href}
                    className="text-sm text-purple-300 hover:text-white transition"
                >
                    Все →
                </Link>
            )}
        </div>
    );
}

function EmptyDashboard({ userName }: { userName: string }) {
    return (
        <LayoutPage>
            <div className="max-w-2xl mx-auto text-center mt-24">
                <p className="text-purple-300 text-sm mb-2">Привет, {userName}</p>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
                    Создайте первый бизнес
                </h1>
                <p className="text-purple-300 mb-8">
                    После создания вы увидите статистику, клиентов и записи в одном месте.
                </p>
                <Link
                    href={routes.MY_BUSINESS}
                    className="inline-block bg-white text-purple-900 font-semibold px-6 py-3 rounded-xl hover:bg-purple-50 transition"
                >
                    Создать бизнес
                </Link>
            </div>
        </LayoutPage>
    );
}
