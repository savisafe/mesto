// Генератор PWA-иконок без внешних зависимостей (только zlib).
// Рисует фирменный знак Mesto — белая «булавка места» на индиго-фоне.
// Запуск: node scripts/generate-pwa-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public', 'icons');

// Фирменный градиент: индиго → пурпур → розовый (дерзко и сочно).
const GRAD = [
    { t: 0, c: [79, 70, 229] }, // indigo-600 #4F46E5
    { t: 0.55, c: [147, 51, 234] }, // purple-600 #9333EA
    { t: 1, c: [236, 72, 153] }, // pink-500  #EC4899
];
const WHITE = [255, 255, 255];

const lerp = (a, b, t) => a + (b - a) * t;

const gradientAt = (t) => {
    for (let i = 1; i < GRAD.length; i++) {
        if (t <= GRAD[i].t) {
            const a = GRAD[i - 1];
            const b = GRAD[i];
            const k = (t - a.t) / (b.t - a.t);
            return [
                lerp(a.c[0], b.c[0], k),
                lerp(a.c[1], b.c[1], k),
                lerp(a.c[2], b.c[2], k),
            ];
        }
    }
    return GRAD[GRAD.length - 1].c;
};

const crcTable = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();

const crc32 = (buf) => {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return ~c >>> 0;
};

const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
};

const encodePng = (rgba, size) => {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    const stride = size * 4;
    const raw = Buffer.alloc((stride + 1) * size);
    for (let y = 0; y < size; y++) {
        raw[y * (stride + 1)] = 0; // filter type none
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
    }
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    return Buffer.concat([
        sig,
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
};

// Геометрия булавки в нормализованных координатах (0..1).
const HEAD = { x: 0.5, y: 0.4, r: 0.2 };
const TIP = { x: 0.5, y: 0.88 };
const HOLE_R = 0.082;

const insideCircle = (x, y, c, r) => (x - c.x) ** 2 + (y - c.y) ** 2 <= r * r;

const tangentTriangle = () => {
    const dx = TIP.x - HEAD.x;
    const dy = TIP.y - HEAD.y;
    const d = Math.hypot(dx, dy);
    const beta = Math.acos(HEAD.r / d);
    const phi = Math.atan2(dy, dx);
    const p = (sign) => ({
        x: HEAD.x + HEAD.r * Math.cos(phi + sign * beta),
        y: HEAD.y + HEAD.r * Math.sin(phi + sign * beta),
    });
    return [TIP, p(1), p(-1)];
};

const TRI = tangentTriangle();

const sign = (a, b, c) => (a.x - c.x) * (b.y - c.y) - (b.x - c.x) * (a.y - c.y);

const insideTriangle = (x, y, t) => {
    const p = { x, y };
    const d1 = sign(p, t[0], t[1]);
    const d2 = sign(p, t[1], t[2]);
    const d3 = sign(p, t[2], t[0]);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
};

// Возвращает alpha (0..1) знака булавки в точке с учётом scale/offset для maskable.
const pinAlpha = (x, y, scale, cy) => {
    const nx = (x - 0.5) / scale + 0.5;
    const ny = (y - cy) / scale + 0.5;
    const onPin = insideCircle(nx, ny, HEAD, HEAD.r) || insideTriangle(nx, ny, TRI);
    if (!onPin) return 0;
    if (insideCircle(nx, ny, HEAD, HOLE_R)) return 0;
    return 1;
};

const roundedRectAlpha = (x, y, radius) => {
    // x,y в 0..1. radius — относительный радиус скругления.
    const dx = Math.min(x, 1 - x);
    const dy = Math.min(y, 1 - y);
    if (dx >= radius || dy >= radius) return 1;
    const cx = dx < radius ? radius : dx;
    const cy = dy < radius ? radius : dy;
    const dist = Math.hypot(cx - dx, cy - dy);
    return dist <= radius ? 1 : 0;
};

// Мягкая тень от булавки: усредняем знак по диску с офсетом вниз.
const SHADOW_TAPS = (() => {
    const taps = [{ dx: 0, dy: 0 }];
    const rings = [0.012, 0.024];
    for (const r of rings) {
        for (let i = 0; i < 6; i++) {
            const ang = (Math.PI * 2 * i) / 6;
            taps.push({ dx: Math.cos(ang) * r, dy: Math.sin(ang) * r });
        }
    }
    return taps;
})();

const renderIcon = (size, { maskable }) => {
    const SS = 4; // суперсэмплинг для сглаживания
    const big = size * SS;
    const acc = Buffer.alloc(size * size * 4);
    const sums = new Float64Array(size * size * 4);

    // Параметры композиции.
    const bgRadius = maskable ? 0 : 0.235;
    const pinScale = maskable ? 0.6 : 0.82; // в maskable знак внутри safe-zone
    const pinCy = maskable ? 0.46 : 0.47;
    const shadowOffset = 0.045 * pinScale;

    for (let by = 0; by < big; by++) {
        for (let bx = 0; bx < big; bx++) {
            const x = (bx + 0.5) / big;
            const y = (by + 0.5) / big;
            const bgA = roundedRectAlpha(x, y, bgRadius);
            let r = 0, g = 0, b = 0, a = 0;
            if (bgA > 0) {
                // Диагональный градиент.
                const t = Math.min(1, Math.max(0, (x * 0.85 + y * 1.15) / 2));
                const grad = gradientAt(t);
                r = grad[0]; g = grad[1]; b = grad[2];

                // Глянцевый блик в верхнем-левом углу.
                const hd = Math.hypot(x - 0.26, y - 0.22);
                const hl = Math.max(0, 1 - hd / 0.6) ** 2 * 0.18;
                r = lerp(r, 255, hl); g = lerp(g, 255, hl); b = lerp(b, 255, hl);

                // Мягкая тень под булавкой.
                let sh = 0;
                for (const tp of SHADOW_TAPS) {
                    sh += pinAlpha(x - tp.dx, y - tp.dy - shadowOffset, pinScale, pinCy);
                }
                sh = (sh / SHADOW_TAPS.length) * 0.33;
                r *= 1 - sh; g *= 1 - sh; b *= 1 - sh;

                a = 255 * bgA;

                // Сама булавка: белая с лёгким вертикальным градиентом.
                const pinA = pinAlpha(x, y, pinScale, pinCy);
                if (pinA > 0) {
                    const shade = lerp(255, 232, Math.min(1, Math.max(0, (y - 0.2) / 0.6)));
                    r = lerp(r, shade, pinA);
                    g = lerp(g, shade, pinA);
                    b = lerp(b, lerp(255, 240, Math.min(1, Math.max(0, (y - 0.2) / 0.6))), pinA);
                }
            }
            const px = (Math.floor(by / SS) * size + Math.floor(bx / SS)) * 4;
            sums[px] += r * (a / 255);
            sums[px + 1] += g * (a / 255);
            sums[px + 2] += b * (a / 255);
            sums[px + 3] += a;
        }
    }

    const per = SS * SS;
    for (let i = 0; i < size * size; i++) {
        const o = i * 4;
        const a = sums[o + 3] / per; // средняя alpha по субпикселям (0..255)
        // sums[o] = Σ(color·alpha)/255 → straight color = sums[o]·255 / Σ(alpha)
        const aFactor = sums[o + 3] > 0 ? 255 / sums[o + 3] : 0;
        acc[o] = Math.min(255, Math.round(sums[o] * aFactor));
        acc[o + 1] = Math.min(255, Math.round(sums[o + 1] * aFactor));
        acc[o + 2] = Math.min(255, Math.round(sums[o + 2] * aFactor));
        acc[o + 3] = Math.round(a);
    }
    return encodePng(acc, size);
};

mkdirSync(PUBLIC_DIR, { recursive: true });

const targets = [
    { name: 'icon-192.png', size: 192, maskable: false },
    { name: 'icon-512.png', size: 512, maskable: false },
    { name: 'icon-maskable-192.png', size: 192, maskable: true },
    { name: 'icon-maskable-512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const t of targets) {
    const png = renderIcon(t.size, { maskable: t.maskable });
    writeFileSync(join(PUBLIC_DIR, t.name), png);
    console.log(`✓ ${t.name} (${png.length} bytes)`);
}
console.log('PWA-иконки сгенерированы в public/icons/');
