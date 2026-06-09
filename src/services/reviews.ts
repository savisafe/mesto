import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { appointments, businesses, clients, reviews, users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { checkBusinessAccess } from './_access';

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };
const NOT_FOUND = { ok: false as const, error: 'Отзыв не найден', code: 'NOT_FOUND' as const };

export type Stars = 1 | 2 | 3 | 4 | 5;

export interface ReviewSummary {
    average: number; // среднее, округлённое до 0.1; 0 если отзывов нет
    count: number;
    distribution: Record<Stars, number>; // сколько отзывов на каждую оценку
}

export interface PublicReview {
    id: string;
    authorName: string;
    rating: number;
    comment: string | null;
    createdAt: string; // ISO
    employeeName: string | null;
}

export interface BusinessReviewsData {
    summary: ReviewSummary;
    /** Рейтинг по каждому специалисту, ключ — employeeUserId. */
    employeeRatings: Record<string, { average: number; count: number }>;
    recent: PublicReview[];
}

const emptyDistribution = (): Record<Stars, number> => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Агрегаты отзывов бизнеса для публичной страницы: общий рейтинг + распределение,
 * рейтинг по специалистам и последние отзывы. Скрытые отзывы исключены.
 */
export async function getBusinessReviews(
    businessId: string,
    recentLimit = 20,
): Promise<BusinessReviewsData> {
    const rows = await db
        .select({
            id: reviews.id,
            rating: reviews.rating,
            comment: reviews.comment,
            authorName: reviews.authorName,
            createdAt: reviews.createdAt,
            employeeUserId: reviews.employeeUserId,
            employeeName: users.name,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.employeeUserId, users.id))
        .where(and(eq(reviews.businessId, businessId), eq(reviews.isHidden, false)))
        .orderBy(desc(reviews.createdAt));

    const distribution = emptyDistribution();
    let sum = 0;
    const perEmployee = new Map<string, { sum: number; count: number }>();

    for (const r of rows) {
        const stars = Math.min(5, Math.max(1, r.rating)) as Stars;
        distribution[stars] += 1;
        sum += r.rating;
        if (r.employeeUserId) {
            const agg = perEmployee.get(r.employeeUserId) ?? { sum: 0, count: 0 };
            agg.sum += r.rating;
            agg.count += 1;
            perEmployee.set(r.employeeUserId, agg);
        }
    }

    const count = rows.length;
    const employeeRatings: Record<string, { average: number; count: number }> = {};
    for (const [id, agg] of perEmployee) {
        employeeRatings[id] = { average: round1(agg.sum / agg.count), count: agg.count };
    }

    const recent: PublicReview[] = rows.slice(0, recentLimit).map((r) => ({
        id: r.id,
        authorName: r.authorName,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        employeeName: r.employeeName,
    }));

    return {
        summary: { average: count > 0 ? round1(sum / count) : 0, count, distribution },
        employeeRatings,
        recent,
    };
}

// --- Модерация (кабинет владельца) ---

export interface OwnerReview {
    id: string;
    authorName: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    employeeName: string | null;
    isHidden: boolean;
}

/** Все отзывы бизнеса (включая скрытые) — для модерации в кабинете. */
export async function listBusinessReviews(
    businessId: string,
): Promise<ServiceResult<OwnerReview[]>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;
    const access = await checkBusinessAccess(businessId, user.id);
    if (!access) return FORBIDDEN;

    const rows = await db
        .select({
            id: reviews.id,
            authorName: reviews.authorName,
            rating: reviews.rating,
            comment: reviews.comment,
            createdAt: reviews.createdAt,
            isHidden: reviews.isHidden,
            employeeName: users.name,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.employeeUserId, users.id))
        .where(eq(reviews.businessId, businessId))
        .orderBy(desc(reviews.createdAt));

    return {
        ok: true,
        data: rows.map((r) => ({
            id: r.id,
            authorName: r.authorName,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt.toISOString(),
            employeeName: r.employeeName,
            isHidden: r.isHidden,
        })),
    };
}

/** Скрыть/показать отзыв на публичной странице. */
export async function setReviewHidden(
    reviewId: string,
    hidden: boolean,
): Promise<ServiceResult<{ id: string; isHidden: boolean }>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;
    const [existing] = await db
        .select({ businessId: reviews.businessId })
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1);
    if (!existing) return NOT_FOUND;
    const access = await checkBusinessAccess(existing.businessId, user.id);
    if (!access) return FORBIDDEN;

    await db.update(reviews).set({ isHidden: hidden }).where(eq(reviews.id, reviewId));
    return { ok: true, data: { id: reviewId, isHidden: hidden } };
}

export interface CreatePublicReviewInput {
    slug: string;
    phone: string;
    rating: number;
    comment?: string | null;
}

export interface PublicReviewCreated {
    id: string;
    rating: number;
}

// Резолвит публичный бизнес по slug (только если страница включена и активна).
async function resolvePublicBusinessId(slug: string): Promise<string | null> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return null;
    const [biz] = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(
            and(
                eq(businesses.slug, normalized),
                eq(businesses.publicBookingEnabled, true),
                eq(businesses.isActive, true),
                isNull(businesses.archivedAt),
            ),
        )
        .limit(1);
    return biz?.id ?? null;
}

/**
 * Создаёт отзыв — только если у клиента (по телефону) есть завершённая запись
 * в этом бизнесе без отзыва. Один отзыв на запись. Публикуется сразу.
 */
export async function createPublicReview(
    input: CreatePublicReviewInput,
): Promise<ServiceResult<PublicReviewCreated>> {
    const rating = Math.trunc(input.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return { ok: false, error: 'Оценка должна быть от 1 до 5', code: 'INVALID_RATING' };
    }
    const phone = input.phone.trim();
    if (!phone) {
        return { ok: false, error: 'Укажите телефон', code: 'INVALID_PAYLOAD' };
    }
    const comment = input.comment?.trim() || null;

    const businessId = await resolvePublicBusinessId(input.slug);
    if (!businessId) return { ok: false, error: 'Бизнес не найден', code: 'NOT_FOUND' };

    const [client] = await db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(and(eq(clients.businessId, businessId), eq(clients.phone, phone)))
        .limit(1);
    if (!client) {
        return {
            ok: false,
            error: 'Оставить отзыв можно только после визита',
            code: 'REVIEW_NOT_ALLOWED',
        };
    }

    // Завершённые записи клиента без отзыва — берём самую свежую.
    const completed = await db
        .select({ id: appointments.id, employeeUserId: appointments.employeeUserId })
        .from(appointments)
        .leftJoin(reviews, eq(reviews.appointmentId, appointments.id))
        .where(
            and(
                eq(appointments.businessId, businessId),
                eq(appointments.clientId, client.id),
                eq(appointments.status, 'completed'),
                isNull(reviews.id),
            ),
        )
        .orderBy(desc(appointments.startsAt))
        .limit(1);

    const appt = completed[0];
    if (!appt) {
        return {
            ok: false,
            error: 'Нет завершённого визита без отзыва',
            code: 'REVIEW_NOT_ALLOWED',
        };
    }

    try {
        const [created] = await db
            .insert(reviews)
            .values({
                businessId,
                appointmentId: appt.id,
                employeeUserId: appt.employeeUserId,
                clientId: client.id,
                authorName: client.name,
                rating,
                comment,
            })
            .returning({ id: reviews.id, rating: reviews.rating });
        return { ok: true, data: created };
    } catch {
        // Гонка двойной отправки — уникальный индекс по appointment_id.
        return { ok: false, error: 'Отзыв уже оставлен', code: 'ALREADY_REVIEWED' };
    }
}
