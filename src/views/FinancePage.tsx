'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import { SelectField } from '@/ui/form';
import Spinner from '@/ui/spinner/Spinner';
import { useAccess } from '@/hooks/useAccess';
import { useBusiness } from '@/contexts/BusinessContext';
import { useNotification } from '@/contexts/NotificationContext';
import { getFinanceAnalyticsAction } from '@/actions/finance';
import { listPendingConfirmationsAction } from '@/actions/appointments';
import { listMembersAction } from '@/actions/employees';
import type { FinanceAnalytics, FinanceGranularity } from '@/services/finance';
import type { AppointmentDetail } from '@/services/appointments';
import type { Member } from '@/services/employees';
import { PeriodSwitcher } from './finance/PeriodSwitcher';
import { FinanceSummaryCards } from './finance/FinanceSummaryCards';
import { FinanceCharts } from './finance/FinanceCharts';
import { PendingConfirmations } from './finance/PendingConfirmations';
import {
    presetRange,
    formatRangeLabel,
    toEmployeeFilter,
    EMPLOYEE_ALL,
    EMPLOYEE_NONE,
    type DateRange,
} from './finance/financeHelpers';

export default function FinancePage() {
    const access = useAccess('OWNER', 'ADMIN', 'MANAGER');
    const { currentBusiness, businessesData } = useBusiness();
    const alert = useNotification();

    const [granularity, setGranularity] = useState<FinanceGranularity>('month');
    const [range, setRange] = useState<DateRange>(() => presetRange('month'));
    const [employee, setEmployee] = useState<string>(EMPLOYEE_ALL);
    const [members, setMembers] = useState<Member[]>([]);

    const [data, setData] = useState<FinanceAnalytics | null>(null);
    const [pending, setPending] = useState<AppointmentDetail[]>([]);
    const [timezone, setTimezone] = useState('UTC');
    const [loading, setLoading] = useState(false);

    const fetchMembers = useCallback(async () => {
        if (!currentBusiness) return;
        const r = await listMembersAction(currentBusiness);
        if (r.ok) setMembers(r.data.members);
    }, [currentBusiness]);

    const fetchAnalytics = useCallback(async () => {
        if (!currentBusiness) return;
        setLoading(true);
        try {
            const r = await getFinanceAnalyticsAction({
                businessId: currentBusiness,
                fromDate: range.fromDate,
                toDate: range.toDate,
                granularity,
                employeeUserId: toEmployeeFilter(employee),
            });
            if (r.ok) setData(r.data);
            else alert('error', r.error);
        } finally {
            setLoading(false);
        }
    }, [currentBusiness, range, granularity, employee, alert]);

    const fetchPending = useCallback(async () => {
        if (!currentBusiness) return;
        const r = await listPendingConfirmationsAction(currentBusiness);
        if (r.ok) setPending(r.data);
    }, [currentBusiness]);

    // Часовой пояс бизнеса нужен для подписей в напоминании — берём из контекста.
    useEffect(() => {
        const biz = businessesData.find((b) => b.id === currentBusiness);
        if (biz?.timezone) setTimezone(biz.timezone);
    }, [businessesData, currentBusiness]);

    useEffect(() => {
        fetchMembers();
        fetchPending();
    }, [fetchMembers, fetchPending]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const handlePeriodChange = (g: FinanceGranularity, r: DateRange) => {
        setGranularity(g);
        setRange(r);
    };

    const handleResolved = () => {
        fetchPending();
        fetchAnalytics();
    };

    if (access.status !== 'ok') {
        return <LayoutPage>{access.component}</LayoutPage>;
    }

    if (!currentBusiness) {
        return (
            <LayoutPage>
                <div className="max-w-2xl mx-auto text-center mt-24">
                    <h1 className="text-3xl font-bold text-white mb-4">Финансы</h1>
                    <p className="text-purple-300">
                        Сначала создайте бизнес в разделе{' '}
                        <a href="/my-business" className="underline hover:text-white">
                            «Мои бизнесы»
                        </a>
                    </p>
                </div>
            </LayoutPage>
        );
    }

    return (
        <LayoutPage>
            <div className="max-w-[1400px] mx-auto space-y-5">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-purple-300 text-sm mb-1">Аналитика</p>
                        <h1 className="text-4xl font-bold text-white tracking-tight">Финансы</h1>
                    </div>
                    <p className="text-purple-300 text-sm">{formatRangeLabel(range)}</p>
                </header>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <PeriodSwitcher
                        granularity={granularity}
                        range={range}
                        onChange={handlePeriodChange}
                    />
                    <div className="w-full sm:w-56">
                        <SelectField
                            value={employee}
                            onChange={setEmployee}
                            options={[
                                { value: EMPLOYEE_ALL, label: 'Все сотрудники' },
                                ...members.map((m) => ({ value: m.id, label: m.name })),
                                { value: EMPLOYEE_NONE, label: 'Без сотрудника' },
                            ]}
                        />
                    </div>
                </div>

                <PendingConfirmations
                    pending={pending}
                    timezone={timezone}
                    onResolved={handleResolved}
                />

                {loading && !data ? (
                    <div className="flex justify-center py-24">
                        <Spinner />
                    </div>
                ) : data ? (
                    <div className={loading ? 'opacity-60 transition space-y-5' : 'transition space-y-5'}>
                        <FinanceSummaryCards summary={data.summary} currency={data.currency} />
                        <FinanceCharts data={data} />
                    </div>
                ) : null}
            </div>
        </LayoutPage>
    );
}
