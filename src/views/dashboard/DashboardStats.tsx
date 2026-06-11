'use client';

import Link from 'next/link';
import { useEffectiveRole } from '@/hooks/useAccess';
import { routes } from '@/routes/routes';
import type { DashboardStats as Stats } from '@/services/dashboard';

// Карточки сводки. «Бизнесов» и «Сотрудников» ведут на страницы только для
// владельца (/my-business, /employees) — поэтому не-OWNER их не видит,
// как и соответствующие пункты меню.
const OWNER_ONLY_HREFS = new Set<string>([routes.MY_BUSINESS, routes.EMPLOYEES]);

export function DashboardStats({ stats }: { stats: Stats }) {
    const { role } = useEffectiveRole();
    const isOwner = role === 'OWNER' || role === 'ADMIN';

    const cards = [
        { label: 'Бизнесов', value: stats.businesses.length, href: routes.MY_BUSINESS },
        { label: 'Клиентов', value: stats.totalClients, href: routes.CLIENTS },
        { label: 'Сотрудников', value: stats.totalMembers, href: routes.EMPLOYEES },
        { label: 'Записей в работе', value: stats.scheduledAppointments, href: routes.CALENDAR },
    ].filter((card) => isOwner || !OWNER_ONLY_HREFS.has(card.href));

    return (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10" aria-label="Сводка">
            {cards.map((card) => (
                <StatCard key={card.href} label={card.label} value={card.value} href={card.href} />
            ))}
        </section>
    );
}

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
