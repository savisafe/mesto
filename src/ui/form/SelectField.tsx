'use client';

import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
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
            {/* appearance-none + кастомная стрелка: нативный select на iOS не тянется
                как текстовый инпут, из-за чего поля были разной ширины. */}
            <div className="relative">
                <select
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`${inputClasses(error)} appearance-none pr-9 cursor-pointer`}
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
                <ChevronDown
                    size={18}
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-purple-300"
                />
            </div>
        </Field>
    );
}
