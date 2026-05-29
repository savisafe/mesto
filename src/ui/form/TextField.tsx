'use client';

import { useId } from 'react';
import { Field } from './Field';

interface TextFieldProps {
    label?: string;
    hint?: string;
    error?: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'email' | 'tel' | 'url' | 'search';
    disabled?: boolean;
    autoComplete?: string;
    name?: string;
    autoFocus?: boolean;
    inline?: boolean;
}

export function TextField({
    label,
    hint,
    error,
    placeholder,
    value,
    onChange,
    type = 'text',
    disabled,
    autoComplete,
    name,
    autoFocus,
    inline,
}: TextFieldProps) {
    const id = useId();
    return (
        <Field label={label} hint={hint} error={error} htmlFor={id} inline={inline}>
            <input
                id={id}
                name={name}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete={autoComplete}
                autoFocus={autoFocus}
                className={inputClasses(error)}
            />
        </Field>
    );
}

interface NumberFieldProps {
    label?: string;
    hint?: string;
    error?: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    inline?: boolean;
}

export function NumberField({
    label,
    hint,
    error,
    placeholder,
    value,
    onChange,
    min,
    max,
    step,
    disabled,
    inline,
}: NumberFieldProps) {
    const id = useId();
    return (
        <Field label={label} hint={hint} error={error} htmlFor={id} inline={inline}>
            <input
                id={id}
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                className={inputClasses(error)}
            />
        </Field>
    );
}

export function inputClasses(error?: string): string {
    return [
        'w-full px-3 py-2.5 rounded-xl text-white placeholder-purple-400',
        'bg-purple-800/40 border',
        error
            ? 'border-red-500 focus:border-red-400'
            : 'border-purple-700 focus:border-purple-500',
        'focus:outline-none focus:ring-2',
        error ? 'focus:ring-red-500/30' : 'focus:ring-purple-500/30',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition',
    ].join(' ');
}
