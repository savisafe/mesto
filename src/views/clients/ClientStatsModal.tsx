'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@/ui/modal/Modal';
import Spinner from '@/ui/spinner/Spinner';
import { useNotification } from '@/contexts/NotificationContext';
import { getClientStatsAction } from '@/actions/clients';
import { formatMoney } from '@/views/finance/financeHelpers';
import type { ClientStats } from '@/services/team-clients';
import type { Client } from '@/db/schema';

interface Props {
    businessId: string;
    // Клиент, по которому открыта статистика (null — модалка закрыта).
    client: Client | null;
    onClose: () => void;
}

const formatDate = (d: Date | string | null): string =>
    d ? new Date(d).toLocaleDateString('ru-RU') : '—';

// Статистика клиента (визиты, последний визит, выручка) — всего и по сотрудникам.
// Открывается по клику на клиента; доступна владельцу/менеджеру.
export function ClientStatsModal({ businessId, client, onClose }: Props) {
    const alert = useNotification();
    const [stats, setStats] = useState<ClientStats | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchStats = useCallback(
        async (clientId: string) => {
            setLoading(true);
            try {
                const result = await getClientStatsAction(businessId, clientId);
                if (result.ok) setStats(result.data);
                else alert('error', result.error);
            } finally {
                setLoading(false);
            }
        },
        [businessId, alert],
    );

    useEffect(() => {
        if (!client) {
            setStats(null);
            return;
        }
        fetchStats(client.id);
    }, [client, fetchStats]);

    return (
        <Modal open={client !== null} onClose={onClose} title={client?.name ?? 'Клиент'}>
            {client && <p className="text-purple-300 text-sm -mt-2 mb-5">{client.phone}</p>}

            {loading && !stats ? (
                <div className="flex justify-center py-8">
                    <Spinner />
                </div>
            ) : stats ? (
                <div className="space-y-6">
                    <SummaryMetrics stats={stats} />

                    <div>
                        <h4 className="text-purple-300 text-xs uppercase tracking-wider mb-3">
                            По сотрудникам
                        </h4>
                        {stats.byEmployee.length === 0 ? (
                            <p className="text-purple-400 text-sm">
                                Пока нет записей — статистика появится после визитов.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {stats.byEmployee.map((row) => (
                                    <li
                                        key={row.employee?.id ?? '__unassigned__'}
                                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-purple-700/40 bg-white/5 px-4 py-3"
                                    >
                                        <span className="text-white truncate">
                                            {row.employee?.name ?? 'Без сотрудника'}
                                        </span>
                                        <span className="flex items-center gap-4 text-sm tabular-nums text-purple-200">
                                            <span>{row.visits} виз.</span>
                                            <span>{formatDate(row.lastVisitAt)}</span>
                                            <span>
                                                {row.revenue > 0
                                                    ? formatMoney(row.revenue, row.currency)
                                                    : '—'}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            ) : null}
        </Modal>
    );
}

function SummaryMetrics({ stats }: { stats: ClientStats }) {
    return (
        <div className="grid grid-cols-3 gap-3">
            <Metric value={String(stats.totalVisits)} label="визиты" />
            <Metric value={formatDate(stats.lastVisitAt)} label="последний" />
            <Metric
                value={stats.totalRevenue > 0 ? formatMoney(stats.totalRevenue, stats.currency) : '—'}
                label="выручка"
            />
        </div>
    );
}

function Metric({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-xl border border-purple-700/40 bg-white/5 px-3 py-4 text-center">
            <p className="text-xl font-semibold text-white tabular-nums break-words">{value}</p>
            <p className="text-purple-400 text-xs mt-1">{label}</p>
        </div>
    );
}
