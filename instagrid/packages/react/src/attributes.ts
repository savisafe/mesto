import type { Theme } from '@instagrid/core';

export interface InstaGridProps {
    /** Feed id assigned by the backend. */
    feed?: string;
    /** Direct JSON URL (fixtures/demo) — overrides feed/endpoint. */
    src?: string;
    /** Backend base URL; defaults to the widget's built-in endpoint. */
    endpoint?: string;
    columns?: number;
    rows?: number;
    gap?: number;
    radius?: number;
    theme?: Theme;
}

/** Map component props to string attributes for `<ig-grid>`. */
export function toAttributes(props: InstaGridProps): Record<string, string> {
    const out: Record<string, string> = {};
    const set = (key: string, value: string | number | undefined): void => {
        if (value !== undefined) out[key] = String(value);
    };
    set('feed', props.feed);
    set('src', props.src);
    set('endpoint', props.endpoint);
    set('columns', props.columns);
    set('rows', props.rows);
    set('gap', props.gap);
    set('radius', props.radius);
    set('theme', props.theme);
    return out;
}
