'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import { Button } from '@/ui/button/Button';
import { Input } from '@/ui/input/Input';
import { Popup } from '@/ui/popup/Popup';
import Spinner from '@/ui/spinner/Spinner';
import { useAccess } from '@/hooks/useAccess';
import { useBusiness } from '@/contexts/BusinessContext';
import { useNotification } from '@/contexts/NotificationContext';
import {
    listMembersAction,
    inviteMemberAction,
    revokeInviteAction,
    removeMemberAction,
} from '@/actions/employees';
import type { ListMembersResult, Member, PendingInvite } from '@/services/employees';
import type { BusinessMemberRole } from '@/db/schema';

const ROLE_LABELS: Record<'OWNER' | BusinessMemberRole, string> = {
    OWNER: 'Владелец',
    MANAGER: 'Менеджер',
    EMPLOYEE: 'Сотрудник',
};

export default function EmployeesPage() {
    const access = useAccess();
    const { currentBusiness } = useBusiness();
    const alert = useNotification();

    const [data, setData] = useState<ListMembersResult | null>(null);
    const [loading, setLoading] = useState(false);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState<{ email: string; role: BusinessMemberRole }>({
        email: '',
        role: 'EMPLOYEE',
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!currentBusiness) return;
        setLoading(true);
        try {
            const result = await listMembersAction(currentBusiness);
            if (result.ok) setData(result.data);
            else alert('error', result.error);
        } finally {
            setLoading(false);
        }
    }, [currentBusiness, alert]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInvite = async () => {
        if (!currentBusiness) return;
        if (!inviteForm.email.trim()) {
            alert('error', 'Введите email');
            return;
        }
        setSubmitting(true);
        try {
            const result = await inviteMemberAction({
                businessId: currentBusiness,
                email: inviteForm.email,
                role: inviteForm.role,
            });
            if (result.ok) {
                alert('success', 'Приглашение отправлено');
                setInviteForm({ email: '', role: 'EMPLOYEE' });
                setInviteOpen(false);
                fetchData();
            } else {
                alert('error', result.error);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleRevoke = async (invite: PendingInvite) => {
        const result = await revokeInviteAction(invite.id);
        if (result.ok) {
            alert('success', 'Приглашение отозвано');
            fetchData();
        } else {
            alert('error', result.error);
        }
    };

    const handleRemove = async (member: Member) => {
        if (!currentBusiness) return;
        const result = await removeMemberAction(currentBusiness, member.id);
        if (result.ok) {
            alert('success', `${member.name} удалён из команды`);
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
                    <h1 className="text-3xl font-bold text-white mb-4">Сотрудники</h1>
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

    return (
        <LayoutPage>
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-10">
                    <div>
                        <p className="text-purple-300 text-sm mb-1">{data.business.name}</p>
                        <h1 className="text-4xl font-bold text-white tracking-tight">Команда</h1>
                    </div>
                    {data.isOwner && (
                        <div className="w-48">
                            <Button onClick={() => setInviteOpen(true)}>Пригласить</Button>
                        </div>
                    )}
                </header>

                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                    <StatCard label="В команде" value={data.members.length} />
                    <StatCard label="Приглашений" value={data.invites.length} />
                </section>

                <section className="mb-10">
                    <h2 className="text-xl font-semibold text-white mb-4">Состав</h2>
                    <div className="bg-white/5 backdrop-blur border border-purple-700/40 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/[0.03] text-purple-300 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3">Имя</th>
                                    <th className="px-5 py-3">Email</th>
                                    <th className="px-5 py-3">Роль</th>
                                    {data.isOwner && <th className="px-5 py-3 text-right">Действия</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {data.members.map((m) => (
                                    <tr key={m.id} className="border-t border-purple-700/30">
                                        <td className="px-5 py-3 text-white">{m.name}</td>
                                        <td className="px-5 py-3 text-purple-200">{m.email}</td>
                                        <td className="px-5 py-3">
                                            <RoleBadge role={m.role} />
                                        </td>
                                        {data.isOwner && (
                                            <td className="px-5 py-3 text-right">
                                                {m.role !== 'OWNER' && (
                                                    <button
                                                        onClick={() => handleRemove(m)}
                                                        className="text-sm text-red-400 hover:text-red-300 cursor-pointer"
                                                    >
                                                        Удалить
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {data.isOwner && data.invites.length > 0 && (
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Ожидают принятия
                        </h2>
                        <div className="bg-white/5 backdrop-blur border border-purple-700/40 rounded-2xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-white/[0.03] text-purple-300 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3">Email</th>
                                        <th className="px-5 py-3">Роль</th>
                                        <th className="px-5 py-3">Истекает</th>
                                        <th className="px-5 py-3 text-right">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.invites.map((inv) => (
                                        <tr key={inv.id} className="border-t border-purple-700/30">
                                            <td className="px-5 py-3 text-white">{inv.email}</td>
                                            <td className="px-5 py-3">
                                                <RoleBadge role={inv.role} />
                                            </td>
                                            <td className="px-5 py-3 text-purple-300 text-sm">
                                                {new Date(inv.expiresAt).toLocaleDateString('ru-RU')}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() => handleRevoke(inv)}
                                                    className="text-sm text-purple-300 hover:text-white cursor-pointer"
                                                >
                                                    Отозвать
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {inviteOpen && (
                    <Popup title="Пригласить в команду">
                        <Input
                            type="email"
                            placeholder="Email сотрудника"
                            value={inviteForm.email}
                            setValue={(v) => setInviteForm({ ...inviteForm, email: v })}
                            transitionDelay={0.2}
                        />
                        <div className="mb-4">
                            <p className="text-purple-300 text-sm mb-2">Роль</p>
                            <div className="flex gap-2">
                                {(['EMPLOYEE', 'MANAGER'] as const).map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => setInviteForm({ ...inviteForm, role })}
                                        className={`flex-1 px-4 py-3 rounded-xl border transition cursor-pointer ${
                                            inviteForm.role === role
                                                ? 'bg-purple-600 border-purple-500 text-white'
                                                : 'bg-purple-800/30 border-purple-700 text-purple-300 hover:bg-purple-800/50'
                                        }`}
                                    >
                                        {ROLE_LABELS[role]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button
                                onClick={handleInvite}
                                loading={submitting}
                                transitionDelay={0.3}
                            >
                                Отправить
                            </Button>
                            <Button onClick={() => setInviteOpen(false)} transitionDelay={0.35}>
                                Отмена
                            </Button>
                        </div>
                    </Popup>
                )}
            </div>
        </LayoutPage>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="bg-white/5 backdrop-blur border border-purple-700/40 rounded-2xl p-5">
            <p className="text-purple-300 text-sm mb-2">{label}</p>
            <p className="text-3xl font-semibold text-white tracking-tight tabular-nums">{value}</p>
        </div>
    );
}

function RoleBadge({ role }: { role: 'OWNER' | BusinessMemberRole }) {
    const colors: Record<'OWNER' | BusinessMemberRole, string> = {
        OWNER: 'bg-purple-500/30 text-purple-200 border-purple-400/40',
        MANAGER: 'bg-blue-500/30 text-blue-200 border-blue-400/40',
        EMPLOYEE: 'bg-white/10 text-purple-200 border-white/20',
    };
    return (
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs border ${colors[role]}`}>
            {ROLE_LABELS[role]}
        </span>
    );
}
