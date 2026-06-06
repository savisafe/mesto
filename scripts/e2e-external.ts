/**
 * Self-cleaning end-to-end проверка внешнего API на реальной Neon-БД.
 * Создаёт временный тест-бизнес (имя `__e2e_*`) с графиком/услугой/блоком/ключом,
 * бьёт по реальным HTTP-эндпоинтам, в конце удаляет за собой.
 *
 * Требует поднятый dev-сервер (E2E_BASE_URL, по умолчанию http://localhost:3000).
 *   npx tsx scripts/e2e-external.ts
 */
import { config } from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import ws from 'ws';
import {
    users,
    businesses,
    services,
    workSchedules,
    timeOff,
    apiKeys,
    clients,
    appointments,
} from '../src/db/schema';

config({ path: '.env.local' });
config();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
neonConfig.webSocketConstructor = ws;

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const DATE = '2026-12-15'; // будущая дата; график задаём на все 7 дней
const TZ_OFFSET = '+05:00'; // Asia/Almaty

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
    if (cond) {
        console.log(`  ✓ ${name}`);
    } else {
        failures++;
        console.log(`  ✗ ${name}` + (detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''));
    }
}

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    const tag = `__e2e_${Date.now()}`;
    let businessId: string | undefined;
    let ownerId: string | undefined;

    try {
        // --- setup ---
        const [owner] = await db
            .insert(users)
            .values({ email: `${tag}@test.local`, passwordHash: 'x', name: 'E2E Owner', phone: '+70000000000' })
            .returning();
        ownerId = owner.id;
        const [biz] = await db
            .insert(businesses)
            .values({ name: tag, ownerId: owner.id, timezone: 'Asia/Almaty' })
            .returning();
        businessId = biz.id;

        await db.insert(services).values({
            businessId,
            externalId: 'e2e-correction',
            name: 'E2E Коррекция',
            amount: 4000,
            currency: 'KZT',
            durationMinutes: 30,
        });
        // график 10:00–18:00 на все дни недели
        await db.insert(workSchedules).values(
            Array.from({ length: 7 }, (_, weekday) => ({
                businessId: businessId!,
                employeeUserId: null,
                weekday,
                startMinute: 600,
                endMinute: 1080,
            })),
        );
        // блок 12:00–13:00 Almaty (= 07:00–08:00 UTC) на тест-дату
        await db.insert(timeOff).values({
            businessId,
            employeeUserId: null,
            startsAt: new Date(`${DATE}T07:00:00Z`),
            endsAt: new Date(`${DATE}T08:00:00Z`),
            reason: 'lunch',
        });
        // ключ
        const raw = 'mst_live_' + randomBytes(32).toString('hex');
        const keyHash = createHash('sha256').update(raw).digest('hex');
        await db.insert(apiKeys).values({
            businessId,
            name: 'e2e',
            keyHash,
            scopes: ['availability:read', 'bookings:read', 'bookings:write', 'clients:write'],
        });

        const H = { Authorization: `Bearer ${raw}`, 'Content-Type': 'application/json' };
        console.log(`\nE2E против ${BASE} (бизнес ${tag})\n`);

        // --- 1. availability ---
        {
            const res = await fetch(
                `${BASE}/api/external/availability?from=${DATE}&to=${DATE}&service_external_id=e2e-correction`,
                { headers: H },
            );
            const body = await res.json();
            const day = body?.days?.[0];
            const starts: string[] = (day?.slots ?? [])
                .map((s: { starts_at?: string }) => s.starts_at)
                .filter((x: unknown): x is string => typeof x === 'string');
            check('availability 200', res.status === 200, res.status);
            check('день открыт', day?.status === 'open', day?.status);
            check('есть слот 10:00', starts.some((s) => s.includes(`T10:00:00${TZ_OFFSET}`)));
            check(
                'слоты 12:00/12:30 вырезаны блоком',
                !starts.some((s) => s.includes(`T12:00:00${TZ_OFFSET}`) || s.includes(`T12:30:00${TZ_OFFSET}`)),
                starts,
            );
        }

        // --- 2. booking 10:00 → 201 ---
        let appointmentId = '';
        {
            const res = await fetch(`${BASE}/api/external/bookings`, {
                method: 'POST',
                headers: H,
                body: JSON.stringify({
                    idempotency_key: 'e2e-1',
                    service_external_id: 'e2e-correction',
                    service_name: 'E2E Коррекция',
                    starts_at: `${DATE}T10:00:00${TZ_OFFSET}`,
                    duration_minutes: 30,
                    client: { name: 'E2E', phone: '+77000000000', telegram_id: 'e2e' },
                }),
            });
            const body = await res.json();
            appointmentId = body?.appointment_id ?? '';
            check('booking 201', res.status === 201, res.status);
            check('appointment_id выдан', !!appointmentId);
            check('service_matched', body?.service_matched === true, body);
        }

        // --- 3. идемпотентный повтор → 200 replay ---
        {
            const res = await fetch(`${BASE}/api/external/bookings`, {
                method: 'POST',
                headers: H,
                body: JSON.stringify({
                    idempotency_key: 'e2e-1',
                    service_external_id: 'e2e-correction',
                    service_name: 'E2E Коррекция',
                    starts_at: `${DATE}T10:00:00${TZ_OFFSET}`,
                    duration_minutes: 30,
                    client: { name: 'E2E', phone: '+77000000000', telegram_id: 'e2e' },
                }),
            });
            const body = await res.json();
            check('replay 200', res.status === 200, res.status);
            check('idempotent_replay=true', body?.idempotent_replay === true, body);
            check('тот же appointment_id', body?.appointment_id === appointmentId);
        }

        // --- 4. blocked time → 422 BLOCKED ---
        {
            const res = await fetch(`${BASE}/api/external/bookings`, {
                method: 'POST',
                headers: H,
                body: JSON.stringify({
                    idempotency_key: 'e2e-blocked',
                    service_name: 'E2E Коррекция',
                    starts_at: `${DATE}T12:00:00${TZ_OFFSET}`,
                    duration_minutes: 30,
                    client: { name: 'E2E', phone: '+77000000000' },
                }),
            });
            const body = await res.json();
            check('blocked → 422', res.status === 422, res.status);
            check('code=BLOCKED', body?.code === 'BLOCKED', body);
        }

        // --- 5. out of hours → 422 OUT_OF_HOURS ---
        {
            const res = await fetch(`${BASE}/api/external/bookings`, {
                method: 'POST',
                headers: H,
                body: JSON.stringify({
                    idempotency_key: 'e2e-ooh',
                    service_name: 'E2E Коррекция',
                    starts_at: `${DATE}T09:00:00${TZ_OFFSET}`,
                    duration_minutes: 30,
                    client: { name: 'E2E', phone: '+77000000000' },
                }),
            });
            const body = await res.json();
            check('out-of-hours → 422', res.status === 422, res.status);
            check('code=OUT_OF_HOURS', body?.code === 'OUT_OF_HOURS', body);
        }

        // --- 6. GET booking + 7. cancel + 8. services/team ---
        {
            const res = await fetch(`${BASE}/api/external/bookings/${appointmentId}`, { headers: H });
            check('GET booking 200', res.status === 200, res.status);
        }
        {
            const res = await fetch(`${BASE}/api/external/bookings/${appointmentId}/cancel`, {
                method: 'POST',
                headers: H,
                body: JSON.stringify({ reason: 'client_cancelled' }),
            });
            const body = await res.json();
            check('cancel 200 + status cancelled', res.status === 200 && body?.status === 'cancelled', body);
        }
        {
            const svc = await fetch(`${BASE}/api/external/services`, { headers: H });
            const team = await fetch(`${BASE}/api/external/team`, { headers: H });
            check('services 200', svc.status === 200);
            check('team 200', team.status === 200);
        }

        // --- auth negative ---
        {
            const res = await fetch(`${BASE}/api/external/team`, {
                headers: { Authorization: 'Bearer mst_live_bogus' },
            });
            check('неизвестный ключ → 401', res.status === 401, res.status);
        }

        console.log(`\n${failures === 0 ? 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ ✅' : `ПРОВАЛОВ: ${failures} ❌`}\n`);
    } finally {
        // --- teardown (child → parent, чтобы не ловить restrict на clients) ---
        if (businessId) {
            await db.delete(appointments).where(eq(appointments.businessId, businessId));
            await db.delete(clients).where(eq(clients.businessId, businessId));
            await db.delete(services).where(eq(services.businessId, businessId));
            await db.delete(workSchedules).where(eq(workSchedules.businessId, businessId));
            await db.delete(timeOff).where(eq(timeOff.businessId, businessId));
            await db.delete(apiKeys).where(eq(apiKeys.businessId, businessId));
            await db.delete(businesses).where(eq(businesses.id, businessId));
        }
        if (ownerId) await db.delete(users).where(eq(users.id, ownerId));
        await pool.end();
        console.log('Тест-данные удалены.');
    }
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error('E2E упал:', err);
    process.exit(1);
});
