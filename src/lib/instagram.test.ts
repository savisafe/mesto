import { describe, it, expect } from 'vitest';
import {
    normalizeInstagramWidgetUrl,
    normalizeInstagramUsername,
    instagramProfileUrl,
} from './instagram';

describe('normalizeInstagramWidgetUrl', () => {
    it('принимает прямой URL SnapWidget', () => {
        expect(normalizeInstagramWidgetUrl('https://snapwidget.com/embed/123456')).toBe(
            'https://snapwidget.com/embed/123456',
        );
    });

    it('собирает URL из короткого ID виджета', () => {
        expect(normalizeInstagramWidgetUrl('987654')).toBe('https://snapwidget.com/embed/987654');
    });

    it('извлекает src из embed-кода iframe', () => {
        const embed =
            '<iframe src="https://snapwidget.com/embed/987" class="snapwidget-widget" frameborder="0" scrolling="no" style="border:none;" width="100%" height="400"></iframe>';
        expect(normalizeInstagramWidgetUrl(embed)).toBe('https://snapwidget.com/embed/987');
    });

    it('принимает LightWidget', () => {
        expect(normalizeInstagramWidgetUrl('https://cdn.lightwidget.com/widgets/abc.html')).toBe(
            'https://cdn.lightwidget.com/widgets/abc.html',
        );
    });

    it('отбрасывает чужой хост, http и мусор', () => {
        expect(normalizeInstagramWidgetUrl('https://evil.example.com/embed/1')).toBeNull();
        expect(normalizeInstagramWidgetUrl('http://snapwidget.com/embed/1')).toBeNull();
        expect(normalizeInstagramWidgetUrl('javascript:alert(1)')).toBeNull();
        expect(normalizeInstagramWidgetUrl('')).toBeNull();
    });

    it('не пропускает поддельный хост-префикс', () => {
        expect(normalizeInstagramWidgetUrl('https://snapwidget.com.evil.com/embed/1')).toBeNull();
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
