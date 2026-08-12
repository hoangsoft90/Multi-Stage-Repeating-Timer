/**
 * Generate the new LoopTimer app icon — icon.png (512×512).
 *
 * Concept (Play Store / launcher):
 *  - Dark rounded background #0B0F14 (matches the app's adaptive icon)
 *  - Center: a CLOSED progress ring with 5 color segments
 *    (red → orange → yellow → green → purple) — the "multiple stages"
 *    metaphor. Colors taken from the app's real stage palette
 *    (src/constants/stage-colors.ts): work red, brand orange, amber
 *    yellow, break green, focus purple.
 *  - Inside the ring: a white "20" rendered as a bold 7-segment display
 *    (timer/digital-clock aesthetic — readable even at 48px).
 *  - No tiny details, no small text.
 *
 * Pure Node (zlib built-in) — no image library needed. Regenerate any time:
 *   node scripts/generate-app-icon.mjs
 */
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../assets/images/icon.png');

/* ---------------- PNG encoder (minimal, RGBA8) ---------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------------- Math helpers ---------------- */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Soft alpha for a rounded rectangle (feathered over `feather` px outside). */
function roundRectAlpha(px, py, x, y, w, h, r, feather) {
  const cx = clamp(px, x + r, x + w - r);
  const cy = clamp(py, y + r, y + h - r);
  const d = Math.hypot(px - cx, py - cy) - r;
  return 1 - smoothstep(0, feather, d);
}

/* ---------------- Palette (from src/constants/stage-colors.ts) ---------------- */

const BG = [0x0b, 0x0f, 0x14]; // #0B0F14 — app dark background

// Closed progress ring: 5 segments, red → orange → yellow → green → purple.
const SEGMENT_COLORS = [
  [0xff, 0x3d, 0x2e], // red    #FF3D2E  (stage: work)
  [0xff, 0x7a, 0x18], // orange #FF7A18  (brand gradient)
  [0xff, 0xc1, 0x07], // yellow #FFC107  (amber)
  [0x22, 0xc5, 0x5e], // green  #22C55E  (stage: break)
  [0xa7, 0x8b, 0xfa], // purple #A78BFA  (stage: focus)
];

const WHITE = [0xff, 0xff, 0xff];
const SEGMENTS = SEGMENT_COLORS.length; // 5
const SEG_SPAN = (Math.PI * 2) / SEGMENTS;
const SEG_START = -Math.PI / 2; // first segment (red) at the top

/* ---------------- 7-segment "20" geometry ---------------- */

/**
 * Rectangles [x, y, w, h] forming a 7-segment digit inside a dw×dh box.
 * `th` is the segment thickness; every segment is pill-shaped (r = th/2).
 */
function digitSegments(digit, dw, dh, th) {
  const V = (dh - th) / 2; // vertical segment length
  const a = [0, 0, dw, th];
  const b = [dw - th, 0, th, V];
  const c = [dw - th, V + th, th, V];
  const d = [0, dh - th, dw, th];
  const e = [0, V + th, th, V];
  const f = [0, 0, th, V];
  const g = [0, (dh - th) / 2, dw, th];
  if (digit === '0') return [a, b, c, d, e, f];
  if (digit === '2') return [a, b, g, e, d];
  return [];
}

/* ---------------- Master renderer (supersampled) ---------------- */

/**
 * Render the icon into an N×N RGBA buffer.
 * @param {number} N canvas size (square master, e.g. 2048)
 */
function renderMaster(N) {
  const buf = Buffer.alloc(N * N * 4);
  const c = N / 2;
  const FEATHER = Math.max(2, N * 0.0025); // ~5px at 2048

  // Background: rounded rect filling the canvas (transparent corners).
  const bgR = N * 0.225; // corner radius ≈ 22.5%

  // Ring: bold closed band (stroke ≈ 13% of N).
  const rOut = N * 0.4;
  const rIn = N * 0.27;
  const angF = (2 * FEATHER) / rIn; // angular feather → radians

  // "20" — two 7-segment digits, centered inside the ring.
  const th = N * 0.042; // segment thickness
  const digitW = N * 0.155;
  const digitH = N * 0.27;
  const gap = N * 0.05;
  const digits = [
    { char: '2', ox: c - digitW - gap / 2 },
    { char: '0', ox: c + gap / 2 },
  ];
  const oy = c - digitH / 2;
  const digitRects = digits.map((d) => ({
    rects: digitSegments(d.char, digitW, digitH, th).map(([x, y, w, h]) => [
      d.ox + x,
      oy + y,
      w,
      h,
    ]),
  }));

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      // ---- background rounded rect ----
      const bgA = roundRectAlpha(x, y, 0, 0, N, N, bgR, FEATHER);
      if (bgA > 0.003) {
        r = BG[0];
        g = BG[1];
        b = BG[2];
        a = Math.round(255 * bgA);
      }

      // ---- progress ring (5 color segments) ----
      const dx = x - c;
      const dy = y - c;
      const d = Math.hypot(dx, dy);
      if (a > 0.003 && d > rIn - FEATHER && d < rOut + FEATHER) {
        const ringA =
          smoothstep(0, FEATHER, d - rIn) * // inner edge
          smoothstep(0, FEATHER, rOut - d); // outer edge
        if (ringA > 0.003) {
          let ang = Math.atan2(dy, dx) - SEG_START;
          ang = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const idx = Math.min(SEGMENTS - 1, Math.floor(ang / SEG_SPAN));
          const segLo = idx * SEG_SPAN;
          const segHi = (idx + 1) * SEG_SPAN;
          const edgeA = smoothstep(0, angF, Math.min(ang - segLo, segHi - ang));
          const segA = ringA * edgeA;
          if (segA > 0.003) {
            const [cr, cg, cb] = SEGMENT_COLORS[idx];
            r = lerp(r, cr, segA);
            g = lerp(g, cg, segA);
            b = lerp(b, cb, segA);
            a = Math.min(255, Math.round(a + (255 - a) * segA));
          }
        }
      }

      // ---- white "20" (7-segment) ----
      if (a > 0.003) {
        for (const { rects } of digitRects) {
          for (const [sx, sy, sw, sh] of rects) {
            const segA = roundRectAlpha(x, y, sx, sy, sw, sh, th / 2, FEATHER);
            if (segA > 0.003) {
              r = lerp(r, WHITE[0], segA);
              g = lerp(g, WHITE[1], segA);
              b = lerp(b, WHITE[2], segA);
              a = Math.min(255, Math.round(a + (255 - a) * segA));
            }
          }
        }
      }

      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = a;
    }
  }
  return buf;
}

/** Box-downsample a master buffer by an exact integer factor. */
function downsample(src, srcN, targetN) {
  const f = srcN / targetN;
  if (!Number.isInteger(f)) throw new Error(`downsample factor must be integer: ${f}`);
  const out = Buffer.alloc(targetN * targetN * 4);
  for (let y = 0; y < targetN; y++) {
    const y0 = y * f;
    for (let x = 0; x < targetN; x++) {
      const x0 = x * f;
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < f; sy++) {
        for (let sx = 0; sx < f; sx++) {
          const si = ((y0 + sy) * srcN + (x0 + sx)) * 4;
          r += src[si]; g += src[si + 1]; b += src[si + 2]; a += src[si + 3];
        }
      }
      const n = f * f;
      const oi = (y * targetN + x) * 4;
      out[oi] = Math.round(r / n);
      out[oi + 1] = Math.round(g / n);
      out[oi + 2] = Math.round(b / n);
      out[oi + 3] = Math.round(a / n);
    }
  }
  return out;
}

/* ---------------- Render: 2048 master → 512 icon ---------------- */

const MASTER = 2048;
const TARGET = 512;

console.log('Rendering master icon (2048², supersampled)…');
const master = renderMaster(MASTER);
const icon = downsample(master, MASTER, TARGET);
writeFileSync(OUT, encodePNG(TARGET, TARGET, icon));

// Sanity stats for the report.
let opaque = 0;
let whitePx = 0;
let ringPx = 0;
for (let i = 0; i < TARGET * TARGET; i++) {
  const a = icon[i * 4 + 3];
  if (a > 200) opaque++;
  if (a > 128) {
    const r = icon[i * 4], g = icon[i * 4 + 1], b = icon[i * 4 + 2];
    if (r > 220 && g > 220 && b > 220) whitePx++;
    else ringPx++;
  }
}
const total = TARGET * TARGET;
console.log(`✓ ${OUT}`);
console.log(`  ${TARGET}×${TARGET}px · ${(master.length / 1e6).toFixed(1)}MB master · opaque ${((opaque / total) * 100).toFixed(0)}% · white glyph ${((whitePx / total) * 100).toFixed(1)}% · colored ring ${((ringPx / total) * 100).toFixed(1)}%`);
console.log('Done.');
