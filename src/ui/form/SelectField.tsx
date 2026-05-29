'use client';

import { useId } from 'react';
import { Field } from './Field';
import { inputClasses } from './TextField';

interface Option {
    value: string;
    label: string;
}

interface SelectFieldProps {
    label?: string;
    hint?: string;
    error?: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
}

export function SelectField({
    label,
    hint,
    error,
    value,
    onChange,
    options,
    placeholder,
    disabled,
}: SelectFieldProps) {
    const id = useId();
    return (
        <Field label={label} hint={hint} error={error} htmlFor={id}>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={inputClasses(error)}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </Field>
    );
}
