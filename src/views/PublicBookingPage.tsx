'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNotification } from '@/contexts/NotificationContext';
import { formatMoney, formatDuration, formatTime, formatDayLabel } from '@/lib/format';
import type { PublicBusiness } from '@/services/public-booking';
import type { DayAvailability } from '@/services/availability';

const RANGE_DAYS = 14;
const ANY = '';

// Акцентный цвет страницы. В следующем PR будет приходить из настроек бизнеса
// (business.publicAccentColor); пока — фирменный фиолетовый по умолчанию.
const ACCENT = '#7c3aed';

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

function initialsOf(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '');
    return letters.join('') || '?';
}

export const PublicBookingPage = ({ business }: Props) => {
    const alert = useNotification();
    const tz = business.timezone;
    const accent = ACCENT;

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
            if (seen.has(s.startsAt)) continue;
            seen.add(s.startsAt);
            result.push({ startsAt: s.startsAt, masterId: s.masterId });
        }
        return result;
    }, [openDays, selectedDate]);

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
            <main className="min-h-screen bg-zinc-100 px-4 py-10 text-zinc-900">
                <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
                    <div
                        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-3xl text-white"
                        style={{ backgroundColor: accent }}
                    >
                        ✓
                    </div>
                    <h1 className="mb-2 text-2xl font-bold">Вы записаны!</h1>
                    <p className="text-zinc-600">
                        {confirmed.service}
                        <br />
                        {formatDayLabel(confirmed.startsAt, tz)}, {formatTime(confirmed.startsAt, tz)}
                    </p>
                    <p className="mt-4 text-sm text-zinc-400">«{business.name}» ждёт вас.</p>
                </div>
            </main>
        );
    }

    const ctaLabel = selectedService
        ? `Записаться · ${formatMoney(selectedService.amount, selectedService.currency)}`
        : 'Записаться';

    return (
        <main className="min-h-screen bg-zinc-100 text-zinc-900">
            <div className="mx-auto max-w-md space-y-4 px-4 pb-28 pt-5">
                {/* Шапка бизнеса */}
                <header className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                    <Avatar name={business.name} accent={accent} />
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-bold">{business.name}</h1>
                        {business.description && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">
                                {business.description}
                            </p>
                        )}
                    </div>
                </header>

                {business.services.length === 0 ? (
                    <Card>
                        <p className="text-center text-zinc-500">Пока нет услуг для записи.</p>
                    </Card>
                ) : (
                    <>
                        {/* Услуги */}
                        <Card title="Услуги" count={business.services.length}>
                            <div className="space-y-2">
                                {business.services.map((s) => {
                                    const active = s.id === serviceId;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setServiceId(s.id)}
                                            className={clsx(
                                                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                                                active
                                                    ? 'bg-zinc-50'
                                                    : 'border-zinc-200 hover:bg-zinc-50',
                                            )}
                                            style={active ? { borderColor: accent } : undefined}
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-medium text-zinc-900">
                                                    {s.name}
                                                </span>
                                                <span className="text-sm text-zinc-500">
                                                    {formatMoney(s.amount, s.currency)} ·{' '}
                                                    {formatDuration(s.durationMinutes)}
                                                </span>
                                            </span>
                                            <Radio active={active} accent={accent} />
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Специалист */}
                        <Card title="Специалист">
                            <div className="flex flex-wrap gap-2">
                                <MasterChip
                                    label="Любой"
                                    active={employeeId === ANY}
                                    accent={accent}
                                    onClick={() => setEmployeeId(ANY)}
                                />
                                {business.team.map((t) => (
                                    <MasterChip
                                        key={t.id}
                                        label={t.name}
                                        active={employeeId === t.id}
                                        accent={accent}
                                        onClick={() => setEmployeeId(t.id)}
                                    />
                                ))}
                            </div>
                        </Card>

                        {/* Дата и время */}
                        <Card title="Дата и время">
                            {loadingSlots ? (
                                <p className="text-sm text-zinc-500">Загружаем расписание…</p>
                            ) : openDays.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    Нет свободных слотов в ближайшие {RANGE_DAYS} дней.
                                </p>
                            ) : (
                                <>
                                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                                        {openDays.map((d) => {
                                            const active = d.date === selectedDate;
                                            return (
                                                <button
                                                    key={d.date}
                                                    onClick={() => {
                                                        setSelectedDate(d.date);
                                                        setSlot(null);
                                                    }}
                                                    className={clsx(
                                                        'shrink-0 rounded-xl border px-3 py-2 text-sm transition',
                                                        active
                                                            ? 'text-white'
                                                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50',
                                                    )}
                                                    style={
                                                        active
                                                            ? { backgroundColor: accent, borderColor: accent }
                                                            : undefined
                                                    }
                                                >
                                                    {formatDayLabel(`${d.date}T00:00:00Z`, 'UTC')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-3">
                                        {daySlots.map((s) => {
                                            const active = slot?.startsAt === s.startsAt;
                                            return (
                                                <button
                                                    key={s.startsAt}
                                                    onClick={() => setSlot(s)}
                                                    className={clsx(
                                                        'rounded-lg border px-3 py-1.5 text-sm transition',
                                                        active
                                                            ? 'text-white'
                                                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50',
                                                    )}
                                                    style={
                                                        active
                                                            ? { backgroundColor: accent, borderColor: accent }
                                                            : undefined
                                                    }
                                                >
                                                    {formatTime(s.startsAt, tz)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </Card>

                        {/* Контактные данные */}
                        <Card title="Ваши данные">
                            <div className="space-y-3">
                                <LInput
                                    label="Имя"
                                    autoComplete="name"
                                    value={name}
                                    onChange={setName}
                                    accent={accent}
                                />
                                <LInput
                                    label="Телефон"
                                    type="tel"
                                    autoComplete="tel"
                                    value={phone}
                                    onChange={setPhone}
                                    accent={accent}
                                />
                                <LInput
                                    label="Email (необязательно)"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={setEmail}
                                    accent={accent}
                                />
                            </div>
                        </Card>
                    </>
                )}
            </div>

            {/* Липкая кнопка записи */}
            {business.services.length > 0 && (
                <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/90 p-3 backdrop-blur">
                    <div className="mx-auto max-w-md">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full rounded-xl py-3 text-center font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
                            style={{ backgroundColor: accent }}
                        >
                            {submitting ? 'Отправка…' : ctaLabel}
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
};

function Card({
    title,
    count,
    children,
}: {
    title?: string;
    count?: number;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            {title && (
                <h2 className="mb-3 text-base font-semibold text-zinc-900">
                    {title}
                    {count !== undefined && <span className="ml-1.5 text-zinc-400">{count}</span>}
                </h2>
            )}
            {children}
        </section>
    );
}

function Avatar({ name, accent }: { name: string; accent: string }) {
    return (
        <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
            style={{ backgroundColor: accent }}
        >
            {initialsOf(name)}
        </div>
    );
}

function Radio({ active, accent }: { active: boolean; accent: string }) {
    return (
        <span
            className={clsx(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                !active && 'border-zinc-300',
            )}
            style={active ? { borderColor: accent } : undefined}
        >
            {active && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />}
        </span>
    );
}

function MasterChip({
    label,
    active,
    accent,
    onClick,
}: {
    label: string;
    active: boolean;
    accent: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                'rounded-full border px-4 py-2 text-sm transition',
                active ? 'text-white' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50',
            )}
            style={active ? { backgroundColor: accent, borderColor: accent } : undefined}
        >
            {label}
        </button>
    );
}

function LInput({
    label,
    value,
    onChange,
    type = 'text',
    autoComplete,
    accent,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: 'text' | 'tel' | 'email';
    autoComplete?: string;
    accent: string;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm text-zinc-600">{label}</span>
            <input
                type={type}
                value={value}
                autoComplete={autoComplete}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-400 outline-none transition focus:ring-2"
                style={{ ['--tw-ring-color' as string]: accent } as React.CSSProperties}
            />
        </label>
    );
}
