import { describe, it, expect } from 'vitest';
import {
    normalizeInstagramWidgetUrl,
    normalizeInstagramUsername,
    instagramProfileUrl,
} from './instagram';

describe('normalizeInstagramWidgetUrl', () => {
    it('принимает прямой URL LightWidget', () => {
        expect(normalizeInstagramWidgetUrl('https://cdn.lightwidget.com/widgets/abc.html')).toBe(
            'https://cdn.lightwidget.com/widgets/abc.html',
        );
    });

    it('извлекает src из embed-кода iframe LightWidget', () => {
        const embed =
            '<iframe src="https://cdn.lightwidget.com/widgets/abc.html" class="lightwidget-widget" scrolling="no" style="border:none;" width="100%" height="400"></iframe>';
        expect(normalizeInstagramWidgetUrl(embed)).toBe(
            'https://cdn.lightwidget.com/widgets/abc.html',
        );
    });

    it('больше не поддерживает SnapWidget (хост и короткий ID отклоняются)', () => {
        expect(normalizeInstagramWidgetUrl('https://snapwidget.com/embed/123456')).toBeNull();
        expect(normalizeInstagramWidgetUrl('987654')).toBeNull();
    });

    it('отбрасывает чужой хост, http и мусор', () => {
        expect(normalizeInstagramWidgetUrl('https://evil.example.com/embed/1')).toBeNull();
        expect(normalizeInstagramWidgetUrl('http://lightwidget.com/widgets/abc.html')).toBeNull();
        expect(normalizeInstagramWidgetUrl('javascript:alert(1)')).toBeNull();
        expect(normalizeInstagramWidgetUrl('')).toBeNull();
    });

    it('не пропускает поддельный хост-префикс', () => {
        expect(
            normalizeInstagramWidgetUrl('https://lightwidget.com.evil.com/widgets/abc.html'),
        ).toBeNull();
    });
});

describe('normalizeInstagramUsername', () => {
    it('принимает чистый ник и убирает @', () => {
        expect(normalizeInstagramUsername('pet_salon')).toBe('pet_salon');
        expect(normalizeInstagramUsername('@Pet.Salon')).toBe('pet.salon');
    });

    it('достаёт ник из ссылки на профиль', () => {
        expect(normalizeInstagramUsername('https://www.instagram.com/pet_salon/')).toBe('pet_salon');
        expect(normalizeInstagramUsername('instagram.com/pet_salon')).toBe('pet_salon');
    });

    it('отбрасывает недопустимое', () => {
        expect(normalizeInstagramUsername('')).toBeNull();
        expect(normalizeInstagramUsername('has spaces')).toBeNull();
        expect(normalizeInstagramUsername('пробел')).toBeNull();
        expect(normalizeInstagramUsername('a'.repeat(31))).toBeNull();
    });

    it('строит ссылку на профиль', () => {
        expect(instagramProfileUrl('pet_salon')).toBe('https://instagram.com/pet_salon');
    });
});
