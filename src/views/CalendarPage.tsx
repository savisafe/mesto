'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import { Button } from '@/ui/button/Button';
import { Input } from '@/ui/input/Input';
import { Popup } from '@/ui/popup/Popup';
import Spinner from '@/ui/spinner/Spinner';
import { useAccess } from '@/hooks/useAccess';
import { useBusiness } from '@/contexts/BusinessContext';
import { useNotification } from '@/contexts/NotificationContext';
import {
    listAppointmentsAction,
    createAppointmentAction,
    cancelAppointmentAction,
} from '@/actions/appointments';
import {
    listServicesAction,
    createServiceAction,
    deleteServiceAction,
} from '@/actions/services';
import { listClientsAction } from '@/actions/clients';
import { listMembersAction } from '@/actions/employees';
import type { Service, Client } from '@/db/schema';
import type { AppointmentDetail } from '@/services/appointments';
import type { Member } from '@/services/employees';

const EMPLOYEE_ANY = '__any__';

export default function CalendarPage() {
    const access = useAccess();
    const { currentBusiness } = useBusiness();
    const alert = useNotification();

    const [date, setDate] = useState(() => toLocalDateString(new Date()));
    const [employeeFilter, setEmployeeFilter] = useState<string>('all');
    const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
    const [loading, setLoading] = useState(false);

    const [services, setServices] = useState<Service[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [members, setMembers] = useState<Member[]>([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [servicesOpen, setServicesOpen] = useState(false);

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

    const fetchAppointments = useCallback(async () => {
        if (!currentBusiness) return;
        const { from, to } = dayWindow(date);
        setLoading(true);
        try {
            const result = await listAppointmentsAction({
                businessId: currentBusiness,
                from,
                to,
                employeeUserId:
                    employeeFilter === 'all'
                        ? undefined
                        : employeeFilter === EMPLOYEE_ANY
                          ? null
                          : employeeFilter,
            });
            if (result.ok) setAppointments(result.data);
            else alert('error', result.error);
        } finally {
            setLoading(false);
        }
    }, [currentBusiness, date, employeeFilter, alert]);

    useEffect(() => {
        fetchReferences();
    }, [fetchReferences]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const handleCancel = async (id: string) => {
        const r = await cancelAppointmentAction(id);
        if (r.ok) {
            alert('success', 'Запись отменена');
            fetchAppointments();
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
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <p className="text-purple-300 text-sm mb-1">Расписание</p>
                        <h1 className="text-4xl font-bold text-white tracking-tight">
                            {formatDateHeader(date)}
                        </h1>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setServicesOpen(true)}
                            className="text-sm text-purple-300 hover:text-white cursor-pointer px-3 py-2"
                        >
                            Услуги ({services.length})
                        </button>
                        <div className="w-48">
                            <Button onClick={() => setCreateOpen(true)}>Новая запись</Button>
                        </div>
                    </div>
                </header>

                <DateNav date={date} onChange={setDate} />

                <EmployeeFilter
                    members={members}
                    value={employeeFilter}
                    onChange={setEmployeeFilter}
                />

                <section className="mt-6">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Spinner />
                        </div>
                    ) : appointments.length === 0 ? (
                        <EmptyState
                            services={services}
                            clients={clients}
                            onCreate={() => setCreateOpen(true)}
                        />
                    ) : (
                        <div className="space-y-3">
                            {appointments.map((apt) => (
                                <AppointmentRow
                                    key={apt.id}
                                    apt={apt}
                                    onCancel={() => handleCancel(apt.id)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {createOpen && (
                    <CreateAppointmentDialog
                        businessId={currentBusiness}
                        date={date}
                        services={services}
                        clients={clients}
                        members={members}
                        onClose={() => setCreateOpen(false)}
                        onCreated={() => {
                            setCreateOpen(false);
                            fetchAppointments();
                        }}
                    />
                )}

                {servicesOpen && (
                    <ServicesDialog
                        businessId={currentBusiness}
                        services={services}
                        onClose={() => setServicesOpen(false)}
                        onChanged={fetchReferences}
                    />
                )}
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
        <div className="flex items-center gap-2 mb-6">
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

function EmployeeFilter({
    members,
    value,
    onChange,
}: {
    members: Member[];
    value: string;
    onChange: (v: string) => void;
}) {
    const options: { value: string; label: string }[] = [
        { value: 'all', label: 'Все' },
        { value: EMPLOYEE_ANY, label: 'Без мастера' },
        ...members.map((m) => ({ value: m.id, label: m.name })),
    ];
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm transition cursor-pointer ${
                        value === opt.value
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 text-purple-300 hover:bg-white/10'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

function AppointmentRow({
    apt,
    onCancel,
}: {
    apt: AppointmentDetail;
    onCancel: () => void;
}) {
    const isCancelled = apt.status === 'cancelled';
    return (
        <article
            className={`bg-white/5 backdrop-blur border border-purple-700/40 rounded-2xl p-5 flex items-start justify-between gap-4 ${
                isCancelled ? 'opacity-50' : ''
            }`}
        >
            <div className="flex-1">
                <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-2xl font-semibold text-white tabular-nums">
                        {formatTime(apt.startsAt)}
                    </span>
                    <span className="text-purple-400 text-sm">
                        {formatTime(apt.startsAt)} — {formatTime(apt.endsAt)}
                    </span>
                    {isCancelled && (
                        <span className="text-xs text-red-300 px-2 py-0.5 rounded-full border border-red-500/30">
                            отменена
                        </span>
                    )}
                </div>
                <p className="text-white">
                    {apt.service?.name ?? 'Без услуги'}
                    {apt.amount > 0 && (
                        <span className="text-purple-300 ml-2 text-sm">
                            · {formatMoney(apt.amount, apt.currency)}
                        </span>
                    )}
                </p>
                <p className="text-purple-300 text-sm mt-1">
                    {apt.client.name} · {apt.client.phone}
                    {apt.employee && (
                        <>
                            <span className="mx-2">·</span>
                            {apt.employee.name}
                        </>
                    )}
                </p>
                {apt.notes && (
                    <p className="text-purple-400 text-xs mt-2">{apt.notes}</p>
                )}
            </div>
            {!isCancelled && (
                <button
                    onClick={onCancel}
                    className="text-sm text-red-400 hover:text-red-300 cursor-pointer whitespace-nowrap"
                >
                    Отменить
                </button>
            )}
        </article>
    );
}

function EmptyState({
    services,
    clients,
    onCreate,
}: {
    services: Service[];
    clients: Client[];
    onCreate: () => void;
}) {
    if (services.length === 0) {
        return (
            <div className="bg-white/5 border border-purple-700/40 rounded-2xl p-8 text-center">
                <p className="text-white mb-2">Сначала добавьте услуги</p>
                <p className="text-purple-300 text-sm">
                    Нажмите «Услуги» наверху и добавьте хотя бы одну.
                </p>
            </div>
        );
    }
    if (clients.length === 0) {
        return (
            <div className="bg-white/5 border border-purple-700/40 rounded-2xl p-8 text-center">
                <p className="text-white mb-2">Сначала добавьте клиентов</p>
                <p className="text-purple-300 text-sm">
                    Перейдите в{' '}
                    <a href="/clients" className="underline hover:text-white">
                        «Клиенты»
                    </a>
                    {' '}и добавьте хотя бы одного.
                </p>
            </div>
        );
    }
    return (
        <div className="bg-white/5 border border-purple-700/40 rounded-2xl p-8 text-center">
            <p className="text-white mb-3">На этот день записей нет</p>
            <button
                onClick={onCreate}
                className="text-purple-300 hover:text-white underline cursor-pointer"
            >
                Создать первую
            </button>
        </div>
    );
}

function CreateAppointmentDialog({
    businessId,
    date,
    services,
    clients,
    members,
    onClose,
    onCreated,
}: {
    businessId: string;
    date: string;
    services: Service[];
    clients: Client[];
    members: Member[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const alert = useNotification();
    const [serviceId, setServiceId] = useState<string>(services[0]?.id ?? '');
    const [clientId, setClientId] = useState<string>(clients[0]?.id ?? '');
    const [employeeId, setEmployeeId] = useState<string>(EMPLOYEE_ANY);
    const [time, setTime] = useState('10:00');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

        const startsAt = new Date(`${date}T${time}:00`);
        if (isNaN(startsAt.getTime())) {
            alert('error', 'Некорректное время');
            return;
        }

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
        <Popup title="Новая запись">
            <Field label="Услуга">
                <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-purple-800/40 border border-purple-700 rounded-xl text-white"
                >
                    {services.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name} · {s.durationMinutes}мин · {formatMoney(s.amount, s.currency)}
                        </option>
                    ))}
                </select>
            </Field>

            <Field label="Клиент">
                <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-purple-800/40 border border-purple-700 rounded-xl text-white"
                >
                    {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name} ({c.phone})
                        </option>
                    ))}
                </select>
            </Field>

            <Field label="Мастер">
                <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-purple-800/40 border border-purple-700 rounded-xl text-white"
                >
                    <option value={EMPLOYEE_ANY}>Без мастера</option>
                    {members.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name}
                        </option>
                    ))}
                </select>
            </Field>

            <Field label="Время">
                <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-purple-800/40 border border-purple-700 rounded-xl text-white"
                />
            </Field>

            <Field label="Заметка (необязательно)">
                <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Комментарий для мастера"
                    className="w-full px-3 py-2.5 bg-purple-800/40 border border-purple-700 rounded-xl text-white placeholder-purple-400"
                />
            </Field>

            <div className="flex gap-2 mt-4">
                <Button onClick={handleSubmit} loading={submitting}>
                    Создать
                </Button>
                <Button onClick={onClose}>Отмена</Button>
            </div>
        </Popup>
    );
}

function ServicesDialog({
    businessId,
    services,
    onClose,
    onChanged,
}: {
    businessId: string;
    services: Service[];
    onClose: () => void;
    onChanged: () => void;
}) {
    const alert = useNotification();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [duration, setDuration] = useState('60');
    const [submitting, setSubmitting] = useState(false);

    const handleAdd = async () => {
        const amountNum = parseInt(amount, 10);
        const durationNum = parseInt(duration, 10);
        if (!name.trim()) {
            alert('error', 'Введите название');
            return;
        }
        if (isNaN(amountNum) || amountNum < 0) {
            alert('error', 'Некорректная цена');
            return;
        }
        if (isNaN(durationNum) || durationNum <= 0) {
            alert('error', 'Некорректная длительность');
            return;
        }

        setSubmitting(true);
        try {
            const r = await createServiceAction({
                businessId,
                name,
                amount: amountNum,
                durationMinutes: durationNum,
            });
            if (r.ok) {
                setName('');
                setAmount('');
                setDuration('60');
                onChanged();
            } else {
                alert('error', r.error);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const r = await deleteServiceAction(id);
        if (r.ok) {
            onChanged();
        } else {
            alert('error', r.error);
        }
    };

    return (
        <Popup title="Услуги">
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {services.length === 0 ? (
                    <p className="text-purple-400 text-sm text-center py-4">
                        Пока ничего нет
                    </p>
                ) : (
                    services.map((s) => (
                        <div
                            key={s.id}
                            className="flex items-center justify-between gap-2 bg-purple-800/40 border border-purple-700 rounded-xl p-3"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-white truncate">{s.name}</p>
                                <p className="text-purple-300 text-xs">
                                    {s.durationMinutes} мин · {formatMoney(s.amount, s.currency)}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDelete(s.id)}
                                className="text-red-400 hover:text-red-300 text-sm cursor-pointer"
                            >
                                Удалить
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="border-t border-purple-700/30 pt-4 space-y-3">
                <p className="text-purple-300 text-sm">Новая услуга</p>
                <Input
                    type="text"
                    placeholder="Название (Маникюр, Стрижка...)"
                    value={name}
                    setValue={setName}
                />
                <div className="grid grid-cols-2 gap-2">
                    <Input
                        type="number"
                        placeholder="Цена ₸"
                        value={amount}
                        setValue={setAmount}
                    />
                    <Input
                        type="number"
                        placeholder="Длительность, мин"
                        value={duration}
                        setValue={setDuration}
                    />
                </div>
                <div className="flex gap-2 mt-2">
                    <Button onClick={handleAdd} loading={submitting}>
                        Добавить
                    </Button>
                    <Button onClick={onClose}>Готово</Button>
                </div>
            </div>
        </Popup>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-3">
            <p className="text-purple-300 text-xs mb-1.5">{label}</p>
            {children}
        </div>
    );
}

// --- helpers

function toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function dayWindow(date: string): { from: Date; to: Date } {
    const from = new Date(`${date}T00:00:00`);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { from, to };
}

function formatDateHeader(date: string): string {
    const d = new Date(`${date}T00:00:00`);
    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
    }).format(d);
}

function formatTime(d: Date): string {
    return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

function formatMoney(amount: number, currency: string): string {
    const symbol = currency === 'KZT' ? '₸' : currency === 'RUB' ? '₽' : currency;
    return `${amount.toLocaleString('ru-RU')} ${symbol}`;
}
