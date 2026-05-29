import Link from 'next/link';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import type { DashboardStats } from '@/services/dashboard';

interface Props {
    stats: DashboardStats;
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

                <section
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
                    aria-label="Сводка"
                >
                    <StatCard
                        label="Бизнесов"
                        value={stats.businesses.length}
                        href="/my-business"
                    />
                    <StatCard label="Клиентов" value={stats.totalClients} href="/clients" />
                    <StatCard label="Сотрудников" value={stats.totalMembers} href="/employees" />
                    <StatCard
                        label="Записей в работе"
                        value={stats.scheduledAppointments}
                        href="/calendar"
                    />
                </section>

                <section className="mb-10">
                    <SectionHeader title="Мои бизнесы" href="/my-business" />
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
                                <p className="text-purple-400 text-xs mt-3">
                                    {biz.isActive ? 'Активен' : 'Неактивен'}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section>
                    <SectionHeader title="Скоро" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {comingSoon.map((item) => (
                            <div
                                key={item}
                                className="bg-white/[0.03] border border-purple-800/40 rounded-2xl p-4 text-purple-400 text-sm"
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </LayoutPage>
    );
}

const comingSoon = ['Финансы', 'Отзывы', 'Уведомления клиентам'];

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
    return (
        <Link
            href={href}
            className="block bg-white/5 backdrop-blur border border-purple-700/40 rounded-2xl p-5 hover:bg-white/10 transition"
        >
            <p className="text-purple-300 text-sm mb-2">{label}</p>
            <p className="text-3xl font-semibold text-white tracking-tight tabular-nums">{value}</p>
        </Link>
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
                    href="/my-business"
                    className="inline-block bg-white text-purple-900 font-semibold px-6 py-3 rounded-xl hover:bg-purple-50 transition"
                >
                    Создать бизнес
                </Link>
            </div>
        </LayoutPage>
    );
}
