'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
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

// Палитра страницы: нейтральные токены зависят от темы, акцент — из настроек бизнеса.
interface UI {
    page: string;
    card: string;
    sub: string;
    item: string;
    itemActive: string;
    pill: string;
    radio: string;
    input: string;
    bar: string;
}

const LIGHT: UI = {
    page: 'bg-zinc-100 text-zinc-900',
    card: 'bg-white ring-black/5',
    sub: 'text-zinc-500',
    item: 'border-zinc-200 hover:bg-zinc-50',
    itemActive: 'bg-zinc-50',
    pill: 'border-zinc-200 text-zinc-700 hover:bg-zinc-50',
    radio: 'border-zinc-300',
    input: 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
    bar: 'bg-white/90 border-zinc-200',
};

const DARK: UI = {
    page: 'bg-zinc-950 text-zinc-100',
    card: 'bg-zinc-900 ring-white/10',
    sub: 'text-zinc-400',
    item: 'border-zinc-800 hover:bg-zinc-800/50',
    itemActive: 'bg-zinc-800/50',
    pill: 'border-zinc-700 text-zinc-200 hover:bg-zinc-800',
    radio: 'border-zinc-600',
    input: 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500',
    bar: 'bg-zinc-900/90 border-zinc-800',
};

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
    const accent = business.accentColor;
    const ui = business.theme === 'dark' ? DARK : LIGHT;

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
            <main className={clsx('min-h-screen px-4 py-10', ui.page)}>
                <div className={clsx('mx-auto mt-10 max-w-md rounded-2xl p-8 text-center shadow-sm ring-1', ui.card)}>
                    <div
                        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-3xl text-white"
                        style={{ backgroundColor: accent }}
                    >
                        ✓
                    </div>
                    <h1 className="mb-2 text-2xl font-bold">Вы записаны!</h1>
                    <p className={ui.sub}>
                        {confirmed.service}
                        <br />
                        {formatDayLabel(confirmed.startsAt, tz)}, {formatTime(confirmed.startsAt, tz)}
                    </p>
                    <p className={clsx('mt-4 text-sm', ui.sub)}>«{business.name}» ждёт вас.</p>
                </div>
            </main>
        );
    }

    const ctaLabel = selectedService
        ? `Записаться · ${formatMoney(selectedService.amount, selectedService.currency)}`
        : 'Записаться';

    return (
        <main className={clsx('min-h-screen', ui.page)}>
            <div className="mx-auto max-w-md space-y-4 px-4 pb-28 pt-5">
                {/* Шапка бизнеса */}
                <header className={clsx('flex items-center gap-4 rounded-2xl p-5 shadow-sm ring-1', ui.card)}>
                    <Avatar name={business.name} accent={accent} />
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-bold">{business.name}</h1>
                        {business.description && (
                            <p className={clsx('mt-0.5 line-clamp-2 text-sm', ui.sub)}>
                                {business.description}
                            </p>
                        )}
                        {business.address && (
                            <p className={clsx('mt-1 text-sm', ui.sub)}>{business.address}</p>
                        )}
                        {business.phone && (
                            <a
                                href={`tel:${business.phone.replace(/[^\d+]/g, '')}`}
                                className="mt-0.5 inline-block text-sm font-medium"
                                style={{ color: accent }}
                            >
                                {business.phone}
                            </a>
                        )}
                    </div>
                </header>

                {business.services.length === 0 ? (
                    <Card ui={ui}>
                        <p className={clsx('text-center', ui.sub)}>Пока нет услуг для записи.</p>
                    </Card>
                ) : (
                    <>
                        {/* Услуги */}
                        <Card ui={ui} title="Услуги" count={business.services.length}>
                            <div className="space-y-2">
                                {business.services.map((s) => {
                                    const active = s.id === serviceId;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setServiceId(s.id)}
                                            className={clsx(
                                                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                                                active ? ui.itemActive : ui.item,
                                            )}
                                            style={active ? { borderColor: accent } : undefined}
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-medium">{s.name}</span>
                                                <span className={clsx('text-sm', ui.sub)}>
                                                    {formatMoney(s.amount, s.currency)} ·{' '}
                                                    {formatDuration(s.durationMinutes)}
                                                </span>
                                            </span>
                                            <Radio active={active} accent={accent} ui={ui} />
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Специалист */}
                        <Card ui={ui} title="Специалист">
                            <div className="flex flex-wrap gap-2">
                                <Chip
                                    label="Любой"
                                    active={employeeId === ANY}
                                    accent={accent}
                                    ui={ui}
                                    onClick={() => setEmployeeId(ANY)}
                                />
                                {business.team.map((t) => (
                                    <Chip
                                        key={t.id}
                                        label={t.name}
                                        active={employeeId === t.id}
                                        accent={accent}
                                        ui={ui}
                                        onClick={() => setEmployeeId(t.id)}
                                    />
                                ))}
                            </div>
                        </Card>

                        {/* Дата и время */}
                        <Card ui={ui} title="Дата и время">
                            {loadingSlots ? (
                                <p className={clsx('text-sm', ui.sub)}>Загружаем расписание…</p>
                            ) : openDays.length === 0 ? (
                                <p className={clsx('text-sm', ui.sub)}>
                                    Нет свободных слотов в ближайшие {RANGE_DAYS} дней.
                                </p>
                            ) : (
                                <>
                                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                                        {openDays.map((d) => (
                                            <Chip
                                                key={d.date}
                                                label={formatDayLabel(`${d.date}T00:00:00Z`, 'UTC')}
                                                active={d.date === selectedDate}
                                                accent={accent}
                                                ui={ui}
                                                shape="rounded-xl"
                                                onClick={() => {
                                                    setSelectedDate(d.date);
                                                    setSlot(null);
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-3">
                                        {daySlots.map((s) => (
                                            <Chip
                                                key={s.startsAt}
                                                label={formatTime(s.startsAt, tz)}
                                                active={slot?.startsAt === s.startsAt}
                                                accent={accent}
                                                ui={ui}
                                                shape="rounded-lg"
                                                onClick={() => setSlot(s)}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </Card>

                        {/* Контактные данные */}
                        <Card ui={ui} title="Ваши данные">
                            <div className="space-y-3">
                                <LInput label="Имя" autoComplete="name" value={name} onChange={setName} accent={accent} ui={ui} />
                                <LInput label="Телефон" type="tel" autoComplete="tel" value={phone} onChange={setPhone} accent={accent} ui={ui} />
                                <LInput label="Email (необязательно)" type="email" autoComplete="email" value={email} onChange={setEmail} accent={accent} ui={ui} />
                            </div>
                        </Card>
                    </>
                )}
            </div>

            {/* Липкая кнопка записи */}
            {business.services.length > 0 && (
                <div className={clsx('fixed inset-x-0 bottom-0 border-t p-3 backdrop-blur', ui.bar)}>
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
    ui,
    title,
    count,
    children,
}: {
    ui: UI;
    title?: string;
    count?: number;
    children: React.ReactNode;
}) {
    return (
        <section className={clsx('rounded-2xl p-5 shadow-sm ring-1', ui.card)}>
            {title && (
                <h2 className="mb-3 text-base font-semibold">
                    {title}
                    {count !== undefined && <span className={clsx('ml-1.5', ui.sub)}>{count}</span>}
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

function Radio({ active, accent, ui }: { active: boolean; accent: string; ui: UI }) {
    return (
        <span
            className={clsx(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                !active && ui.radio,
            )}
            style={active ? { borderColor: accent } : undefined}
        >
            {active && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />}
        </span>
    );
}

function Chip({
    label,
    active,
    accent,
    ui,
    onClick,
    shape = 'rounded-full',
}: {
    label: string;
    active: boolean;
    accent: string;
    ui: UI;
    onClick: () => void;
    shape?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                'shrink-0 border px-4 py-2 text-sm transition',
                shape,
                active ? 'text-white' : ui.pill,
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
    ui,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: 'text' | 'tel' | 'email';
    autoComplete?: string;
    accent: string;
    ui: UI;
}) {
    return (
        <label className="block">
            <span className={clsx('mb-1 block text-sm', ui.sub)}>{label}</span>
            <input
                type={type}
                value={value}
                autoComplete={autoComplete}
                onChange={(e) => onChange(e.target.value)}
                className={clsx(
                    'w-full rounded-xl border px-3 py-2.5 outline-none transition focus:ring-2',
                    ui.input,
                )}
                style={{ ['--tw-ring-color' as string]: accent } as React.CSSProperties}
            />
        </label>
    );
}
