'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import { Button } from '@/ui/button/Button';
import { TextField } from '@/ui/form';
import { Modal } from '@/ui/modal/Modal';
import { Select } from '@/ui/select/Select';
import Spinner from '@/ui/spinner/Spinner';
import { useAccess, useEffectiveRole } from '@/hooks/useAccess';
import { useBusiness } from '@/contexts/BusinessContext';
import { useNotification } from '@/contexts/NotificationContext';
import {
    listClientsAction,
    createClientAction,
    updateClientAction,
} from '@/actions/clients';
import { listMembersAction } from '@/actions/employees';
import { ClientStatsModal } from '@/views/clients/ClientStatsModal';
import type { Member } from '@/services/employees';
import type { Client } from '@/db/schema';

const PER_PAGE = 25;
const SEARCH_DEBOUNCE_MS = 300;

// Спец-значения фильтра по сотруднику (помимо id сотрудника).
const FILTER_ALL = '';
const FILTER_UNASSIGNED = 'none';

export default function ClientsPage() {
    const access = useAccess();
    const { role } = useEffectiveRole();
    const { currentBusiness } = useBusiness();
    const alert = useNotification();

    // Статистика клиента и фильтр по сотруднику — только у владельца бизнеса.
    // (ADMIN — глобальный платформенный супердоступ.)
    const isOwner = role === 'OWNER' || role === 'ADMIN';
    const [statsClient, setStatsClient] = useState<Client | null>(null);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [clients, setClients] = useState<Client[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    // Фильтр по сотруднику (только владелец): '' — все, 'none' — без сотрудника, иначе id.
    const [members, setMembers] = useState<Member[]>([]);
    const [employeeFilter, setEmployeeFilter] = useState<string>(FILTER_ALL);

    const [addOpen, setAddOpen] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(id);
    }, [search]);

    const employeeUserId =
        !isOwner || employeeFilter === FILTER_ALL
            ? undefined
            : employeeFilter === FILTER_UNASSIGNED
              ? null
              : employeeFilter;

    const fetchClients = useCallback(async () => {
        if (!currentBusiness) return;
        setLoading(true);
        try {
            const result = await listClientsAction({
                businessId: currentBusiness,
                search: debouncedSearch || undefined,
                page,
                perPage: PER_PAGE,
                employeeUserId,
            });
            if (result.ok) {
                setClients(result.data.clients);
                setTotal(result.data.total);
            } else {
                alert('error', result.error);
            }
        } finally {
            setLoading(false);
        }
    }, [currentBusiness, debouncedSearch, page, employeeUserId, alert]);

    // Список сотрудников для фильтра (только владелец). При смене бизнеса
    // сбрасываем фильтр, чтобы не остаться с сотрудником из другого бизнеса.
    useEffect(() => {
        setEmployeeFilter(FILTER_ALL);
        if (!isOwner || !currentBusiness) {
            setMembers([]);
            return;
        }
        listMembersAction(currentBusiness).then((result) => {
            if (result.ok) setMembers(result.data.members);
        });
    }, [isOwner, currentBusiness]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const handleAdd = async () => {
        if (!currentBusiness) return;
        setSubmitting(true);
        try {
            const result = await createClientAction({
                businessId: currentBusiness,
                name: form.name,
                phone: form.phone,
                email: form.email || undefined,
                note: form.note || undefined,
            });
            if (result.ok) {
                alert('success', 'Клиент добавлен');
                setForm({ name: '', phone: '', email: '', note: '' });
                setAddOpen(false);
                if (page !== 1) setPage(1);
                else fetchClients();
            } else {
                alert('error', result.error);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleBlacklist = async (client: Client) => {
        const result = await updateClientAction(client.id, {
            isBlacklisted: !client.isBlacklisted,
        });
        if (result.ok) {
            alert('success', client.isBlacklisted ? 'Разблокирован' : 'Перенесён в ЧС');
            fetchClients();
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
                <div className="max-w-4xl mx-auto text-center text-purple-300 mt-20">
                    Сначала создайте бизнес в разделе{' '}
                    <a href="/my-business" className="underline hover:text-white">
                        «Мои бизнесы»
                    </a>
                </div>
            </LayoutPage>
        );
    }

    const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

    return (
        <LayoutPage>
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white">Клиенты ({total})</h1>
                    <div className="w-48">
                        <Button onClick={() => setAddOpen(true)}>Добавить клиента</Button>
                    </div>
                </div>

                {isOwner && (
                    <p className="mb-4 text-purple-400 text-sm">
                        Нажмите на имя клиента, чтобы увидеть визиты и выручку.
                    </p>
                )}

                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <TextField
                            type="search"
                            placeholder="Поиск по имени или телефону"
                            value={search}
                            onChange={setSearch}
                            inline
                        />
                    </div>
                    {isOwner && (
                        <div className="sm:w-64">
                            <Select
                                value={employeeFilter}
                                onChange={(v) => {
                                    setEmployeeFilter(v);
                                    setPage(1);
                                }}
                                options={[
                                    { label: 'Все сотрудники', value: FILTER_ALL },
                                    ...members.map((m) => ({ label: m.name, value: m.id })),
                                    { label: 'Без сотрудника', value: FILTER_UNASSIGNED },
                                ]}
                            />
                        </div>
                    )}
                </div>

                <div className="bg-purple-800 bg-opacity-30 border border-purple-700 rounded-lg overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-purple-900 bg-opacity-50">
                            <tr>
                                <th className="px-4 py-3 text-purple-300 text-sm">Имя</th>
                                <th className="px-4 py-3 text-purple-300 text-sm">Телефон</th>
                                <th className="px-4 py-3 text-purple-300 text-sm">Email</th>
                                <th className="px-4 py-3 text-purple-300 text-sm">Заметка</th>
                                <th className="px-4 py-3 text-purple-300 text-sm">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && clients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center">
                                        <Spinner />
                                    </td>
                                </tr>
                            ) : clients.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-purple-400"
                                    >
                                        {debouncedSearch
                                            ? 'Никого не найдено'
                                            : 'Список пуст — добавьте первого клиента'}
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client) => (
                                    <tr
                                        key={client.id}
                                        className={`border-t border-purple-700/30 ${client.isBlacklisted ? 'opacity-50' : ''}`}
                                    >
                                        <td className="px-4 py-3 text-white">
                                            {isOwner ? (
                                                <button
                                                    onClick={() => setStatsClient(client)}
                                                    className="cursor-pointer text-left text-white underline decoration-purple-500/40 underline-offset-2 hover:decoration-white"
                                                >
                                                    {client.name}
                                                </button>
                                            ) : (
                                                client.name
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-purple-200">
                                            {client.phone}
                                        </td>
                                        <td className="px-4 py-3 text-purple-300 text-sm">
                                            {client.email ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-purple-300 text-sm">
                                            {client.note ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleToggleBlacklist(client)}
                                                    className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-500 rounded text-white cursor-pointer"
                                                >
                                                    {client.isBlacklisted ? 'Разблокировать' : 'В ЧС'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {pageCount > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6 text-sm">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 bg-purple-700 hover:bg-purple-600 rounded text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            ←
                        </button>
                        <span className="px-3 py-1 text-purple-300">
                            {page} / {pageCount}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                            disabled={page === pageCount}
                            className="px-3 py-1 bg-purple-700 hover:bg-purple-600 rounded text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            →
                        </button>
                    </div>
                )}

                <Modal
                    open={addOpen}
                    onClose={() => setAddOpen(false)}
                    title="Добавить клиента"
                    footer={
                        <>
                            <button
                                onClick={() => setAddOpen(false)}
                                className="px-4 py-2.5 text-purple-200 hover:text-white text-sm cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={submitting}
                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-white font-medium cursor-pointer transition"
                            >
                                {submitting ? 'Добавление...' : 'Добавить'}
                            </button>
                        </>
                    }
                >
                    <TextField
                        label="Имя"
                        value={form.name}
                        onChange={(v) => setForm({ ...form, name: v })}
                        autoFocus
                    />
                    <TextField
                        label="Телефон"
                        type="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(v) => setForm({ ...form, phone: v })}
                    />
                    <TextField
                        label="Email"
                        type="email"
                        hint="Необязательно"
                        value={form.email}
                        onChange={(v) => setForm({ ...form, email: v })}
                    />
                    <TextField
                        label="Заметка"
                        hint="Необязательно — будет видна только команде"
                        value={form.note}
                        onChange={(v) => setForm({ ...form, note: v })}
                    />
                </Modal>

                {isOwner && (
                    <ClientStatsModal
                        businessId={currentBusiness}
                        client={statsClient}
                        onClose={() => setStatsClient(null)}
                    />
                )}
            </div>
        </LayoutPage>
    );
}
