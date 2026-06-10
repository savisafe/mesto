import { describe, it, expect } from 'vitest';
import { normalizeInstagramWidgetUrl } from './instagram-widget';

describe('normalizeInstagramWidgetUrl', () => {
    it('принимает прямой URL SnapWidget', () => {
        expect(normalizeInstagramWidgetUrl('https://snapwidget.com/embed/123456')).toBe(
            'https://snapwidget.com/embed/123456',
        );
    });

    it('извлекает src из embed-кода iframe', () => {
        const embed =
            '<iframe src="https://snapwidget.com/embed/987" class="snapwidget-widget" allowtransparency="true" frameborder="0" scrolling="no" style="border:none;" width="100%" height="400"></iframe>';
        expect(normalizeInstagramWidgetUrl(embed)).toBe('https://snapwidget.com/embed/987');
    });

    it('принимает LightWidget', () => {
        expect(normalizeInstagramWidgetUrl('https://cdn.lightwidget.com/widgets/abc.html')).toBe(
            'https://cdn.lightwidget.com/widgets/abc.html',
        );
    });

    it('отбрасывает чужой хост', () => {
        expect(normalizeInstagramWidgetUrl('https://evil.example.com/embed/1')).toBeNull();
    });

    it('отбрасывает http (не https)', () => {
        expect(normalizeInstagramWidgetUrl('http://snapwidget.com/embed/1')).toBeNull();
    });

    it('отбрасывает javascript: и мусор', () => {
        expect(normalizeInstagramWidgetUrl('javascript:alert(1)')).toBeNull();
        expect(normalizeInstagramWidgetUrl('not a url')).toBeNull();
        expect(normalizeInstagramWidgetUrl('')).toBeNull();
    });

    it('не пропускает поддельный хост-префикс', () => {
        expect(normalizeInstagramWidgetUrl('https://snapwidget.com.evil.com/embed/1')).toBeNull();
    });
});
