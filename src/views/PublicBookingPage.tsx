'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Button } from '@/ui/button/Button';
import { TextField, SelectField } from '@/ui/form';
import { useNotification } from '@/contexts/NotificationContext';
import { formatMoney, formatDuration, formatTime, formatDayLabel } from '@/lib/format';
import type { PublicBusiness } from '@/services/public-booking';
import type { DayAvailability } from '@/services/availability';

const RANGE_DAYS = 14;
const ANY = '';

interface Props {
    business: PublicBusiness;
}

interface PickedSlot {
    startsAt: string;
    masterId: string | null;
}

const todayInTz = (tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
const addDays = (date: string, n: number) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

export const PublicBookingPage = ({ business }: Props) => {
    const alert = useNotification();
    const tz = business.timezone;

    const [serviceId, setServiceId] = useState(business.services[0]?.id ?? '');
    const [employeeId, setEmployeeId] = useState<string>(ANY);
    const [days, setDays] = useState<DayAvailability[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [slot, setSlot] = useState<PickedSlot | null>(null);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [confirmed, setConfirmed] = useState<{ service: string; startsAt: string } | null>(null);

    const selectedService = useMemo(
        () => business.services.find((s) => s.id === serviceId) ?? null,
        [business.services, serviceId],
    );

    const loadAvailability = useCallback(async () => {
        if (!serviceId) return;
        setLoadingSlots(true);
        setSlot(null);
        try {
            const from = todayInTz(tz);
            const params = new URLSearchParams({
                slug: business.slug,
                serviceId,
                from,
                to: addDays(from, RANGE_DAYS - 1),
            });
            if (employeeId) params.set('employeeUserId', employeeId);
            const res = await fetch(`/api/public/availability?${params}`);
            const data = await res.json();
            if (!res.ok) {
                alert('error', data.error ?? 'Не удалось загрузить расписание');
                setDays([]);
                return;
            }
            setDays(data.days as DayAvailability[]);
        } catch {
            alert('error', 'Не удалось загрузить расписание');
            setDays([]);
        } finally {
            setLoadingSlots(false);
        }
    }, [business.slug, serviceId, employeeId, tz, alert]);

    useEffect(() => {
        loadAvailability();
    }, [loadAvailability]);

    const openDays = useMemo(
        () => days.filter((d) => d.status === 'open' && d.slots.length > 0),
        [days],
    );

    // Сбрасываем/восстанавливаем выбранный день, когда меняется набор доступных дней.
    useEffect(() => {
        if (openDays.length === 0) {
            setSelectedDate('');
            return;
        }
        setSelectedDate((prev) => (openDays.some((d) => d.date === prev) ? prev : openDays[0].date));
    }, [openDays]);

    // Слоты выбранного дня, схлопнутые по времени (для «любого мастера» одно
    // и то же время может прийти от нескольких мастеров — берём первого).
    const daySlots = useMemo(() => {
        const day = openDays.find((d) => d.date === selectedDate);
        if (!day) return [];
        const seen = new Set<string>();
        const result: PickedSlot[] = [];
        for (const s of day.slots) {
            const time = s.startsAt;
            if (seen.has(time)) continue;
            seen.add(time);
            result.push({ startsAt: s.startsAt, masterId: s.masterId });
        }
        return result;
    }, [openDays, selectedDate]);

    const employeeOptions = useMemo(
        () => [
            { value: ANY, label: 'Любой свободный мастер' },
            ...business.team.map((t) => ({ value: t.id, label: t.name })),
        ],
        [business.team],
    );

    const handleSubmit = async () => {
        if (!serviceId) return alert('error', 'Выберите услугу');
        if (!slot) return alert('error', 'Выберите время');
        if (!name.trim() || !phone.trim()) return alert('error', 'Укажите имя и телефон');

        setSubmitting(true);
        try {
            const res = await fetch('/api/public/bookings', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    slug: business.slug,
                    serviceId,
                    employeeUserId: slot.masterId,
                    startsAt: slot.startsAt,
                    client: { name, phone, email: email.trim() || null },
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert('error', data.error ?? 'Не удалось записаться');
                if (data.code === 'SLOT_CONFLICT') loadAvailability();
                return;
            }
            setConfirmed({ service: data.booking.serviceName, startsAt: data.booking.startsAt });
        } catch {
            alert('error', 'Не удалось записаться');
        } finally {
            setSubmitting(false);
        }
    };

    if (confirmed) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-purple-950 to-black p-4 text-white">
                <div className="mx-auto mt-16 max-w-md rounded-2xl bg-purple-900/50 p-8 text-center backdrop-blur-md">
                    <div className="mb-4 text-5xl">✅</div>
                    <h1 className="mb-2 text-2xl font-bold">Вы записаны!</h1>
                    <p className="text-purple-200">
                        {confirmed.service}
                        <br />
                        {formatDayLabel(confirmed.startsAt, tz)}, {formatTime(confirmed.startsAt, tz)}
                    </p>
                    <p className="mt-4 text-sm text-purple-300">«{business.name}» ждёт вас.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-950 to-black p-4 text-white">
            <div className="mx-auto max-w-md space-y-6 py-6">
                <header className="text-center">
                    <h1 className="text-2xl font-bold">{business.name}</h1>
                    {business.description && (
                        <p className="mt-1 text-sm text-purple-300">{business.description}</p>
                    )}
                </header>

                {business.services.length === 0 ? (
                    <p className="rounded-xl bg-purple-900/40 p-4 text-center text-purple-200">
                        Пока нет услуг для записи.
                    </p>
                ) : (
                    <>
                        <section className="space-y-2">
                            <h2 className="text-sm font-semibold text-purple-300">Услуга</h2>
                            <div className="space-y-2">
                                {business.services.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setServiceId(s.id)}
                                        className={clsx(
                                            'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition',
                                            s.id === serviceId
                                                ? 'border-purple-400 bg-purple-700/40'
                                                : 'border-purple-800 bg-purple-900/30 hover:bg-purple-800/30',
                                        )}
                                    >
                                        <span>
                                            <span className="block font-medium">{s.name}</span>
                                            <span className="text-xs text-purple-300">
                                                {formatDuration(s.durationMinutes)}
                                            </span>
                                        </span>
                                        <span className="font-semibold">
                                            {formatMoney(s.amount, s.currency)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <SelectField
                            label="Мастер"
                            value={employeeId}
                            onChange={setEmployeeId}
                            options={employeeOptions}
                        />

                        <section className="space-y-2">
                            <h2 className="text-sm font-semibold text-purple-300">Дата и время</h2>
                            {loadingSlots ? (
                                <p className="text-sm text-purple-300">Загружаем расписание…</p>
                            ) : openDays.length === 0 ? (
                                <p className="text-sm text-purple-300">
                                    Нет свободных слотов в ближайшие {RANGE_DAYS} дней.
                                </p>
                            ) : (
                                <>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {openDays.map((d) => (
                                            <button
                                                key={d.date}
                                                onClick={() => {
                                                    setSelectedDate(d.date);
                                                    setSlot(null);
                                                }}
                                                className={clsx(
                                                    'shrink-0 rounded-xl border px-3 py-2 text-sm transition',
                                                    d.date === selectedDate
                                                        ? 'border-purple-400 bg-purple-700/40'
                                                        : 'border-purple-800 bg-purple-900/30 hover:bg-purple-800/30',
                                                )}
                                            >
                                                {formatDayLabel(`${d.date}T00:00:00Z`, 'UTC')}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {daySlots.map((s) => (
                                            <button
                                                key={s.startsAt}
                                                onClick={() => setSlot(s)}
                                                className={clsx(
                                                    'rounded-lg border px-3 py-1.5 text-sm transition',
                                                    slot?.startsAt === s.startsAt
                                                        ? 'border-purple-400 bg-purple-600'
                                                        : 'border-purple-800 bg-purple-900/30 hover:bg-purple-800/30',
                                                )}
                                            >
                                                {formatTime(s.startsAt, tz)}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>

                        <section className="space-y-1">
                            <h2 className="text-sm font-semibold text-purple-300">Ваши данные</h2>
                            <TextField label="Имя" autoComplete="name" value={name} onChange={setName} />
                            <TextField
                                label="Телефон"
                                type="tel"
                                autoComplete="tel"
                                value={phone}
                                onChange={setPhone}
                            />
                            <TextField
                                label="Email"
                                hint="Необязательно"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={setEmail}
                            />
                        </section>

                        <div className="flex justify-center">
                            <Button onClick={handleSubmit} loading={submitting}>
                                {selectedService
                                    ? `Записаться · ${formatMoney(selectedService.amount, selectedService.currency)}`
                                    : 'Записаться'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
};
