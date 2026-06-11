'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import Spinner from '@/ui/spinner/Spinner';
import { useNotification } from '@/contexts/NotificationContext';
import { getClientsByEmployeeAction } from '@/actions/clients';
import { formatMoney } from '@/views/finance/financeHelpers';
import type { EmployeeClientsGroup, EmployeeClientRow } from '@/services/team-clients';

interface Props {
    businessId: string;
}

// Разбивка «сотрудник → его клиенты» (кто к кому ходит). Доступна владельцу/менеджеру.
export function ClientsByEmployee({ businessId }: Props) {
    const alert = useNotification();
    const [groups, setGroups] = useState<EmployeeClientsGroup[] | null>(null);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getClientsByEmployeeAction(businessId);
            if (result.ok) setGroups(result.data);
            else alert('error', result.error);
        } finally {
            setLoading(false);
        }
    }, [businessId, alert]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    if (loading && !groups) {
        return (
            <div className="flex justify-center mt-16">
                <Spinner />
            </div>
        );
    }

    if (!groups) return null;

    const hasAnyClient = groups.some((g) => g.clients.length > 0);
    if (!hasAnyClient) {
        return (
            <div className="text-center text-purple-400 mt-16">
                Пока нет записей — связи «сотрудник ↔ клиент» появятся после первых визитов.
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {groups.map((group) => (
                <EmployeeGroup
                    key={group.employee?.id ?? '__unassigned__'}
                    group={group}
                />
            ))}
        </div>
    );
}

function EmployeeGroup({ group }: { group: EmployeeClientsGroup }) {
    const name = group.employee?.name ?? 'Без сотрудника';
    const totalRevenue = group.clients.reduce((sum, c) => sum + c.revenue, 0);
    const currency = group.clients[0]?.currency ?? 'KZT';

    return (
        <section className="bg-white/5 backdrop-blur border border-purple-700/40 rounded-2xl overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-purple-700/30">
                <div className="flex items-center gap-2 min-w-0">
                    <Users size={18} className="shrink-0 text-purple-300" />
                    <h3 className="text-white font-semibold truncate">{name}</h3>
                    <span className="text-purple-400 text-sm shrink-0">
                        · {group.clients.length}{' '}
                        {pluralClients(group.clients.length)}
                    </span>
                </div>
                {totalRevenue > 0 && (
                    <span className="text-purple-200 text-sm tabular-nums">
                        {formatMoney(totalRevenue, currency)}
                    </span>
                )}
            </header>

            {group.clients.length === 0 ? (
                <p className="px-5 py-4 text-purple-400 text-sm">Пока нет клиентов</p>
            ) : (
                <ul className="divide-y divide-purple-700/20">
                    {group.clients.map((row) => (
                        <ClientRow key={row.client.id} row={row} />
                    ))}
                </ul>
            )}
        </section>
    );
}

function ClientRow({ row }: { row: EmployeeClientRow }) {
    return (
        <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-white truncate">{row.client.name}</span>
                    {row.otherEmployees && (
                        <span
                            title="Клиент ходит и к другим сотрудникам"
                            className="shrink-0 rounded-full border border-purple-400/40 bg-purple-500/20 px-2 py-0.5 text-[11px] text-purple-200"
                        >
                            другие сотрудники
                        </span>
                    )}
                </div>
                <span className="text-purple-300 text-sm">{row.client.phone}</span>
            </div>

            <div className="flex items-center gap-4 text-sm tabular-nums">
                <Metric label="визиты" value={String(row.visits)} />
                <Metric
                    label="последний"
                    value={
                        row.lastVisitAt
                            ? new Date(row.lastVisitAt).toLocaleDateString('ru-RU')
                            : '—'
                    }
                />
                <Metric
                    label="выручка"
                    value={row.revenue > 0 ? formatMoney(row.revenue, row.currency) : '—'}
                />
            </div>
        </li>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-right">
            <p className="text-white">{value}</p>
            <p className="text-purple-500 text-[11px]">{label}</p>
        </div>
    );
}

function pluralClients(n: number): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'клиент';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'клиента';
    return 'клиентов';
}
