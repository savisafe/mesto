'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field } from './Field';
import { inputClasses } from './TextField';

interface PasswordFieldProps {
    label?: string;
    hint?: string;
    error?: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete?: string;
    name?: string;
}

export function PasswordField({
    label,
    hint,
    error,
    placeholder,
    value,
    onChange,
    autoComplete = 'current-password',
    name,
}: PasswordFieldProps) {
    const id = useId();
    const [revealed, setRevealed] = useState(false);
    return (
        <Field label={label} hint={hint} error={error} htmlFor={id}>
            <div className="relative">
                <input
                    id={id}
                    name={name}
                    type={revealed ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className={`${inputClasses(error)} pr-11`}
                />
                <button
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                    aria-label={revealed ? 'Скрыть пароль' : 'Показать пароль'}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-purple-300 hover:text-white cursor-pointer"
                >
                    {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </Field>
    );
}
