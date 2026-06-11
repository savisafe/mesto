'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import { Button } from '@/ui/button/Button';
import { Modal } from '@/ui/modal/Modal';
import {
    TextField,
    NumberField,
    SelectField,
    TimeField,
    DurationField,
} from '@/ui/form';
import Spinner from '@/ui/spinner/Spinner';
import { useAccess, useEffectiveRole } from '@/hooks/useAccess';
import { useBusiness } from '@/contexts/BusinessContext';
import { useNotification } from '@/contexts/NotificationContext';
import {
    createAppointmentAction,
    cancelAppointmentAction,
    completeAppointmentAction,
} from '@/actions/appointments';
import { getCalendarDayAction } from '@/actions/calendar';
import {
    listServicesAction,
    createServiceAction,
    deleteServiceAction,
} from '@/actions/services';
import { listClientsAction } from '@/actions/clients';
import { listMembersAction } from '@/actions/employees';
import type { Service, Client, AppointmentStatus } from '@/db/schema';
import type { AppointmentDetail } from '@/services/appointments';
import type { CalendarDayData } from '@/services/calendar';
import type { Member } from '@/services/employees';
import CalendarDayGrid from './CalendarDayGrid';

const EMPLOYEE_ANY = '__any__';

interface CreatePrefill {
    employeeId: string | null;
    startsAt: Date;
}

export default function CalendarPage() {
    const access = useAccess();
    const { role } = useEffectiveRole();
    const { currentBusiness } = useBusiness();
    const alert = useNotification();

    // Управление (услуги, создание записи) — владелец/менеджер; сотрудник — нет.
    const canManage = role === 'OWNER' || role === 'MANAGER' || role === 'ADMIN';

    const [date, setDate] = useState(() => toLocalDateString(new Date()));
    const [calendar, setCalendar] = useState<CalendarDayData | null>(null);
    const [loading, setLoading] = useState(false);

    const [services, setServices] = useState<Service[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [members, setMembers] = useState<Member[]>([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [createPrefill, setCreatePrefill] = useState<CreatePrefill | null>(null);
    const [servicesOpen, setServicesOpen] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<AppointmentDetail | null>(null);

    const fetchReferences = useCallback(async () => {
        if (!currentBusiness) return;
        const [svc, cli, mem] = await Promise.all([
            listServicesAction(currentBusiness),
            listClientsAction({ businessId: currentBusiness, perPage: 100 }),
            listMembersAction(currentBusiness),
        ]);
        if (svc.ok) setServices(svc.data);
        if (cli.ok) setClients(cli.data.clients);
        if (mem.ok) setMembers(mem.data.members);
    }, [currentBusiness]);

    const fetchCalendar = useCallback(async () => {
        if (!currentBusiness) return;
        setLoading(true);
        try {
            const result = await getCalendarDayAction(currentBusiness, date);
            if (result.ok) setCalendar(result.data);
            else alert('error', result.error);
        } finally {
            setLoading(false);
        }
    }, [currentBusiness, date, alert]);

    useEffect(() => {
        fetchReferences();
    }, [fetchReferences]);

    useEffect(() => {
        fetchCalendar();
    }, [fetchCalendar]);

    const openCreate = (prefill: CreatePrefill | null) => {
        setCreatePrefill(prefill);
        setCreateOpen(true);
    };

    const handleCancel = async (id: string) => {
        const r = await cancelAppointmentAction(id);
        if (r.ok) {
            alert('success', 'Запись отменена');
            setSelectedAppt(null);
            fetchCalendar();
        } else {
            alert('error', r.error);
        }
    };

    const handleComplete = async (id: string) => {
        const r = await completeAppointmentAction(id);
        if (r.ok) {
            alert('success', 'Запись завершена');
            setSelectedAppt(null);
            fetchCalendar();
        } else {
            alert('error', r.error);
        }
    };

    if (access.status !== 'ok') {
        return <LayoutPage>{access.component}</LayoutPage>;
    }

    if (!currentBusiness) {
        return (
            <LayoutPage>
                <div className="max-w-2xl mx-auto text-center mt-24">
                    <h1 className="text-3xl font-bold text-white mb-4">Календарь</h1>
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
            <div className="max-w-[1400px] mx-auto">
                <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <p className="text-purple-300 text-sm mb-1">Расписание</p>
                        <h1 className="text-4xl font-bold text-white tracking-tight">
                            {formatDateHeader(date)}
                        </h1>
                    </div>
                    {canManage && (
                        <div className="flex gap-2 items-center">
                            <button
                                onClick={() => setServicesOpen(true)}
                                className="text-sm text-purple-300 hover:text-white cursor-pointer px-3 py-2"
                            >
                                Услуги ({services.length})
                            </button>
                            <div className="w-48">
                                <Button onClick={() => openCreate(null)}>Новая запись</Button>
                            </div>
                        </div>
                    )}
                </header>

                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <DateNav date={date} onChange={setDate} />
                    <Legend />
                </div>

                {canManage && (services.length === 0 || clients.length === 0) && (
                    <OnboardingHint services={services} />
                )}

                <section>
                    {loading && !calendar ? (
                        <div className="flex justify-center py-16">
                            <Spinner />
                        </div>
                    ) : calendar ? (
                        <div className={loading ? 'opacity-60 transition' : 'transition'}>
                            <CalendarDayGrid
                                data={calendar}
                                onSlotClick={
                                    canManage
                                        ? (employeeId, startsAt) =>
                                              openCreate({ employeeId, startsAt })
                                        : undefined
                                }
                                onApptClick={setSelectedAppt}
                            />
                        </div>
                    ) : null}
                </section>

                {calendar && (
                    <CreateAppointmentDialog
                        open={createOpen}
                        businessId={currentBusiness}
                        date={date}
                        dayStart={calendar.dayStart}
                        timezone={calendar.timezone}
                        services={services}
                        clients={clients}
                        members={members}
                        prefill={createPrefill}
                        onClose={() => setCreateOpen(false)}
                        onCreated={() => {
                            setCreateOpen(false);
                            fetchCalendar();
                        }}
                    />
                )}

                {selectedAppt && calendar && (
                    <AppointmentDetailModal
                        apt={selectedAppt}
                        timezone={calendar.timezone}
                        onClose={() => setSelectedAppt(null)}
                        onCancel={() => handleCancel(selectedAppt.id)}
                        onComplete={() => handleComplete(selectedAppt.id)}
                    />
                )}

                <ServicesDialog
                    open={servicesOpen}
                    businessId={currentBusiness}
                    services={services}
                    onClose={() => setServicesOpen(false)}
                    onChanged={fetchReferences}
                />
            </div>
        </LayoutPage>
    );
}

function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
    const shift = (days: number) => {
        const d = new Date(`${date}T00:00:00`);
        d.setDate(d.getDate() + days);
        onChange(toLocalDateString(d));
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => shift(-1)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-purple-200 cursor-pointer"
                aria-label="Предыдущий день"
            >
                ←
            </button>
            <button
                onClick={() => onChange(toLocalDateString(new Date()))}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-purple-200 text-sm cursor-pointer"
            >
                Сегодня
            </button>
            <button
                onClick={() => shift(1)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-purple-200 cursor-pointer"
                aria-label="Следующий день"
            >
                →
            </button>
            <input
                type="date"
                value={date}
                onChange={(e) => onChange(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-purple-700/40 rounded-lg text-white text-sm"
            />
        </div>
    );
}

function Legend() {
    const items: { label: string; className: string }[] = [
        { label: 'Запись', className: 'bg-indigo-500/85' },
        { label: 'Завершена', className: 'bg-emerald-600/80' },
        { label: 'Отменена', className: 'bg-white/10' },
        { label: 'Блок', className: 'bg-rose-500/40' },
    ];
    return (
        <div className="flex flex-wrap items-center gap-3 text-xs text-purple-300">
            {items.map((it) => (
                <span key={it.label} className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-sm ${it.className}`} />
                    {it.label}
                </span>
            ))}
            <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-500" />
                Сейчас
            </span>
        </div>
    );
}

function OnboardingHint({ services }: { services: Service[] }) {
    return (
        <div className="mb-4 bg-white/5 border border-purple-700/40 rounded-xl px-4 py-3 text-sm text-purple-200">
            {services.length === 0 ? (
                <>Чтобы создавать записи, добавьте услуги — кнопка «Услуги» наверху.</>
            ) : (
                <>
                    Добавьте клиентов в разделе{' '}
                    <a href="/clients" className="underline hover:text-white">
                        «Клиенты»
                    </a>
                    , чтобы создавать записи.
                </>
            )}
        </div>
    );
}

function AppointmentDetailModal({
    apt,
    timezone,
    onClose,
    onCancel,
    onComplete,
}: {
    apt: AppointmentDetail;
    timezone: string;
    onClose: () => void;
    onCancel: () => void;
    onComplete: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const active = apt.status === 'scheduled';

    const run = async (fn: () => void) => {
        setBusy(true);
        try {
            await fn();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={apt.client.name}
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-purple-200 hover:text-white text-sm cursor-pointer"
                    >
                        Закрыть
                    </button>
                    {active && (
                        <>
                            <button
                                onClick={() => run(onComplete)}
                                disabled={busy}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-white text-sm font-medium cursor-pointer transition"
                            >
                                Завершить
                            </button>
                            <button
                                onClick={() => run(onCancel)}
                                disabled={busy}
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl text-white text-sm font-medium cursor-pointer transition"
                            >
                                Отменить
                            </button>
                        </>
                    )}
                </>
            }
        >
            <dl className="space-y-3 text-sm">
                <Row label="Время">
                    {fmtTime(apt.startsAt, timezone)} — {fmtTime(apt.endsAt, timezone)}
                    {!isSameLocalDay(apt.startsAt, apt.endsAt, timezone) && (
                        <span className="text-purple-300">
                            {' '}
                            ({fmtDate(apt.endsAt, timezone)})
                        </span>
                    )}
                </Row>
                <Row label="Статус">
                    <StatusBadge status={apt.status} />
                </Row>
                <Row label="Услуга">{apt.service?.name ?? 'Без услуги'}</Row>
                <Row label="Клиент">
                    {apt.client.name}
                    {apt.client.phone && ` · ${apt.client.phone}`}
                </Row>
                <Row label="Сотрудник">{apt.employee?.name ?? 'Не назначен'}</Row>
                {apt.amount > 0 && <Row label="Цена">{formatMoney(apt.amount, apt.currency)}</Row>}
                {apt.notes && <Row label="Заметка">{apt.notes}</Row>}
            </dl>
        </Modal>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-purple-400">{label}</dt>
            <dd className="text-white">{children}</dd>
        </div>
    );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
    const map: Record<AppointmentStatus, { label: string; className: string }> = {
        scheduled: { label: 'Запланирована', className: 'text-indigo-200 border-indigo-400/40' },
        completed: { label: 'Завершена', className: 'text-emerald-200 border-emerald-400/40' },
        cancelled: { label: 'Отменена', className: 'text-rose-200 border-rose-400/40' },
        no_show: { label: 'Не пришёл', className: 'text-amber-200 border-amber-400/40' },
    };
    const s = map[status];
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border ${s.className}`}>{s.label}</span>
    );
}

function CreateAppointmentDialog({
    open,
    businessId,
    date,
    dayStart,
    timezone,
    services,
    clients,
    members,
    prefill,
    onClose,
    onCreated,
}: {
    open: boolean;
    businessId: string;
    date: string;
    dayStart: Date;
    timezone: string;
    services: Service[];
    clients: Client[];
    members: Member[];
    prefill: CreatePrefill | null;
    onClose: () => void;
    onCreated: () => void;
}) {
    const alert = useNotification();
    const [serviceId, setServiceId] = useState<string>('');
    const [clientId, setClientId] = useState<string>('');
    const [employeeId, setEmployeeId] = useState<string>(EMPLOYEE_ANY);
    const [time, setTime] = useState('10:00');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Сбрасываем форму при каждом открытии: значения по умолчанию или из prefill
    // (клик по слоту в сетке — подставляет сотрудника и время этого слота).
    useEffect(() => {
        if (!open) return;
        setServiceId(services[0]?.id ?? '');
        setClientId(clients[0]?.id ?? '');
        setEmployeeId(prefill ? (prefill.employeeId ?? EMPLOYEE_ANY) : EMPLOYEE_ANY);
        setTime(prefill ? fmtHm(prefill.startsAt, timezone) : '10:00');
        setNotes('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const selectedService = useMemo(
        () => services.find((s) => s.id === serviceId),
        [services, serviceId],
    );

    const handleSubmit = async () => {
        if (!serviceId || !clientId) {
            alert('error', 'Выберите услугу и клиента');
            return;
        }
        if (!selectedService) return;

        const [h, m] = time.split(':').map(Number);
        if (!Number.isInteger(h) || !Number.isInteger(m)) {
            alert('error', 'Некорректное время');
            return;
        }
        // Локальная полночь дня (в зоне бизнеса) + минуты = точный UTC-момент.
        const startsAt = new Date(new Date(dayStart).getTime() + (h * 60 + m) * 60_000);

        setSubmitting(true);
        try {
            const r = await createAppointmentAction({
                businessId,
                clientId,
                serviceId,
                employeeUserId: employeeId === EMPLOYEE_ANY ? null : employeeId,
                startsAt,
                durationMinutes: selectedService.durationMinutes,
                notes: notes || undefined,
            });
            if (r.ok) {
                alert('success', 'Запись создана');
                onCreated();
            } else {
                alert('error', r.error);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Новая запись"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-purple-200 hover:text-white text-sm cursor-pointer"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-white font-medium cursor-pointer transition"
                    >
                        {submitting ? 'Создание...' : 'Создать'}
                    </button>
                </>
            }
        >
            <p className="text-purple-300 text-sm mb-4">{formatDateHeader(date)}</p>
            <SelectField
                label="Услуга"
                value={serviceId}
                onChange={setServiceId}
                options={services.map((s) => ({
                    value: s.id,
                    label: `${s.name} · ${formatDuration(s.durationMinutes)} · ${formatMoney(s.amount, s.currency)}`,
                }))}
            />
            <SelectField
                label="Клиент"
                value={clientId}
                onChange={setClientId}
                options={clients.map((c) => ({
                    value: c.id,
                    label: c.phone ? `${c.name} (${c.phone})` : c.name,
                }))}
            />
            <SelectField
                label="Сотрудник"
                value={employeeId}
                onChange={setEmployeeId}
                options={[
                    { value: EMPLOYEE_ANY, label: 'Не назначен' },
                    ...members.map((m) => ({ value: m.id, label: m.name })),
                ]}
            />
            <TimeField label="Время" value={time} onChange={setTime} />
            <TextField
                label="Заметка (необязательно)"
                value={notes}
                onChange={setNotes}
                placeholder="Комментарий для сотрудника"
            />
        </Modal>
    );
}

function ServicesDialog({
    open,
    businessId,
    services,
    onClose,
    onChanged,
}: {
    open: boolean;
    businessId: string;
    services: Service[];
    onClose: () => void;
    onChanged: () => void;
}) {
    const alert = useNotification();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [submitting, setSubmitting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<string | null>(null);

    const handleAdd = async () => {
        const amountNum = parseInt(amount, 10);
        if (!name.trim()) {
            alert('error', 'Введите название');
            return;
        }
        if (isNaN(amountNum) || amountNum < 0) {
            alert('error', 'Некорректная цена');
            return;
        }
        if (durationMinutes <= 0) {
            alert('error', 'Некорректная длительность');
            return;
        }

        setSubmitting(true);
        try {
            const r = await createServiceAction({
                businessId,
                name,
                amount: amountNum,
                durationMinutes,
            });
            if (r.ok) {
                setName('');
                setAmount('');
                setDurationMinutes(60);
                onChanged();
            } else {
                alert('error', r.error);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (pendingDelete !== id) {
            setPendingDelete(id);
            return;
        }
        const r = await deleteServiceAction(id);
        if (r.ok) {
            setPendingDelete(null);
            onChanged();
        } else {
            alert('error', r.error);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Услуги"
            footer={
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-medium cursor-pointer transition"
                >
                    Готово
                </button>
            }
        >
            {/* Форма создания идёт сверху как первичное действие.
                Список услуг идёт ниже — рост списка не выбивает форму
                из видимости, body модалки прокручивается. */}
            <section className="mb-6 pb-6 border-b border-purple-700/30">
                <h3 className="text-purple-300 text-xs uppercase tracking-wider font-medium mb-3">
                    Новая услуга
                </h3>
                <TextField
                    label="Название"
                    value={name}
                    onChange={setName}
                    placeholder="например: консультация, замена масла, окрашивание"
                />
                <NumberField
                    label="Цена (₸)"
                    value={amount}
                    onChange={setAmount}
                    min={0}
                    placeholder="0"
                />
                <DurationField
                    label="Длительность"
                    valueMinutes={durationMinutes}
                    onChangeMinutes={setDurationMinutes}
                />
                <Button onClick={handleAdd} loading={submitting}>
                    Добавить
                </Button>
            </section>

            <section>
                <h3 className="text-purple-300 text-xs uppercase tracking-wider font-medium mb-3">
                    Все услуги ({services.length})
                </h3>
                {services.length === 0 ? (
                    <p className="text-purple-400 text-sm text-center py-6">
                        Пока пусто. Добавьте первую услугу выше.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {services.map((s) => (
                            <li
                                key={s.id}
                                className="flex items-center justify-between gap-3 bg-white/5 border border-purple-700/40 rounded-xl p-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-white truncate">{s.name}</p>
                                    <p className="text-purple-300 text-xs mt-0.5">
                                        {formatDuration(s.durationMinutes)} ·{' '}
                                        {formatMoney(s.amount, s.currency)}
                                    </p>
                                </div>
                                {pendingDelete === s.id ? (
                                    <div className="flex gap-2 text-sm">
                                        <button
                                            onClick={() => handleDelete(s.id)}
                                            className="text-red-400 hover:text-red-300 font-medium cursor-pointer"
                                        >
                                            Удалить?
                                        </button>
                                        <button
                                            onClick={() => setPendingDelete(null)}
                                            className="text-purple-300 hover:text-white cursor-pointer"
                                        >
                                            Нет
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        className="text-purple-400 hover:text-red-400 text-sm cursor-pointer"
                                    >
                                        Удалить
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </Modal>
    );
}

// --- helpers

function toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDateHeader(date: string): string {
    const d = new Date(`${date}T00:00:00`);
    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
    }).format(d);
}

/** "HH:MM" (24ч) в зоне бизнеса — для поля времени. */
function fmtHm(d: Date, tz: string): string {
    return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz,
    }).format(new Date(d));
}

/** "HH:MM" (ru) в зоне бизнеса — для отображения. */
function fmtTime(d: Date, tz: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: tz,
    }).format(new Date(d));
}

/** "1 янв" в зоне бизнеса — для конца многодневной записи. */
function fmtDate(d: Date, tz: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        timeZone: tz,
    }).format(new Date(d));
}

/** Совпадает ли календарный день начала и конца в зоне бизнеса. */
function isSameLocalDay(a: Date, b: Date, tz: string): boolean {
    const f = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: tz,
    });
    return f.format(new Date(a)) === f.format(new Date(b));
}

function formatMoney(amount: number, currency: string): string {
    const symbol = currency === 'KZT' ? '₸' : currency === 'RUB' ? '₽' : currency;
    return `${amount.toLocaleString('ru-RU')} ${symbol}`;
}

// Выбирает наибольшую красивую единицу, в которой число остаётся целым.
// 90 мин → "90 мин" (не делится на час нацело)
// 60 мин → "1 час", 120 мин → "2 ч"
// 1440 мин → "1 день", 4320 мин → "3 дн"
function formatDuration(minutes: number): string {
    if (minutes <= 0) return '0';
    if (minutes >= 1440 && minutes % 1440 === 0) {
        const days = minutes / 1440;
        return `${days} ${days === 1 ? 'день' : 'дн'}`;
    }
    if (minutes >= 60 && minutes % 60 === 0) {
        const hours = minutes / 60;
        return `${hours} ${hours === 1 ? 'час' : 'ч'}`;
    }
    return `${minutes} мин`;
}
