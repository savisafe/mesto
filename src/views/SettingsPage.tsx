'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/ui/button/Button';
import { TextField } from '@/ui/form';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { routes } from '@/routes/routes';

export default function SettingsPage() {
    const { businessesData, currentBusiness, updateBusiness } = useBusiness();
    const { user } = useAuth();
    const alert = useNotification();

    const business = useMemo(
        () => businessesData.find((b) => b.id === currentBusiness) ?? null,
        [businessesData, currentBusiness],
    );
    const isOwner = !!business && !!user && business.ownerId === user.id;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    // Синхронизируем форму, когда подгрузился/сменился текущий бизнес.
    useEffect(() => {
        if (!business) return;
        setName(business.name);
        setDescription(business.description ?? '');
    }, [business]);

    if (!business) {
        return (
            <section className="w-full max-w-2xl rounded-2xl bg-purple-900/50 p-5 text-white backdrop-blur-md sm:p-8">
                <h2 className="text-xl font-semibold">Настройки студии</h2>
                <p className="mt-2 text-sm text-purple-300">Сначала создайте бизнес.</p>
            </section>
        );
    }

    const handleSave = async () => {
        if (!name.trim()) {
            alert('error', 'Введите название студии');
            return;
        }
        setSaving(true);
        try {
            const result = await updateBusiness(business.id, {
                name: name.trim(),
                description,
            });
            if (result.success) {
                alert('success', 'Сохранено');
            } else {
                alert('error', result.error ?? 'Не удалось сохранить');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="w-full max-w-2xl space-y-8 rounded-2xl bg-purple-900/50 p-5 text-white backdrop-blur-md sm:p-8">
            <h2 className="text-xl font-semibold">Настройки студии</h2>

            {/* Общая информация — редактирует только владелец */}
            <div className="space-y-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-purple-300">
                    Общая информация
                </h3>
                {isOwner ? (
                    <>
                        <TextField
                            label="Название студии"
                            value={name}
                            onChange={setName}
                            placeholder="Например: Beauty Studio"
                        />
                        <TextField
                            label="Описание (необязательно)"
                            value={description}
                            onChange={setDescription}
                            placeholder="Коротко о студии"
                        />
                        <Button onClick={handleSave} loading={saving}>
                            Сохранить
                        </Button>
                    </>
                ) : (
                    <div className="space-y-2">
                        <InfoRow label="Название" value={business.name} />
                        {business.description && (
                            <InfoRow label="Описание" value={business.description} />
                        )}
                        <p className="text-xs text-purple-400">
                            Изменять данные студии может только владелец.
                        </p>
                    </div>
                )}
            </div>

            {/* Аккаунт — только просмотр (смена данных аккаунта пока не поддерживается) */}
            {user && (
                <div className="space-y-3 border-t border-purple-700/40 pt-6">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-purple-300">
                        Аккаунт
                    </h3>
                    <InfoRow label="Имя" value={user.name} />
                    <InfoRow label="Email" value={user.email} />
                    <InfoRow label="Телефон" value={user.phone} />
                </div>
            )}

            {/* График работы и часовой пояс — управляются на отдельной странице */}
            <div className="space-y-3 border-t border-purple-700/40 pt-6">
                <h3 className="text-xs font-medium uppercase tracking-wider text-purple-300">
                    График работы
                </h3>
                <InfoRow label="Часовой пояс" value={business.timezone} />
                <Link
                    href={routes.SCHEDULE}
                    className="inline-flex text-sm text-purple-300 underline hover:text-white"
                >
                    Настроить часы работы и выходные →
                </Link>
            </div>
        </section>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <span className="shrink-0 text-sm text-purple-400 sm:w-32">{label}</span>
            <span className="break-all text-sm text-white">{value}</span>
        </div>
    );
}
