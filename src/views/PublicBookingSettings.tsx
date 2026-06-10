'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { Button } from '@/ui/button/Button';
import { TextField, Field, inputClasses } from '@/ui/form';
import { useBusiness } from '@/contexts/BusinessContext';
import { useNotification } from '@/contexts/NotificationContext';
import { listGalleryAction, removeGalleryPhotoAction } from '@/actions/gallery';
import type { GalleryItem } from '@/services/gallery';
import { slugify } from '@/lib/slug';
import { publicBusinessPath } from '@/routes/routes';

type PublicTheme = 'light' | 'dark';

const PRESET_COLORS = [
    '#7c3aed',
    '#2563eb',
    '#0891b2',
    '#16a34a',
    '#ea580c',
    '#e11d48',
    '#db2777',
    '#475569',
];

export default function PublicBookingSettings() {
    const { businessesData, currentBusiness, updateBusiness } = useBusiness();
    const alert = useNotification();

    const business = useMemo(
        () => businessesData.find((b) => b.id === currentBusiness) ?? null,
        [businessesData, currentBusiness],
    );

    const [slug, setSlug] = useState('');
    const [enabled, setEnabled] = useState(false);
    const [theme, setTheme] = useState<PublicTheme>('light');
    const [accentColor, setAccentColor] = useState('#7c3aed');
    const [instagramWidget, setInstagramWidget] = useState('');
    const [instagramUsername, setInstagramUsername] = useState('');
    const [saving, setSaving] = useState(false);
    const [photos, setPhotos] = useState<GalleryItem[]>([]);
    const [uploading, setUploading] = useState(false);

    // Синхронизируем форму, когда подгрузился/сменился текущий бизнес.
    useEffect(() => {
        if (!business) return;
        setSlug(business.slug ?? slugify(business.name));
        setEnabled(business.publicBookingEnabled);
        setTheme(business.publicTheme === 'dark' ? 'dark' : 'light');
        setAccentColor(business.publicAccentColor);
        setInstagramWidget(business.instagramWidgetUrl ?? '');
        setInstagramUsername(business.instagramUsername ?? '');
    }, [business]);

    // Галерея «Примеры работ».
    useEffect(() => {
        if (!business) return;
        listGalleryAction(business.id).then((r) => {
            if (r.ok) setPhotos(r.data);
        });
    }, [business]);

    const handleUploadPhoto = async (file: File) => {
        if (!business) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('businessId', business.id);
            fd.append('file', file);
            const res = await fetch('/api/gallery', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) {
                alert('error', data.error ?? 'Не удалось загрузить фото');
                return;
            }
            setPhotos((prev) => [...prev, data.photo]);
            alert('success', 'Фото добавлено');
        } catch {
            alert('error', 'Не удалось загрузить фото');
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePhoto = async (id: string) => {
        const res = await removeGalleryPhotoAction(id);
        if (res.ok) {
            setPhotos((prev) => prev.filter((p) => p.id !== id));
        } else {
            alert('error', res.error);
        }
    };

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
                publicTheme: theme,
                publicAccentColor: accentColor,
                instagramWidgetUrl: instagramWidget,
                instagramUsername,
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

            <div className="space-y-3 border-t border-purple-700/40 pt-4">
                <p className="text-sm font-medium text-purple-200">Оформление страницы</p>

                {/* Тема */}
                <div className="flex gap-2">
                    {(['light', 'dark'] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTheme(t)}
                            className={clsx(
                                'flex-1 cursor-pointer rounded-xl border px-3 py-2 text-sm transition',
                                theme === t
                                    ? 'border-purple-400 bg-purple-700/40 text-white'
                                    : 'border-purple-700 text-purple-300 hover:bg-purple-800/40',
                            )}
                        >
                            {t === 'light' ? 'Светлая' : 'Тёмная'}
                        </button>
                    ))}
                </div>

                {/* Акцентный цвет */}
                <div className="flex flex-wrap items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            aria-label={`Цвет ${c}`}
                            onClick={() => setAccentColor(c)}
                            className={clsx(
                                'h-8 w-8 cursor-pointer rounded-full ring-2 ring-offset-2 ring-offset-purple-900 transition',
                                accentColor.toLowerCase() === c ? 'ring-white' : 'ring-transparent',
                            )}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                    <label className="ml-1 inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border border-purple-700 px-3 text-xs text-purple-200">
                        Свой
                        <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                    </label>
                </div>
            </div>

            <div className="space-y-3 border-t border-purple-700/40 pt-4">
                <p className="text-sm font-medium text-purple-200">Instagram</p>

                <TextField
                    label="Ник студии"
                    hint="Без @. Покажем ссылку на профиль на странице записи."
                    value={instagramUsername}
                    onChange={setInstagramUsername}
                />

                <Field
                    label="Сетка постов (необязательно)"
                    inline
                    hint="Чтобы показать ленту последних фото: создайте бесплатный виджет на snapwidget.com → вставьте сюда его код, ссылку или ID. Сетка обновляется автоматически."
                >
                    <textarea
                        value={instagramWidget}
                        onChange={(e) => setInstagramWidget(e.target.value)}
                        placeholder="Код виджета SnapWidget, ссылка или ID"
                        rows={2}
                        className={clsx(inputClasses, 'resize-y font-mono text-xs')}
                    />
                </Field>
            </div>

            <Button onClick={handleSave} loading={saving}>
                Сохранить
            </Button>

            <div className="space-y-3 border-t border-purple-700/40 pt-4">
                <p className="text-sm font-medium text-purple-200">Примеры работ</p>
                {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {photos.map((p) => (
                            <div
                                key={p.id}
                                className="relative aspect-square overflow-hidden rounded-lg"
                            >
                                <Image src={p.url} alt="Пример работы" fill sizes="120px" className="object-cover" />
                                <button
                                    type="button"
                                    aria-label="Удалить фото"
                                    onClick={() => handleDeletePhoto(p.id)}
                                    className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-purple-700 px-3 py-2 text-sm text-purple-200 hover:bg-purple-800/40">
                    {uploading ? 'Загрузка…' : 'Добавить фото'}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadPhoto(file);
                            e.target.value = '';
                        }}
                    />
                </label>
                <p className="text-xs text-purple-400">JPG, PNG или WebP, до 4 МБ, не больше 30 фото.</p>
            </div>
        </section>
    );
}
