import { describe, it, expect, vi } from 'vitest';
import { InstagramProvider, normalizeMedia, type IgMedia } from './instagram';

const account = { provider: 'instagram', externalUserId: '1', username: 'studio' };

const sample: IgMedia[] = [
    {
        id: '10',
        caption: 'hello',
        media_type: 'IMAGE',
        media_url: 'https://scontent/img.jpg',
        permalink: 'https://instagram.com/p/10',
        timestamp: '2026-06-01T10:00:00+0000',
    },
    {
        id: '11',
        media_type: 'VIDEO',
        media_url: 'https://scontent/vid.mp4',
        thumbnail_url: 'https://scontent/poster.jpg',
        permalink: 'https://instagram.com/p/11',
        timestamp: '2026-05-30T08:00:00+0000',
    },
    {
        id: '12',
        media_type: 'CAROUSEL_ALBUM',
        media_url: 'https://scontent/album.jpg',
        permalink: 'https://instagram.com/p/12',
        timestamp: '2026-05-29T08:00:00+0000',
    },
];

describe('normalizeMedia', () => {
    it('maps types and picks the right thumbnail', () => {
        expect(normalizeMedia(sample[0]!)).toEqual({
            id: '10',
            type: 'image',
            thumbUrl: 'https://scontent/img.jpg',
            permalink: 'https://instagram.com/p/10',
            caption: 'hello',
            takenAt: '2026-06-01T10:00:00.000Z',
        });
        // Video uses the poster (thumbnail_url), not the mp4.
        expect(normalizeMedia(sample[1]!).thumbUrl).toBe('https://scontent/poster.jpg');
        expect(normalizeMedia(sample[1]!).type).toBe('video');
        expect(normalizeMedia(sample[2]!).type).toBe('carousel');
        // No caption → field omitted.
        expect('caption' in normalizeMedia(sample[1]!)).toBe(false);
    });
});

describe('InstagramProvider.sync', () => {
    it('calls the Graph API with the token and normalises the result', async () => {
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: sample }), { status: 200 }));
        const provider = new InstagramProvider({ fetchImpl: fetchImpl as unknown as typeof fetch, baseUrl: 'https://graph.test' });

        const items = await provider.sync(account, 'TOKEN123');

        expect(items).toHaveLength(3);
        const calledUrl = fetchImpl.mock.calls[0]![0] as string;
        expect(calledUrl).toContain('https://graph.test/me/media');
        expect(calledUrl).toContain('access_token=TOKEN123');
    });

    it('throws on a non-ok response', async () => {
        const fetchImpl = vi.fn(async () => new Response('', { status: 401 }));
        const provider = new InstagramProvider({ fetchImpl: fetchImpl as unknown as typeof fetch });
        await expect(provider.sync(account, 'bad')).rejects.toThrow(/HTTP 401/);
    });
});

describe('InstagramProvider.refresh', () => {
    it('returns a new token with computed expiry', async () => {
        const fetchImpl = vi.fn(async () =>
            new Response(JSON.stringify({ access_token: 'NEW', expires_in: 60 * 60 * 24 * 60 }), { status: 200 }),
        );
        const provider = new InstagramProvider({ fetchImpl: fetchImpl as unknown as typeof fetch });
        const info = await provider.refresh('OLD');
        expect(info.accessToken).toBe('NEW');
        expect(new Date(info.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
});
