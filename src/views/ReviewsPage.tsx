'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import Spinner from '@/ui/spinner/Spinner';
import { useAccess } from '@/hooks/useAccess';
import { useBusiness } from '@/contexts/BusinessContext';
import { useNotification } from '@/contexts/NotificationContext';
import { listReviewsAction, setReviewHiddenAction } from '@/actions/reviews';
import type { OwnerReview } from '@/services/reviews';

export default function ReviewsPage() {
    const access = useAccess();
    const { currentBusiness } = useBusiness();
    const alert = useNotification();

    const [reviews, setReviews] = useState<OwnerReview[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [ratingFilter, setRatingFilter] = useState(0);
    const [busyId, setBusyId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!currentBusiness) return;
        setLoading(true);
        try {
            const r = await listReviewsAction(currentBusiness);
            if (r.ok) setReviews(r.data);
            else alert('error', r.error);
        } finally {
            setLoading(false);
        }
    }, [currentBusiness, alert]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return reviews.filter((r) => {
            const matchesQuery =
                !q ||
                r.authorName.toLowerCase().includes(q) ||
                (r.comment ?? '').toLowerCase().includes(q);
            const matchesRating = ratingFilter === 0 || r.rating === ratingFilter;
            return matchesQuery && matchesRating;
        });
    }, [reviews, query, ratingFilter]);

    const toggleHidden = async (review: OwnerReview) => {
        setBusyId(review.id);
        try {
            const res = await setReviewHiddenAction(review.id, !review.isHidden);
            if (res.ok) {
                setReviews((prev) =>
                    prev.map((x) => (x.id === review.id ? { ...x, isHidden: res.data.isHidden } : x)),
                );
            } else {
                alert('error', res.error);
            }
        } finally {
            setBusyId(null);
        }
    };

    if (access.status !== 'ok') {
        return <LayoutPage>{access.component}</LayoutPage>;
    }

    if (!currentBusiness) {
        return (
            <LayoutPage>
                <div className="max-w-2xl mx-auto text-center mt-24">
                    <h1 className="text-3xl font-bold text-white mb-4">Отзывы</h1>
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
            <div className="max-w-3xl mx-auto">
                <header className="mb-6">
                    <p className="text-purple-300 text-sm mb-1">Публичная страница</p>
                    <h1 className="text-4xl font-bold text-white tracking-tight">Отзывы</h1>
                    <p className="text-purple-300 text-sm mt-2">
                        Отзывы клиентов публикуются автоматически. Неуместный отзыв можно скрыть —
                        он перестанет показываться на странице записи.
                    </p>
                </header>

                <div className="flex flex-wrap gap-3 mb-6">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Поиск по клиенту или тексту"
                        className="flex-1 min-w-[12rem] px-3 py-2 rounded-xl bg-white/5 border border-purple-700/40 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <select
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-purple-700/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value={0}>Все оценки</option>
                        {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                                {n} ★
                            </option>
                        ))}
                    </select>
                </div>

                {loading && reviews.length === 0 ? (
                    <div className="flex justify-center py-16">
                        <Spinner />
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-purple-300 py-12 bg-white/5 border border-purple-700/40 rounded-2xl">
                        {reviews.length === 0 ? 'Отзывов пока нет.' : 'Ничего не найдено.'}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {filtered.map((r) => (
                            <li
                                key={r.id}
                                className={clsx(
                                    'bg-white/5 border border-purple-700/40 rounded-2xl p-4',
                                    r.isHidden && 'opacity-60',
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-white">{r.authorName}</span>
                                            <span className="text-sm">
                                                <span className="text-amber-400">{'★'.repeat(r.rating)}</span>
                                                <span className="text-purple-700">
                                                    {'★'.repeat(5 - r.rating)}
                                                </span>
                                            </span>
                                            {r.isHidden && (
                                                <span className="text-xs px-2 py-0.5 rounded-full border border-purple-500/40 text-purple-300">
                                                    Скрыт
                                                </span>
                                            )}
                                        </div>
                                        {r.comment && (
                                            <p className="text-purple-100 text-sm mt-1.5">{r.comment}</p>
                                        )}
                                        <p className="text-purple-400 text-xs mt-1.5">
                                            {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                                            {r.employeeName && ` · ${r.employeeName}`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => toggleHidden(r)}
                                        disabled={busyId === r.id}
                                        className="shrink-0 text-sm text-purple-300 hover:text-white cursor-pointer disabled:opacity-50"
                                    >
                                        {r.isHidden ? 'Показать' : 'Скрыть'}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </LayoutPage>
    );
}
