'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import { Button } from '@/ui/button/Button';
import { TextField } from '@/ui/form';
import { Modal } from '@/ui/modal/Modal';
import Spinner from '@/ui/spinner/Spinner';
import { useAccess } from '@/hooks/useAccess';
import { useBusiness } from '@/contexts/BusinessContext';
import { useNotification } from '@/contexts/NotificationContext';
import { listApiKeysAction, createApiKeyAction, revokeApiKeyAction } from '@/actions/api-keys';
import type { ApiKeyItem } from '@/services/api-keys';

export default function SettingsApiPage() {
    const access = useAccess('OWNER', 'ADMIN');
    const { currentBusiness } = useBusiness();
    const alert = useNotification();

    const [keys, setKeys] = useState<ApiKeyItem[] | null>(null);
    const [loading, setLoading] = useState(false);

    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Ключ показывается ОДИН раз после создания.
    const [revealed, setRevealed] = useState<{ name: string; rawKey: string } | null>(null);

    const fetchData = useCallback(async () => {
        if (!currentBusiness) return;
        setLoading(true);
        try {
            const result = await listApiKeysAction(currentBusiness);
            if (result.ok) setKeys(result.data);
            else alert('error', result.error);
        } finally {
            setLoading(false);
        }
    }, [currentBusiness, alert]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreate = async () => {
        if (!currentBusiness) return;
        setSubmitting(true);
        try {
            const result = await createApiKeyAction({ businessId: currentBusiness, name });
            if (result.ok) {
                setRevealed({ name: result.data.name, rawKey: result.data.rawKey });
                setName('');
                setCreateOpen(false);
                fetchData();
            } else {
                alert('error', result.error);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleRevoke = async (key: ApiKeyItem) => {
        const result = await revokeApiKeyAction(key.id);
        if (result.ok) {
            alert('success', 'Ключ отозван');
            fetchData();
        } else {
            alert('error', result.error);
        }
    };

    const copyKey = async () => {
        if (!revealed) return;
        try {
            await navigator.clipboard.writeText(revealed.rawKey);
            alert('success', 'Ключ скопирован');
        } catch {
            alert('error', 'Не удалось скопировать — выделите вручную');
        }
    };

    if (access.status !== 'ok') {
        return <LayoutPage>{access.component}</LayoutPage>;
    }

    if (!currentBusiness) {
        return (
            <LayoutPage>
                <div className="max-w-2xl mx-auto text-center mt-24">
                    <h1 className="text-3xl font-bold text-white mb-4">API-ключи</h1>
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

    if (loading && !keys) {
        return (
            <LayoutPage>
                <div className="max-w-6xl mx-auto flex justify-center mt-24">
                    <Spinner />
                </div>
            </LayoutPage>
        );
    }

    return (
        <LayoutPage>
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-purple-300 text-sm mb-1">Интеграции</p>
                        <h1 className="text-4xl font-bold text-white tracking-tight">API-ключи</h1>
                    </div>
                    <div className="w-48">
                        <Button onClick={() => setCreateOpen(true)}>Создать ключ</Button>
                    </div>
                </header>

                <p className="text-purple-300 text-sm mb-8 max-w-2xl">
                    Ключи дают внешним системам (например, AI-боту) доступ к расписанию и записям
                    этого бизнеса. Ключ показывается один раз при создании — сохраните его.
                </p>

                {revealed && (
                    <div className="mb-8 rounded-2xl border border-green-400/40 bg-green-500/10 p-5">
                        <p className="text-green-200 font-medium mb-2">
                            Ключ «{revealed.name}» создан. Скопируйте его сейчас — позже мы его не
                            покажем.
                        </p>
                        <div className="flex items-center gap-3">
                            <code className="flex-1 px-4 py-3 rounded-xl bg-black/40 text-green-100 text-sm break-all">
                                {revealed.rawKey}
                            </code>
                            <button
                                onClick={copyKey}
                                className="px-4 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white text-sm cursor-pointer transition"
                            >
                                Скопировать
                            </button>
                            <button
                                onClick={() => setRevealed(null)}
                                className="px-3 py-3 text-green-200 hover:text-white text-sm cursor-pointer"
                            >
                                Скрыть
                            </button>
                        </div>
                    </div>
                )}

                {keys && keys.length === 0 ? (
                    <div className="text-center text-purple-300 py-16 bg-white/5 border border-purple-700/40 rounded-2xl">
                        Ключей пока нет. Создайте первый — и подключите бота.
                    </div>
                ) : (
                    <div className="bg-white/5 backdrop-blur border border-purple-700/40 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/[0.03] text-purple-300 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3">Название</th>
                                    <th className="px-5 py-3">Права</th>
                                    <th className="px-5 py-3">Создан</th>
                                    <th className="px-5 py-3">Последнее использование</th>
                                    <th className="px-5 py-3 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {keys?.map((k) => (
                                    <tr key={k.id} className="border-t border-purple-700/30">
                                        <td className="px-5 py-3 text-white">{k.name}</td>
                                        <td className="px-5 py-3 text-purple-200 text-xs">
                                            {k.scopes.join(', ')}
                                        </td>
                                        <td className="px-5 py-3 text-purple-300 text-sm">
                                            {new Date(k.createdAt).toLocaleDateString('ru-RU')}
                                        </td>
                                        <td className="px-5 py-3 text-purple-300 text-sm">
                                            {k.lastUsedAt
                                                ? new Date(k.lastUsedAt).toLocaleString('ru-RU')
                                                : '—'}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={() => handleRevoke(k)}
                                                className="text-sm text-red-400 hover:text-red-300 cursor-pointer"
                                            >
                                                Отозвать
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Modal
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    title="Создать API-ключ"
                    footer={
                        <>
                            <button
                                onClick={() => setCreateOpen(false)}
                                className="px-4 py-2.5 text-purple-200 hover:text-white text-sm cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={submitting}
                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-white font-medium cursor-pointer transition"
                            >
                                {submitting ? 'Создание...' : 'Создать'}
                            </button>
                        </>
                    }
                >
                    <TextField
                        label="Название (для чего ключ)"
                        autoComplete="off"
                        value={name}
                        onChange={setName}
                    />
                    <p className="text-purple-300 text-xs mt-2">
                        Ключ получит полный доступ к расписанию и записям: чтение свободных окон,
                        создание, перенос и отмена записей, заведение клиентов.
                    </p>
                </Modal>
            </div>
        </LayoutPage>
    );
}
