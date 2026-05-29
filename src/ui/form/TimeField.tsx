'use client';

import { useId } from 'react';
import { Field } from './Field';
import { inputClasses } from './TextField';

interface TimeFieldProps {
    label?: string;
    hint?: string;
    error?: string;
    value: string;
    onChange: (value: string) => void;
}

export function TimeField({ label, hint, error, value, onChange }: TimeFieldProps) {
    const id = useId();
    return (
        <Field label={label} hint={hint} error={error} htmlFor={id}>
            <input
                id={id}
                type="time"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={inputClasses(error)}
            />
        </Field>
    );
}

interface DateFieldProps {
    label?: string;
    hint?: string;
    error?: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
}

export function DateField({ label, hint, error, value, onChange, min, max }: DateFieldProps) {
    const id = useId();
    return (
        <Field label={label} hint={hint} error={error} htmlFor={id}>
            <input
                id={id}
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                min={min}
                max={max}
                className={inputClasses(error)}
            />
        </Field>
    );
}
