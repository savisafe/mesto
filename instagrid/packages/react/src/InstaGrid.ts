import { createElement, useEffect, type CSSProperties, type ReactElement } from 'react';
import { defineIgGrid } from '@instagrid/widget';
import { toAttributes, type InstaGridProps } from './attributes';

export interface InstaGridComponentProps extends InstaGridProps {
    className?: string;
    style?: CSSProperties;
}

/**
 * Thin React wrapper around the `<ig-grid>` Web Component. Registers the element
 * on mount and forwards props as attributes — no virtual DOM of its own.
 *
 *   <InstaGrid feed="ab12" columns={3} rows={3} />
 */
export function InstaGrid({ className, style, ...props }: InstaGridComponentProps): ReactElement {
    useEffect(() => {
        defineIgGrid();
    }, []);

    return createElement('ig-grid', {
        ...toAttributes(props),
        ...(className ? { class: className } : {}),
        ...(style ? { style } : {}),
    });
}
