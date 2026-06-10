'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '@/ui/modal/Modal';
import { useNotification } from '@/contexts/NotificationContext';
import {
    completeAppointmentAction,
    noShowAppointmentAction,
    cancelAppointmentAction,
} from '@/actions/appointments';
import type { AppointmentDetail } from '@/services/appointments';
import { formatMoney, formatDateTime } from './financeHelpers';

interface Props {
    pending: AppointmentDetail[];
    timezone: string;
    onResolved: () => void;
}

/**
 * Напоминание «расскажите, как прошёл день»: показывает прошедшие записи в
 * статусе scheduled, статус которых ещё не подтверждён. Запись считается
 * завершённой только после подтверждения, поэтому до этого она не попадает в
 * выручку. Модалка позволяет быстро закрыть каждую запись.
 */
export function PendingConfirmations({ pending, timezone, onResolved }: Props) {
    const [open, setOpen] = useState(false);

    if (pending.length === 0) return null;

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-400/30 rounded-2xl px-4 py-3">
                <div className="flex items-start gap-3">
                    <Sparkles size={18} className="text-amber-300 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-white font-medium">Расскажите, как прошёл ваш день</p>
                        <p className="text-amber-100/80 text-sm">
                            {pending.length} {pluralRecords(pending.length)} ждут подтверждения —
                            уделите пару минут и закройте их, чтобы аналитика была точной.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setOpen(true)}
                    className="shrink-0 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-medium rounded-xl cursor-pointer transition"
                >
                    Закрыть записи
                </button>
            </div>

            {open && (
                <ConfirmationsDialog
                    pending={pending}
                    timezone={timezone}
                    onClose={() => setOpen(false)}
                    onResolved={onResolved}
                />
            )}
        </>
    );
}

function ConfirmationsDialog({
    pending,
    timezone,
    onClose,
    onResolved,
}: {
    pending: AppointmentDetail[];
    timezone: string;
    onClose: () => void;
    onResolved: () => void;
}) {
    const alert = useNotification();
    const [busyId, setBusyId] = useState<string | null>(null);

    const resolve = async (
        id: string,
        action: (id: string) => Promise<{ ok: boolean; error?: string }>,
        successMsg: string,
    ) => {
        setBusyId(id);
        try {
            const r = await action(id);
            if (r.ok) {
                alert('success', successMsg);
                onResolved();
            } else {
                alert('error', r.error ?? 'Ошибка');
            }
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Закрытие записей"
            footer={
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-medium cursor-pointer transition"
                >
                    Готово
                </button>
            }
        >
            <p className="text-purple-300 text-sm mb-4">
                Подтвердите, что произошло с каждой записью. Завершённые попадут в выручку.
            </p>
            <ul className="space-y-2.5">
                {pending.map((apt) => (
                    <li
                        key={apt.id}
                        className="bg-white/5 border border-purple-700/40 rounded-xl p-3"
                    >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                            <div className="min-w-0">
                                <p className="text-white font-medium truncate">{apt.client.name}</p>
                                <p className="text-purple-300 text-xs mt-0.5">
                                    {formatDateTime(apt.startsAt, timezone)} ·{' '}
                                    {apt.service?.name ?? 'Без услуги'}
                                    {apt.employee ? ` · ${apt.employee.name}` : ''}
                                </p>
                            </div>
                            {apt.amount > 0 && (
                                <span className="text-purple-100 text-sm whitespace-nowrap">
                                    {formatMoney(apt.amount, apt.currency)}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <ActionButton
                                disabled={busyId === apt.id}
                                className="bg-emerald-600 hover:bg-emerald-500"
                                onClick={() =>
                                    resolve(apt.id, completeAppointmentAction, 'Запись завершена')
                                }
                            >
                                Состоялась
                            </ActionButton>
                            <ActionButton
                                disabled={busyId === apt.id}
                                className="bg-amber-600 hover:bg-amber-500"
                                onClick={() =>
                                    resolve(apt.id, noShowAppointmentAction, 'Отмечено: не пришёл')
                                }
                            >
                                Не пришёл
                            </ActionButton>
                            <ActionButton
                                disabled={busyId === apt.id}
                                className="bg-rose-600 hover:bg-rose-500"
                                onClick={() =>
                                    resolve(apt.id, cancelAppointmentAction, 'Запись отменена')
                                }
                            >
                                Отменить
                            </ActionButton>
                        </div>
                    </li>
                ))}
            </ul>
        </Modal>
    );
}

function ActionButton({
    onClick,
    disabled,
    className,
    children,
}: {
    onClick: () => void;
    disabled: boolean;
    className: string;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium cursor-pointer transition disabled:opacity-50 ${className}`}
        >
            {children}
        </button>
    );
}

function pluralRecords(n: number): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'запись';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'записи';
    return 'записей';
}
