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

                <CreateAppointmentDialog
                    open={createOpen}
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
        { value: EMPLOYEE_ANY, label: 'Без сотрудника' },
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
    open,
    businessId,
    date,
    services,
    clients,
    members,
    onClose,
    onCreated,
}: {
    open: boolean;
    businessId: string;
    date: string;
    services: Service[];
    clients: Client[];
    members: Member[];
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

    // Сбрасываем форму на «дефолт первого элемента» каждый раз когда модалку
    // открывают: иначе useState инициализируется на первом монтировании
    // (когда services/clients ещё пустые, потому что fetchReferences не успел)
    // → селекты визуально показывают первый option, но state остаётся ''.
    useEffect(() => {
        if (!open) return;
        setServiceId(services[0]?.id ?? '');
        setClientId(clients[0]?.id ?? '');
        setEmployeeId(EMPLOYEE_ANY);
        setTime('10:00');
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
                options={clients.map((c) => ({ value: c.id, label: `${c.name} (${c.phone})` }))}
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
