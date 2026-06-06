'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Button } from '@/ui/button/Button';
import { TextField } from '@/ui/form';
import { useBusiness } from '@/contexts/BusinessContext';
import { useNotification } from '@/contexts/NotificationContext';
import { slugify } from '@/lib/slug';
import { publicBusinessPath } from '@/routes/routes';

export default function PublicBookingSettings() {
    const { businessesData, currentBusiness, updateBusiness } = useBusiness();
    const alert = useNotification();

    const business = useMemo(
        () => businessesData.find((b) => b.id === currentBusiness) ?? null,
        [businessesData, currentBusiness],
    );

    const [slug, setSlug] = useState('');
    const [enabled, setEnabled] = useState(false);
    const [saving, setSaving] = useState(false);

    // Синхронизируем форму, когда подгрузился/сменился текущий бизнес.
    useEffect(() => {
        if (!business) return;
        setSlug(business.slug ?? slugify(business.name));
        setEnabled(business.publicBookingEnabled);
    }, [business]);

    if (!business) {
        return (
            <section className="w-full max-w-2xl rounded-2xl bg-purple-900/50 p-8 text-white backdrop-blur-md">
                <h2 className="text-xl font-semibold">Публичная запись</h2>
                <p className="mt-2 text-sm text-purple-300">Сначала создайте бизнес.</p>
            </section>
        );
    }

    const normalizedSlug = slugify(slug);
    const publicUrl =
        typeof window !== 'undefined' && normalizedSlug
            ? `${window.location.origin}${publicBusinessPath(normalizedSlug)}`
            : '';

    const handleSave = async () => {
        if (enabled && !normalizedSlug) {
            alert('error', 'Задайте адрес страницы');
            return;
        }
        setSaving(true);
        try {
            const result = await updateBusiness(business.id, {
                slug: normalizedSlug || null,
                publicBookingEnabled: enabled,
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

    const handleCopy = async () => {
        if (!publicUrl) return;
        try {
            await navigator.clipboard.writeText(publicUrl);
            alert('success', 'Ссылка скопирована');
        } catch {
            alert('error', 'Не удалось скопировать');
        }
    };

    return (
        <section className="w-full max-w-2xl space-y-4 rounded-2xl bg-purple-900/50 p-8 text-white backdrop-blur-md">
            <h2 className="text-xl font-semibold">Публичная запись</h2>
            <p className="text-sm text-purple-300">
                Страница онлайн-записи для клиентов — без регистрации, по ссылке.
            </p>

            <button
                onClick={() => setEnabled((v) => !v)}
                className="flex items-center gap-3"
                type="button"
            >
                <span
                    className={clsx(
                        'relative h-6 w-11 rounded-full transition',
                        enabled ? 'bg-purple-500' : 'bg-purple-950',
                    )}
                >
                    <span
                        className={clsx(
                            'absolute top-0.5 h-5 w-5 rounded-full bg-white transition',
                            enabled ? 'left-[22px]' : 'left-0.5',
                        )}
                    />
                </span>
                <span className="text-sm">{enabled ? 'Включена' : 'Выключена'}</span>
            </button>

            <TextField
                label="Адрес страницы"
                hint={normalizedSlug ? `mesto: /b/${normalizedSlug}` : 'латиница, цифры и дефисы'}
                value={slug}
                onChange={setSlug}
            />

            {enabled && publicUrl && (
                <div className="flex items-center gap-2 rounded-xl bg-purple-950/60 px-3 py-2 text-sm">
                    <span className="truncate text-purple-200">{publicUrl}</span>
                    <button
                        onClick={handleCopy}
                        type="button"
                        className="shrink-0 cursor-pointer rounded-lg border border-purple-600 px-2 py-1 text-xs hover:bg-purple-800"
                    >
                        Копировать
                    </button>
                    <a
                        href={publicBusinessPath(normalizedSlug)}
                        target="_blank"
                        rel="noopener"
                        className="shrink-0 rounded-lg border border-purple-600 px-2 py-1 text-xs hover:bg-purple-800"
                    >
                        Открыть
                    </a>
                </div>
            )}

            <Button onClick={handleSave} loading={saving}>
                Сохранить
            </Button>
        </section>
    );
}
