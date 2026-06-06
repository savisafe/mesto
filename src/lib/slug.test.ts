import { describe, it, expect } from 'vitest';
import { slugify, isValidSlug, MAX_SLUG_LENGTH } from './slug';

describe('slugify', () => {
    it('транслитерирует кириллицу', () => {
        expect(slugify('Барбершоп')).toBe('barbershop');
    });

    it('пробелы и спецсимволы превращает в дефисы', () => {
        expect(slugify('My Beauty Studio!!!')).toBe('my-beauty-studio');
    });

    it('обрезает дефисы по краям', () => {
        expect(slugify('  --Привет, мир--  ')).toBe('privet-mir');
    });

    it('ограничивает длину', () => {
        expect(slugify('a'.repeat(100)).length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    });
});

describe('isValidSlug', () => {
    it('принимает корректные', () => {
        expect(isValidSlug('salon-1')).toBe(true);
        expect(isValidSlug('barbershop')).toBe(true);
    });

    it('отклоняет некорректные', () => {
        expect(isValidSlug('Salon')).toBe(false); // заглавные
        expect(isValidSlug('-x')).toBe(false); // дефис по краю
        expect(isValidSlug('a b')).toBe(false); // пробел
        expect(isValidSlug('')).toBe(false);
    });
});
