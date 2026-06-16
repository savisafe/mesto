import { describe, it, expect } from 'vitest';
import { normalizeInstagramUsername, instagramProfileUrl } from './instagram';

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
