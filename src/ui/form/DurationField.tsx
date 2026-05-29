'use client';

import { useId, useMemo, useState, useEffect } from 'react';
import { Field } from './Field';
import { inputClasses } from './TextField';

export type DurationUnit = 'minutes' | 'hours' | 'days';

const UNIT_TO_MINUTES: Record<DurationUnit, number> = {
    minutes: 1,
    hours: 60,
    days: 60 * 24,
};

const UNIT_OPTIONS: { value: DurationUnit; label: string }[] = [
    { value: 'minutes', label: 'минуты' },
    { value: 'hours', label: 'часы' },
    { value: 'days', label: 'дни' },
];

interface DurationFieldProps {
    label?: string;
    hint?: string;
    error?: string;
    /** Текущее значение в минутах. Если 0 — поле пустое. */
    valueMinutes: number;
    onChangeMinutes: (minutes: number) => void;
    /** По умолчанию определяет наибольшую целую единицу */
    defaultUnit?: DurationUnit;
}

/**
 * Поле длительности: число + переключатель единиц (минуты/часы/дни).
 * Хранит число в текстовом виде локально, передаёт наружу integer минуты.
 */
export function DurationField({
    label,
    hint,
    error,
    valueMinutes,
    onChangeMinutes,
    defaultUnit,
}: DurationFieldProps) {
    const id = useId();

    const initial = useMemo(() => pickUnit(valueMinutes, defaultUnit), [defaultUnit, valueMinutes]);
    const [unit, setUnit] = useState<DurationUnit>(initial.unit);
    const [text, setText] = useState<string>(initial.text);

    // Если внешнее значение поменялось — синхронизируем (но только когда
    // парсинг текущего text не даёт это значение, чтобы не мешать набору).
    useEffect(() => {
        const parsed = parseInt(text, 10);
        const currentMinutes = isNaN(parsed) ? 0 : parsed * UNIT_TO_MINUTES[unit];
        if (currentMinutes !== valueMinutes) {
            const fresh = pickUnit(valueMinutes, defaultUnit);
            setUnit(fresh.unit);
            setText(fresh.text);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valueMinutes]);

    const handleNumber = (next: string) => {
        setText(next);
        const parsed = parseInt(next, 10);
        if (!isNaN(parsed) && parsed > 0) {
            onChangeMinutes(parsed * UNIT_TO_MINUTES[unit]);
        } else {
            onChangeMinutes(0);
        }
    };

    const handleUnit = (next: DurationUnit) => {
        setUnit(next);
        const parsed = parseInt(text, 10);
        if (!isNaN(parsed) && parsed > 0) {
            onChangeMinutes(parsed * UNIT_TO_MINUTES[next]);
        }
    };

    return (
        <Field label={label} hint={hint} error={error} htmlFor={id}>
            <div className="flex gap-2">
                <input
                    id={id}
                    type="number"
                    min="1"
                    value={text}
                    onChange={(e) => handleNumber(e.target.value)}
                    className={`flex-1 ${inputClasses(error)}`}
                />
                <select
                    value={unit}
                    onChange={(e) => handleUnit(e.target.value as DurationUnit)}
                    className={inputClasses(error)}
                    aria-label="Единица длительности"
                    style={{ width: 'auto' }}
                >
                    {UNIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>
        </Field>
    );
}

// Подбирает оптимальную единицу для нулевого/начального значения.
function pickUnit(minutes: number, fallback: DurationUnit = 'minutes'): { unit: DurationUnit; text: string } {
    if (minutes <= 0) return { unit: fallback, text: '' };
    if (minutes % UNIT_TO_MINUTES.days === 0) {
        return { unit: 'days', text: String(minutes / UNIT_TO_MINUTES.days) };
    }
    if (minutes % UNIT_TO_MINUTES.hours === 0) {
        return { unit: 'hours', text: String(minutes / UNIT_TO_MINUTES.hours) };
    }
    return { unit: 'minutes', text: String(minutes) };
}
