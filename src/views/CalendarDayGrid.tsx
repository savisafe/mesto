'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppointmentStatus, TimeOffReason } from '@/db/schema';
import type { AppointmentDetail } from '@/services/appointments';
import type { CalendarBlock, CalendarDayData, CalendarWindow } from '@/services/calendar';

const HEADER_H = 44;
const HOUR_H = 64;
const COL_MIN = 170;
const AXIS_W = 56;
const SNAP_MIN = 15;
const PX_PER_MIN = HOUR_H / 60;

// Сетка живёт в собственном ограниченном скролл-контейнере (sticky-ось + sticky-шапка),
// а не растягивает страницу. Так вертикальный скролл сетки не конфликтует со скроллом
// страницы, а время-ось и заголовки колонок всегда видны.
const GRID_MAX_H = 'calc(100dvh - 15rem)';

type ColumnId = string | null;

interface GridColumn {
    id: ColumnId;
    name: string;
    windows: CalendarWindow[];
}

interface PlacedAppt {
    apt: AppointmentDetail;
    top: number;
    height: number;
    lane: number;
    lanes: number;
}

const STATUS_STYLE: Record<AppointmentStatus, string> = {
    scheduled: 'bg-indigo-500/85 border-indigo-300/50 text-white',
    completed: 'bg-emerald-600/80 border-emerald-300/50 text-white',
    cancelled: 'bg-white/5 border-white/10 text-purple-300/60 line-through',
    no_show: 'bg-rose-600/70 border-rose-300/50 text-white',
};

const REASON_LABEL: Record<TimeOffReason, string> = {
    lunch: 'Обед',
    day_off: 'Выходной',
    vacation: 'Отпуск',
    sick: 'Больничный',
    holiday: 'Праздник',
    other: 'Блок',
};

const ms = (d: Date) => new Date(d).getTime();
const clampDay = (min: number) => Math.max(0, Math.min(1440, min));

function stripeStyle(color: string): React.CSSProperties {
    return {
        backgroundImage: `repeating-linear-gradient(45deg, ${color}, ${color} 6px, transparent 6px, transparent 12px)`,
    };
}

function hourLabel(min: number): string {
    const h = Math.floor(min / 60);
    return `${String(h).padStart(2, '0')}:00`;
}

/** Локальная дата `YYYY-MM-DD` в зоне бизнеса — чтобы понять, на сколько дней запись уходит вперёд. */
function localDateStr(d: Date, tz: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: tz,
    }).format(new Date(d));
}

/** Сдвиг конца записи относительно её начала в календарных днях (для многодневных записей). */
function dayOffset(a: AppointmentDetail, tz: string): number {
    const start = Date.parse(localDateStr(a.startsAt, tz));
    const end = Date.parse(localDateStr(a.endsAt, tz));
    if (Number.isNaN(start) || Number.isNaN(end)) return 0;
    return Math.round((end - start) / 86_400_000);
}

function fmtRange(a: AppointmentDetail, tz: string): string {
    const f = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz });
    const base = `${f.format(new Date(a.startsAt))}–${f.format(new Date(a.endsAt))}`;
    const off = dayOffset(a, tz);
    return off > 0 ? `${base} +${off}д` : base;
}

/** Greedy cluster-based lane packing: разводит пересекающиеся записи по колонкам-дорожкам. */
function packAppointments(
    appts: AppointmentDetail[],
    dayStartMs: number,
    lo: number,
    hi: number,
): PlacedAppt[] {
    const items = appts
        .map((apt) => {
            const s = clampDay((ms(apt.startsAt) - dayStartMs) / 60000);
            const e = clampDay((ms(apt.endsAt) - dayStartMs) / 60000);
            return { apt, s: Math.max(lo, s), e: Math.min(hi, Math.max(s + 1, e)) };
        })
        .filter((it) => it.e > lo && it.s < hi)
        .sort((a, b) => a.s - b.s || a.e - b.e);

    const out: PlacedAppt[] = [];
    let cluster: typeof items = [];
    let clusterEnd = -Infinity;

    const flush = () => {
        if (cluster.length === 0) return;
        const laneEnds: number[] = [];
        const lanes = cluster.map((it) => {
            let lane = laneEnds.findIndex((end) => end <= it.s);
            if (lane === -1) {
                lane = laneEnds.length;
                laneEnds.push(it.e);
            } else {
                laneEnds[lane] = it.e;
            }
            return lane;
        });
        const laneCount = laneEnds.length;
        cluster.forEach((it, i) => {
            out.push({
                apt: it.apt,
                top: (it.s - lo) * PX_PER_MIN,
                height: (it.e - it.s) * PX_PER_MIN,
                lane: lanes[i],
                lanes: laneCount,
            });
        });
        cluster = [];
    };

    for (const it of items) {
        if (it.s >= clusterEnd) {
            flush();
            clusterEnd = it.e;
        } else {
            clusterEnd = Math.max(clusterEnd, it.e);
        }
        cluster.push(it);
    }
    flush();
    return out;
}

export default function CalendarDayGrid({
    data,
    onSlotClick,
    onApptClick,
}: {
    data: CalendarDayData;
    onSlotClick: (employeeId: ColumnId, startsAt: Date) => void;
    onApptClick: (apt: AppointmentDetail) => void;
}) {
    const dayStartMs = useMemo(() => ms(data.dayStart), [data.dayStart]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Тик раз в минуту — двигает линию текущего времени без перезагрузки.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(id);
    }, []);

    const columns: GridColumn[] = useMemo(() => {
        const team: GridColumn[] = data.columns.map((c) => ({
            id: c.employeeId,
            name: c.employeeName,
            windows: c.windows,
        }));
        const hasUnassigned = data.appointments.some((a) => !a.employee);
        if (hasUnassigned) {
            team.push({ id: null, name: 'Без сотрудника', windows: data.businessWindows });
        }
        return team;
    }, [data.columns, data.appointments, data.businessWindows]);

    const { lo, hi, totalH, hours, nowTop } = useMemo(() => {
        const cand: number[] = [];
        for (const c of columns) for (const w of c.windows) cand.push(w.startMinute, w.endMinute);
        for (const a of data.appointments) {
            cand.push(clampDay((ms(a.startsAt) - dayStartMs) / 60000));
            cand.push(clampDay((ms(a.endsAt) - dayStartMs) / 60000));
        }
        for (const b of data.blocks) {
            cand.push(clampDay((ms(b.startsAt) - dayStartMs) / 60000));
            cand.push(clampDay((ms(b.endsAt) - dayStartMs) / 60000));
        }
        const nowOff = (now - dayStartMs) / 60000;
        const isToday = nowOff >= 0 && nowOff < 1440;
        if (isToday) cand.push(nowOff);

        let lo = cand.length ? Math.min(...cand) : 8 * 60;
        let hi = cand.length ? Math.max(...cand) : 20 * 60;
        lo = Math.max(0, Math.floor(lo / 60) * 60);
        hi = Math.min(1440, Math.ceil(hi / 60) * 60);
        if (hi - lo < 120) hi = Math.min(1440, lo + 120);

        const hours: number[] = [];
        for (let m = lo; m <= hi; m += 60) hours.push(m);

        return {
            lo,
            hi,
            totalH: (hi - lo) * PX_PER_MIN,
            hours,
            nowTop: isToday && nowOff >= lo && nowOff <= hi ? (nowOff - lo) * PX_PER_MIN : null,
        };
    }, [columns, data.appointments, data.blocks, dayStartMs, now]);

    // При загрузке дня прокручиваем сетку к текущему времени (или к первой записи),
    // чтобы не упираться в пустые ранние часы. Один раз на загрузку данных.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const nowOff = (Date.now() - dayStartMs) / 60000;
        let target: number | null =
            nowOff >= lo && nowOff <= hi ? (nowOff - lo) * PX_PER_MIN : null;
        if (target === null) {
            const apptTops = data.appointments
                .map((a) => (clampDay((ms(a.startsAt) - dayStartMs) / 60000) - lo) * PX_PER_MIN)
                .filter((t) => t >= 0);
            if (apptTops.length) target = Math.min(...apptTops);
        }
        el.scrollTop = target === null ? 0 : Math.max(0, target - 80);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    const businessBlocks = useMemo(
        () => data.blocks.filter((b) => b.employeeUserId === null),
        [data.blocks],
    );

    const placedByColumn = useMemo(() => {
        const map = new Map<ColumnId, PlacedAppt[]>();
        for (const col of columns) {
            const appts = data.appointments.filter((a) =>
                col.id === null ? !a.employee : a.employee?.id === col.id,
            );
            map.set(col.id, packAppointments(appts, dayStartMs, lo, hi));
        }
        return map;
    }, [columns, data.appointments, dayStartMs, lo, hi]);

    const blocksByColumn = useMemo(() => {
        const map = new Map<ColumnId, CalendarBlock[]>();
        for (const col of columns) {
            map.set(
                col.id,
                col.id === null ? [] : data.blocks.filter((b) => b.employeeUserId === col.id),
            );
        }
        return map;
    }, [columns, data.blocks]);

    const spanTopHeight = (start: Date, end: Date) => {
        const s = Math.max(lo, clampDay((ms(start) - dayStartMs) / 60000));
        const e = Math.min(hi, clampDay((ms(end) - dayStartMs) / 60000));
        return { top: (s - lo) * PX_PER_MIN, height: Math.max(2, (e - s) * PX_PER_MIN) };
    };

    const handleColumnClick = (colId: ColumnId, e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        let minute = lo + y / PX_PER_MIN;
        minute = Math.round(minute / SNAP_MIN) * SNAP_MIN;
        minute = Math.max(lo, Math.min(hi - SNAP_MIN, minute));
        onSlotClick(colId, new Date(dayStartMs + minute * 60000));
    };

    return (
        <div className="bg-white/5 border border-purple-700/40 rounded-2xl overflow-hidden">
            <div
                ref={scrollRef}
                className="overflow-auto overscroll-contain"
                style={{ maxHeight: GRID_MAX_H }}
            >
                <div className="relative" style={{ minWidth: AXIS_W + columns.length * COL_MIN }}>
                    {/* Шапка: угол-ось + заголовки колонок. Липнет к верху при скролле. */}
                    <div
                        className="sticky top-0 z-50 flex bg-purple-950/90 backdrop-blur"
                        style={{ height: HEADER_H }}
                    >
                        <div
                            className="sticky left-0 z-10 shrink-0 border-b border-purple-700/30 bg-purple-950/90"
                            style={{ width: AXIS_W }}
                        />
                        {columns.map((col) => (
                            <div
                                key={col.id ?? '__none__'}
                                className="flex-1 flex items-center px-3 border-l border-b border-purple-700/30 text-sm font-medium text-white truncate"
                                style={{ minWidth: COL_MIN }}
                                title={col.name}
                            >
                                <span className="truncate">{col.name}</span>
                            </div>
                        ))}
                    </div>

                    {/* Тело: время-ось (липнет слева) + область колонок. */}
                    <div className="flex" style={{ height: totalH }}>
                        <div
                            className="sticky left-0 z-40 shrink-0 relative bg-purple-950/80 backdrop-blur"
                            style={{ width: AXIS_W }}
                        >
                            {hours.map((m) => (
                                <div
                                    key={m}
                                    className="absolute right-2 -translate-y-1/2 text-xs text-purple-400 tabular-nums"
                                    style={{ top: (m - lo) * PX_PER_MIN }}
                                >
                                    {hourLabel(m)}
                                </div>
                            ))}
                        </div>

                        <div className="relative flex flex-1">
                            {/* Часовые линии */}
                            {hours.map((m) => (
                                <div
                                    key={m}
                                    className="absolute inset-x-0 border-t border-purple-700/20 pointer-events-none"
                                    style={{ top: (m - lo) * PX_PER_MIN }}
                                />
                            ))}

                            {/* Блоки всего бизнеса — на все колонки */}
                            {businessBlocks.map((b) => {
                                const { top, height } = spanTopHeight(b.startsAt, b.endsAt);
                                return (
                                    <div
                                        key={b.id}
                                        className="absolute inset-x-0 border-y border-rose-400/30 z-20 pointer-events-none flex items-center justify-center"
                                        style={{ top, height, ...stripeStyle('rgba(244,63,94,0.18)') }}
                                    >
                                        <span className="text-xs text-rose-200/90 font-medium px-2 py-0.5 bg-rose-950/40 rounded">
                                            {REASON_LABEL[b.reason]}
                                            {b.note ? ` · ${b.note}` : ''}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* Колонки */}
                            {columns.map((col) => {
                                const placed = placedByColumn.get(col.id) ?? [];
                                const colBlocks = blocksByColumn.get(col.id) ?? [];
                                return (
                                    <div
                                        key={col.id ?? '__none__'}
                                        className="relative flex-1 border-l border-purple-700/30"
                                        style={{ minWidth: COL_MIN }}
                                    >
                                        {/* Подсветка рабочих часов */}
                                        {col.windows.map((w, i) => {
                                            const top = (Math.max(lo, w.startMinute) - lo) * PX_PER_MIN;
                                            const height =
                                                (Math.min(hi, w.endMinute) - Math.max(lo, w.startMinute)) *
                                                PX_PER_MIN;
                                            if (height <= 0) return null;
                                            return (
                                                <div
                                                    key={i}
                                                    className="absolute inset-x-0 bg-white/[0.04] pointer-events-none"
                                                    style={{ top, height }}
                                                />
                                            );
                                        })}

                                        {/* Клик-слой для создания записи */}
                                        <div
                                            className="absolute inset-0 cursor-pointer"
                                            onClick={(e) => handleColumnClick(col.id, e)}
                                            title="Нажмите, чтобы создать запись"
                                        />

                                        {/* Блоки сотрудника */}
                                        {colBlocks.map((b) => {
                                            const { top, height } = spanTopHeight(b.startsAt, b.endsAt);
                                            return (
                                                <div
                                                    key={b.id}
                                                    className="absolute inset-x-0.5 rounded border border-rose-400/30 z-10 flex items-start px-1.5 py-0.5 overflow-hidden"
                                                    style={{ top, height, ...stripeStyle('rgba(244,63,94,0.16)') }}
                                                    title={b.note ?? REASON_LABEL[b.reason]}
                                                >
                                                    <span className="text-[11px] text-rose-200/90 truncate">
                                                        {REASON_LABEL[b.reason]}
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {/* Записи */}
                                        {placed.map(({ apt, top, height, lane, lanes }) => {
                                            const widthPct = 100 / lanes;
                                            return (
                                                <button
                                                    key={apt.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onApptClick(apt);
                                                    }}
                                                    className={`absolute rounded-lg border px-2 py-1 text-left overflow-hidden z-30 cursor-pointer transition hover:brightness-110 ${STATUS_STYLE[apt.status]}`}
                                                    style={{
                                                        top,
                                                        height: Math.max(18, height),
                                                        left: `calc(${lane * widthPct}% + 2px)`,
                                                        width: `calc(${widthPct}% - 4px)`,
                                                    }}
                                                >
                                                    <div className="text-[11px] opacity-90 tabular-nums leading-tight">
                                                        {fmtRange(apt, data.timezone)}
                                                    </div>
                                                    <div className="text-xs font-medium truncate leading-tight">
                                                        {apt.client.name}
                                                    </div>
                                                    {height > 44 && apt.service && (
                                                        <div className="text-[11px] opacity-80 truncate leading-tight">
                                                            {apt.service.name}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}

                            {/* Линия текущего времени */}
                            {nowTop !== null && (
                                <div
                                    className="absolute inset-x-0 z-40 pointer-events-none"
                                    style={{ top: nowTop }}
                                >
                                    <div className="relative border-t-2 border-red-500">
                                        <div className="absolute -left-1 -top-1.5 w-2.5 h-2.5 rounded-full bg-red-500" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
