'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import { Button } from '@/ui/button/Button';
import { TextField, Field, DateField, TimeField } from '@/ui/form';
import { Modal } from '@/ui/modal/Modal';
import Spinner from '@/ui/spinner/Spinner';
import { useAccess } from '@/hooks/useAccess';
import { useBusiness } from '@/contexts/BusinessContext';
import { useNotification } from '@/contexts/NotificationContext';
import {
    getScheduleAction,
    setWeeklyHoursAction,
    addTimeOffAction,
    removeTimeOffAction,
} from '@/actions/schedule';
import type { ScheduleData, WeeklyDay, TimeOffItem } from '@/services/schedule';
import type { TimeOffReason } from '@/db/schema';

dayjs.extend(utc);
dayjs.extend(timezone);

// Понедельник-первый порядок отображения (хранение: 0=Вс…6=Сб).
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABEL: Record<number, string> = {
    1: 'Понедельник',
    2: 'Вторник',
    3: 'Среда',
    4: 'Четверг',
    5: 'Пятница',
    6: 'Суббота',
    0: 'Воскресенье',
};
const REASON_LABEL: Record<TimeOffReason, string> = {
    lunch: 'Обед',
    day_off: 'Выходной',
    vacation: 'Отпуск',
    sick: 'Больничный',
    holiday: 'Праздник',
    other: 'Другое',
};

const pad = (n: number) => String(n).padStart(2, '0');
const minToHHMM = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const hhmmToMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
};

export default function SchedulePage() {
    const access = useAccess();
    const { currentBusiness } = useBusiness();
    const alert = useNotification();

    const [data, setData] = useState<ScheduleData | null>(null);
    const [days, setDays] = useState<WeeklyDay[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingHours, setSavingHours] = useState(false);

    const [addOpen, setAddOpen] = useState(false);
    const [form, setForm] = useState<{
        date: string;
        start: string;
        end: string;
        reason: TimeOffReason;
        note: string;
    }>({ date: '', start: '10:00', end: '11:00', reason: 'day_off', note: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!currentBusiness) return;
        setLoading(true);
        try {
            const result = await getScheduleAction(currentBusiness);
            if (result.ok) {
                setData(result.data);
                setDays(result.data.days);
            } else {
                alert('error', result.error);
            }
        } finally {
            setLoading(false);
        }
    }, [currentBusiness, alert]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateDay = (weekday: number, patch: Partial<WeeklyDay>) => {
        setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
    };

    const handleSaveHours = async () => {
        if (!currentBusiness) return;
        setSavingHours(true);
        try {
            const result = await setWeeklyHoursAction(currentBusiness, days);
            if (result.ok) alert('success', 'График сохранён');
            else alert('error', result.error);
        } finally {
            setSavingHours(false);
        }
    };

    const handleAddBlock = async () => {
        if (!currentBusiness || !data) return;
        if (!form.date) {
            alert('error', 'Укажите дату');
            return;
        }
        const tz = data.timezone;
        const startsAt = dayjs.tz(`${form.date}T${form.start}`, tz);
        const endsAt = dayjs.tz(`${form.date}T${form.end}`, tz);
        if (!startsAt.isValid() || !endsAt.isValid() || !endsAt.isAfter(startsAt)) {
            alert('error', 'Конец блока должен быть позже начала');
            return;
        }
        setSubmitting(true);
        try {
            const result = await addTimeOffAction({
                businessId: currentBusiness,
                startsAt: startsAt.toISOString(),
                endsAt: endsAt.toISOString(),
                reason: form.reason,
                note: form.note,
            });
            if (result.ok) {
                alert('success', 'Блок добавлен');
                setAddOpen(false);
                setForm({ date: '', start: '10:00', end: '11:00', reason: 'day_off', note: '' });
                fetchData();
            } else {
                alert('error', result.error);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveBlock = async (block: TimeOffItem) => {
        if (!currentBusiness) return;
        const result = await removeTimeOffAction(currentBusiness, block.id);
        if (result.ok) {
            alert('success', 'Блок удалён');
            fetchData();
        } else {
            alert('error', result.error);
        }
    };

    if (access.status !== 'ok') {
        return <LayoutPage>{access.component}</LayoutPage>;
    }
    if (!currentBusiness) {
        return (
            <LayoutPage>
                <div className="max-w-2xl mx-auto text-center mt-24">
                    <h1 className="text-3xl font-bold text-white mb-4">График работы</h1>
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
    if (loading && !data) {
        return (
            <LayoutPage>
                <div className="max-w-6xl mx-auto flex justify-center mt-24">
                    <Spinner />
                </div>
            </LayoutPage>
        );
    }
    if (!data) return null;

    const fmt = (d: Date) => dayjs(d).tz(data.timezone).format('DD.MM.YYYY HH:mm');

    return (
        <LayoutPage>
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <p className="text-purple-300 text-sm mb-1">Часовой пояс: {data.timezone}</p>
                    <h1 className="text-4xl font-bold text-white tracking-tight">График работы</h1>
                    <p className="text-purple-300 text-sm mt-2 max-w-2xl">
                        Рабочие часы и блокировки определяют свободные окна — их видит и календарь, и
                        бот при записи. Вне часов или в блоке записать нельзя.
                    </p>
                </header>

                <section className="mb-10 bg-white/5 backdrop-blur border border-purple-700/40 rounded-2xl p-5">
                    <h2 className="text-xl font-semibold text-white mb-4">Часы по дням недели</h2>
                    <div className="space-y-2">
                        {WEEK_ORDER.map((wd) => {
                            const day = days.find((d) => d.weekday === wd);
                            if (!day) return null;
                            return (
                                <div
                                    key={wd}
                                    className="flex items-center gap-4 py-2 border-b border-purple-700/20 last:border-0"
                                >
                                    <label className="flex items-center gap-2 w-44 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={day.enabled}
                                            onChange={(e) =>
                                                updateDay(wd, { enabled: e.target.checked })
                                            }
                                            className="w-4 h-4 accent-purple-500"
                                        />
                                        <span className="text-white">{WEEKDAY_LABEL[wd]}</span>
                                    </label>
                                    {day.enabled ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={minToHHMM(day.startMinute)}
                                                onChange={(e) =>
                                                    updateDay(wd, {
                                                        startMinute: hhmmToMin(e.target.value),
                                                    })
                                                }
                                                className="px-3 py-2 rounded-lg bg-purple-800/50 text-white border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                            <span className="text-purple-300">—</span>
                                            <input
                                                type="time"
                                                value={minToHHMM(day.endMinute)}
                                                onChange={(e) =>
                                                    updateDay(wd, {
                                                        endMinute: hhmmToMin(e.target.value),
                                                    })
                                                }
                                                className="px-3 py-2 rounded-lg bg-purple-800/50 text-white border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-purple-400 text-sm">Выходной</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="w-48 mt-5">
                        <Button onClick={handleSaveHours}>
                            {savingHours ? 'Сохранение...' : 'Сохранить часы'}
                        </Button>
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">Блокировки</h2>
                        <div className="w-48">
                            <Button onClick={() => setAddOpen(true)}>Добавить блок</Button>
                        </div>
                    </div>
                    {data.blocks.length === 0 ? (
                        <div className="text-center text-purple-300 py-12 bg-white/5 border border-purple-700/40 rounded-2xl">
                            Блокировок нет. Добавьте обед, отгул или выходной.
                        </div>
                    ) : (
                        <div className="bg-white/5 backdrop-blur border border-purple-700/40 rounded-2xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-white/[0.03] text-purple-300 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3">Начало</th>
                                        <th className="px-5 py-3">Конец</th>
                                        <th className="px-5 py-3">Причина</th>
                                        <th className="px-5 py-3">Заметка</th>
                                        <th className="px-5 py-3 text-right">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.blocks.map((b) => (
                                        <tr key={b.id} className="border-t border-purple-700/30">
                                            <td className="px-5 py-3 text-white">{fmt(b.startsAt)}</td>
                                            <td className="px-5 py-3 text-white">{fmt(b.endsAt)}</td>
                                            <td className="px-5 py-3 text-purple-200">
                                                {REASON_LABEL[b.reason]}
                                            </td>
                                            <td className="px-5 py-3 text-purple-300 text-sm">
                                                {b.note ?? '—'}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() => handleRemoveBlock(b)}
                                                    className="text-sm text-red-400 hover:text-red-300 cursor-pointer"
                                                >
                                                    Удалить
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <Modal
                    open={addOpen}
                    onClose={() => setAddOpen(false)}
                    title="Добавить блокировку"
                    footer={
                        <>
                            <button
                                onClick={() => setAddOpen(false)}
                                className="px-4 py-2.5 text-purple-200 hover:text-white text-sm cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAddBlock}
                                disabled={submitting}
                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-white font-medium cursor-pointer transition"
                            >
                                {submitting ? 'Добавление...' : 'Добавить'}
                            </button>
                        </>
                    }
                >
                    <DateField
                        label="Дата"
                        value={form.date}
                        onChange={(v) => setForm({ ...form, date: v })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <TimeField
                            label="С"
                            value={form.start}
                            onChange={(v) => setForm({ ...form, start: v })}
                        />
                        <TimeField
                            label="До"
                            value={form.end}
                            onChange={(v) => setForm({ ...form, end: v })}
                        />
                    </div>
                    <Field label="Причина">
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(REASON_LABEL) as TimeOffReason[]).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setForm({ ...form, reason: r })}
                                    className={`px-3 py-2 rounded-xl border text-sm transition cursor-pointer ${
                                        form.reason === r
                                            ? 'bg-purple-600 border-purple-500 text-white'
                                            : 'bg-purple-800/30 border-purple-700 text-purple-300 hover:bg-purple-800/50'
                                    }`}
                                >
                                    {REASON_LABEL[r]}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <TextField
                        label="Заметка (необязательно)"
                        autoComplete="off"
                        value={form.note}
                        onChange={(v) => setForm({ ...form, note: v })}
                    />
                </Modal>
            </div>
        </LayoutPage>
    );
}
