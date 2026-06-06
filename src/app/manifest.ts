import type { MetadataRoute } from 'next';

const manifest = (): MetadataRoute.Manifest => ({
    name: 'Mesto CRM',
    short_name: 'Mesto',
    description: 'CRM-система для малого бизнеса',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#4f46e5',
    lang: 'ru',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
        {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
        },
        {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
        },
        {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
        },
        {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
        },
    ],
});

export default manifest;
