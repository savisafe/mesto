'use client';

import type { ReactNode } from 'react';

interface FieldProps {
    label?: string;
    hint?: string;
    error?: string;
    htmlFor?: string;
    children: ReactNode;
    /** Без нижнего отступа — для последнего поля в группе или встраивания */
    inline?: boolean;
}

/**
 * Обёртка для поля формы. Даёт согласованную типографику
 * label / hint / error и единый отступ снизу.
 *
 * Используется TextField, NumberField, SelectField и т.д. внутри —
 * но также можно использовать напрямую для нестандартных контролов
 * (toggle, picker, etc).
 */
export function Field({ label, hint, error, htmlFor, children, inline }: FieldProps) {
    return (
        <div className={inline ? '' : 'mb-4'}>
            {label && (
                <label
                    htmlFor={htmlFor}
                    className="block text-purple-300 text-sm mb-1.5"
                >
                    {label}
                </label>
            )}
            {children}
            {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
            {!error && hint && <p className="text-purple-400 text-xs mt-1.5">{hint}</p>}
        </div>
    );
}
