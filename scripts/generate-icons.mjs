/**
 * Generate app icon / splash assets (redesign-vibrant-ui, v2).
 *
 * Logo: timer-ring metaphor — a circular band with the brand gradient
 * (red-orange → amber) around a play triangle, with a "gap" on the right
 * (like a running countdown). Dark navy background.
 *
 * v2 (2026-08):
 *  - Supersampled rendering from a 3072px master → smooth anti-aliased edges
 *  - Radial brand glow behind the ring (vibrant sporty feel)
 *  - Richer radial navy background (darker corners, lighter top-center)
 *  - Feathered edges on the ring gap + play triangle
 *
 * Pure Node (zlib built-in) — no image library needed. Regenerate any time:
 *   node scripts/generate-icons.mjs
 */
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../assets/images');
mkdirSync(OUT, { recursive: true });

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

/** Brand gradient #FF512F → #F09819, t in [0,1]. */
function brand(t) {
  return [
    Math.round(lerp(0xff, 0xf0, t)),
    Math.round(lerp(0x51, 0x98, t)),
    Math.round(lerp(0x2f, 0x19, t)),
  ];
}

const GAP_RAD = 0.42; // half-gap on the right (radians) — countdown metaphor

function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  if (c2 === 0) return Math.hypot(px - ax, py - ay);
  const t = clamp(c1 / c2, 0, 1);
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

/**
 * Soft point-in-triangle alpha. Returns 1 well inside, feathering to 0 over
 * `feather` px outside the edges.
 */
function triangleAlpha(px, py, ax, ay, bx, by, cx2, cy2, feather) {
  const s1 = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  const s2 = (cx2 - bx) * (py - by) - (cy2 - by) * (px - bx);
  const s3 = (ax - cx2) * (py - cy2) - (ay - cy2) * (px - cx2);
  const neg = s1 < 0 || s2 < 0 || s3 < 0;
  const pos = s1 > 0 || s2 > 0 || s3 > 0;
  if (!(neg && pos)) return 1; // strictly inside (or on an edge)
  const d = Math.min(
    segDist(px, py, ax, ay, bx, by),
    segDist(px, py, bx, by, cx2, cy2),
    segDist(px, py, cx2, cy2, ax, ay),
  );
  return 1 - smoothstep(0, feather, d);
}

/* ---------------- Master renderer (supersampled) ---------------- */

/**
 * Render the full logo into an N×N RGBA buffer.
 * @param {number} N canvas size (square, e.g. 3072)
 * @param {object} opts
 * @param {'gradient'|'transparent'} opts.bg background mode
 * @param {number} opts.scale scale the logo (0.72 for Android foreground safe zone)
 * @param {boolean} opts.mono render everything white (Android themed icon)
 * @param {boolean} opts.glow radial brand glow behind the ring
 */
function renderMaster(N, { bg = 'gradient', scale = 1, mono = false, glow = true } = {}) {
  const buf = Buffer.alloc(N * N * 4);
  const cx = N / 2;
  const cy = N / 2;
  const rOut = 0.4 * N * scale;
  const rIn = 0.295 * N * scale;
  const glowR = rOut * 2.0;
  const FEATHER = Math.max(2, N * 0.004); // ~12px at 3072
  const transparent = bg === 'transparent';

  const tri = {
    ax: cx - 0.1 * N * scale,
    ay: cy - 0.085 * N * scale,
    bx: cx - 0.1 * N * scale,
    by: cy + 0.085 * N * scale,
    cx2: cx + 0.12 * N * scale,
    cy2: cy,
  };

  for (let y = 0; y < N; y++) {
    const vAccent = (1 - y / N) * 0.1; // slightly lighter top
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx); // 0 = right
      const t = clamp(d / (N * 0.72), 0, 1);

      // ---- background (radial navy) ----
      let r = lerp(0x10, 0x05, Math.pow(t, 1.25)) * (1 - vAccent);
      let g = lerp(0x16, 0x08, Math.pow(t, 1.25)) * (1 - vAccent);
      let b = lerp(0x20, 0x0c, Math.pow(t, 1.25)) * (1 - vAccent);
      let a = 255;

      // ---- brand glow (behind everything, not for mono) ----
      if (glow && !mono && d < glowR) {
        const gw = Math.pow(1 - d / glowR, 2) * 0.32;
        r = lerp(r, 0xff, gw);
        g = lerp(g, 0x74, gw);
        b = lerp(b, 0x1f, gw);
      }

      // ---- ring band (gradient, with gap on the right) ----
      const angDist = Math.abs(ang) - GAP_RAD; // < 0 → inside the gap
      const angF = d > 0 ? FEATHER / d : 0; // angular feather → px
      const ringA =
        smoothstep(0, angF, angDist) * // gap edges
        smoothstep(0, FEATHER, d - rIn) * // inner edge
        smoothstep(0, FEATHER, rOut - d); // outer edge

      if (ringA > 0.003) {
        const angT = ((ang + Math.PI * 0.5 + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
        const [cr, cg, cb] = mono ? [255, 255, 255] : brand(angT);
        if (transparent) {
          r = cr; g = cg; b = cb; a = Math.round(255 * ringA);
        } else {
          r = lerp(r, cr, ringA);
          g = lerp(g, cg, ringA);
          b = lerp(b, cb, ringA);
        }
      }

      // ---- play triangle ----
      const triA = triangleAlpha(x, y, tri.ax, tri.ay, tri.bx, tri.by, tri.cx2, tri.cy2, FEATHER);
      if (triA > 0.003) {
        const tr = mono ? 255 : 245;
        const tg = mono ? 255 : 247;
        const tb = mono ? 255 : 250; // #F5F7FA
        if (transparent) {
          if (triA > a / 255) {
            r = tr; g = tg; b = tb; a = Math.round(255 * triA);
          }
        } else {
          r = lerp(r, tr, triA);
          g = lerp(g, tg, triA);
          b = lerp(b, tb, triA);
        }
      }

      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = transparent ? a : 255;
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

function write(name, size, buf) {
  writeFileSync(resolve(OUT, name), encodePNG(size, size, buf));
  console.log(`✓ ${name} (${size}×${size})`);
}

function writeSolid(name, size, [r, g, b]) {
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = 255;
  }
  writeFileSync(resolve(OUT, name), encodePNG(size, size, buf));
  console.log(`✓ ${name} (${size}×${size})`);
}

/* ---------------- Assets (master 3072 → exact integer downsample) ---------------- */

const MASTER = 3072;
console.log('Rendering master logos…');

// Full-bleed app icon (iOS) + web favicon — brand background + glow.
const iconMaster = renderMaster(MASTER, { bg: 'gradient', scale: 1, glow: true });
write('icon.png', 1024, downsample(iconMaster, MASTER, 1024));
write('favicon.png', 48, downsample(iconMaster, MASTER, 48));

// Splash logo (transparent bg, logo fills frame).
const splashMaster = renderMaster(MASTER, { bg: 'transparent', scale: 1, glow: true });
write('splash-icon.png', 512, downsample(splashMaster, MASTER, 512));

// Android adaptive icon: foreground logo in the central safe zone (72%).
const fgMaster = renderMaster(MASTER, { bg: 'transparent', scale: 0.72, glow: false });
write('android-icon-foreground.png', 1024, downsample(fgMaster, MASTER, 1024));
writeSolid('android-icon-background.png', 1024, [0x0b, 0x0f, 0x14]);

// Android 13+ themed icon (monochrome).
const monoMaster = renderMaster(MASTER, { bg: 'transparent', scale: 0.72, mono: true, glow: false });
write('android-icon-monochrome.png', 1024, downsample(monoMaster, MASTER, 1024));

console.log('Done →', OUT);
