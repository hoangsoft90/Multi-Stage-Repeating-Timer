/**
 * Generate the LoopTimer Play Store Feature Graphic — feature-graphic.png
 * (1024×500).
 *
 * Concept:
 *  - Dark background #0B0F14 with a subtle center glow
 *  - Large progress ring in the center (blue→purple gradient) with a
 *    countdown gap, white "20" inside (ties with the app icon)
 *  - Surrounded by 5 small colored stage rings (red→orange→yellow→
 *    green→purple) — the "chain of stages"
 *  - Big centered wordmark "LOOPTIMER" + subtitle "MULTI-STAGE INTERVAL
 *    TIMER"
 *  - Bottom-right circular "FREE" badge, top-left simple clock icon
 *  - All important content inside the central ~90% safe area
 *
 * Text is rendered from hand-crafted geometric letter definitions
 * (thick capsules + arc bands) — pure Node (zlib built-in), no fonts,
 * no image libraries. Regenerate any time:
 *   node scripts/generate-feature-graphic.mjs
 */
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../assets/images/feature-graphic.png');

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
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------------- Math helpers ---------------- */

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const norm = (x) => ((x % TAU) + TAU) % TAU;

/** Soft alpha of a thick line segment (round caps). r = half thickness. */
function capsuleAlpha(px, py, x1, y1, x2, y2, r, feather) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = c2 === 0 ? 0 : clamp(c1 / c2, 0, 1);
  const d = Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t)) - r;
  return 1 - smoothstep(0, feather, d);
}

/** Soft alpha of an annular arc band (ro/ri radii, angles a0→a1 clockwise). */
function arcBandAlpha(px, py, cx, cy, ro, ri, a0, a1, feather) {
  const d = Math.hypot(px - cx, py - cy);
  const radA = smoothstep(0, feather, d - ri) * smoothstep(0, feather, ro - d);
  if (radA <= 0.003) return 0;
  const A0 = norm(a0);
  let span = norm(a1) - A0;
  if (span <= 0) span += TAU;
  const dA = norm(Math.atan2(py - cy, px - cx) - A0);
  let dist;
  if (dA <= span) dist = 0;
  else dist = Math.min(dA - span, TAU - dA);
  const angA = 1 - smoothstep(0, Math.max(feather, feather * 0.9), dist);
  return radA * angA;
}

/* ---------------- Palette ---------------- */

const BG = [0x0b, 0x0f, 0x14]; // #0B0F14
const TEXT = [0xf5, 0xf7, 0xfa]; // near-white
const MUTED = [0x8b, 0x95, 0xa3]; // textSecondary
const STAGE_COLORS = [
  [0xff, 0x3d, 0x2e], // red    #FF3D2E
  [0xff, 0x7a, 0x18], // orange #FF7A18
  [0xff, 0xc1, 0x07], // yellow #FFC107
  [0x22, 0xc5, 0x5e], // green  #22C55E
  [0xa7, 0x8b, 0xfa], // purple #A78BFA
];
const RING_C = [
  [0x22, 0xd3, 0xee], // cyan   #22D3EE
  [0x3b, 0x82, 0xf6], // blue   #3B82F6
  [0x7c, 0x3a, 0xed], // purple #7C3AED
];
const BADGE_C = [
  [0xff, 0x51, 0x2f], // #FF512F
  [0xf0, 0x98, 0x19], // #F09819
];

/* ---------------- Geometric uppercase letters ----------------
 * Each letter is defined in a 100×100 unit box (cap height 100, stroke 16 →
 * capsule radius 8). Primitives: ['c', x1,y1,x2,y2] capsule, or
 * ['a', cx,cy, ro,ri, a0deg,a1deg] arc band. `width` = letter advance.
 */

const LETTERS = {
  A: { width: 80, segs: [['c', 12, 92, 40, 12], ['c', 40, 12, 68, 92], ['c', 24, 56, 56, 56]] },
  E: { width: 80, segs: [['c', 8, 8, 8, 92], ['c', 8, 8, 72, 8], ['c', 8, 50, 64, 50], ['c', 8, 92, 72, 92]] },
  F: { width: 80, segs: [['c', 8, 8, 8, 92], ['c', 8, 8, 72, 8], ['c', 8, 50, 56, 50]] },
  G: {
    width: 80,
    segs: [
      ['a', 50, 50, 42, 26, 40, 320],
      ['c', 50, 50, 74, 50],
      ['c', 74, 50, 74, 66],
    ],
  },
  I: { width: 60, segs: [['c', 30, 8, 30, 92]] },
  L: { width: 80, segs: [['c', 8, 8, 8, 92], ['c', 8, 92, 72, 92]] },
  M: {
    width: 80,
    segs: [['c', 8, 8, 8, 92], ['c', 72, 8, 72, 92], ['c', 8, 92, 40, 8], ['c', 40, 8, 72, 92]],
  },
  N: { width: 80, segs: [['c', 8, 8, 8, 92], ['c', 8, 8, 72, 92], ['c', 72, 8, 72, 92]] },
  O: { width: 100, segs: [['a', 50, 50, 42, 26, 0, 360]] },
  P: {
    width: 88,
    segs: [['c', 8, 8, 8, 92], ['a', 48, 50, 40, 24, 180, 360], ['c', 8, 50, 48, 50]],
  },
  R: {
    width: 80,
    segs: [['c', 8, 8, 8, 92], ['a', 48, 50, 40, 24, 180, 360], ['c', 8, 50, 48, 50], ['c', 48, 50, 72, 92]],
  },
  S: {
    width: 80,
    segs: [['a', 40, 40, 30, 14, 180, 360], ['a', 40, 60, 30, 14, 0, 180], ['c', 10, 40, 10, 30], ['c', 70, 60, 70, 70]],
  },
  T: { width: 80, segs: [['c', 8, 12, 72, 12], ['c', 40, 12, 40, 92]] },
  U: { width: 80, segs: [['c', 12, 12, 12, 80], ['c', 68, 12, 68, 80], ['c', 12, 80, 68, 80]] },
  V: { width: 80, segs: [['c', 12, 12, 40, 92], ['c', 40, 92, 68, 12]] },
};

/** Alpha of a whole letter at position (px,py) with origin (0,0) top-left. */
function letterAlpha(px, py, letter, scale, feather) {
  let a = 0;
  for (const prim of letter.segs) {
    if (prim[0] === 'c') {
      const [, x1, y1, x2, y2] = prim;
      a = Math.max(
        a,
        capsuleAlpha(px, py, x1 * scale, y1 * scale, x2 * scale, y2 * scale, 8 * scale, feather),
      );
    } else {
      const [, cx, cy, ro, ri, a0, a1] = prim;
      a = Math.max(
        a,
        arcBandAlpha(
          px, py,
          cx * scale, cy * scale,
          ro * scale, ri * scale,
          (a0 * Math.PI) / 180, (a1 * Math.PI) / 180,
          feather,
        ),
      );
    }
  }
  return a;
}

/** Layout a string → [{ch, x0, w}] with advance units + total width. */
function layout(str, gapU) {
  let x = 0;
  const items = [];
  for (const ch of str) {
    const w = ch === ' ' ? 45 : ch === '-' ? 60 : LETTERS[ch] ? LETTERS[ch].width : 45;
    items.push({ ch, x0: x, w });
    x += w + gapU;
  }
  return { items, total: x - gapU };
}

/* ---------------- Master renderer (1024×500 space, SS× supersample) ---------------- */

const W = 1024;
const H = 500;
const SS = 2; // master 2048×1000 → downsample to 1024×500

function renderMaster(MW, MH) {
  const buf = Buffer.alloc(MW * MH * 4);
  const feather = Math.max(1.2, 1.1); // ~1.2px in unit space
  const cxp = W / 2; // 512
  const cyp = 290; // big ring center
  const ringRo = 100;
  const ringRi = 74;
  const gapS0 = ((330 * Math.PI) / 180); // gap [-30°, +30°] on the right
  const gapSpan = (60 * Math.PI) / 180;

  // 7-segment "20" inside the ring
  const dTh = 11;
  const dW = 50;
  const dH = 86;
  const dGap = 16;
  const digits = [
    { ch: '2', ox: cxp - dW - dGap / 2 },
    { ch: '0', ox: cxp + dGap / 2 },
  ];
  const dOy = cyp - dH / 2;
  const segRects = [];
  for (const d of digits) {
    const rects = d.ch === '2'
      ? [ // a, b, g, e, d
          [0, 0, dW, dTh], [dW - dTh, 0, dTh, (dH - dTh) / 2],
          [0, (dH - dTh) / 2, dW, dTh], [0, (dH + dTh) / 2, dTh, (dH - dTh) / 2],
          [0, dH - dTh, dW, dTh],
        ]
      : [ // a, b, c, d, e, f
          [0, 0, dW, dTh], [dW - dTh, 0, dTh, (dH - dTh) / 2],
          [dW - dTh, (dH + dTh) / 2, dTh, (dH - dTh) / 2], [0, dH - dTh, dW, dTh],
          [0, (dH + dTh) / 2, dTh, (dH - dTh) / 2], [0, 0, dTh, (dH - dTh) / 2],
        ];
    for (const [x, y, w, h] of rects) segRects.push([d.ox + x, dOy + y, w, h]);
  }

  // Stage chain rings around the big ring (lower arc — clear of the
  // wordmark/subtitle above and the FREE badge on the right).
  const chainR = 125;
  const chainAngles = [30, 60, 90, 120, 150].map((a) => (a * Math.PI) / 180);
  const chainRo = 17;
  const chainRi = 11;

  // Wordmark + subtitle layout.
  const word = layout('LOOPTIMER', 34);
  const wordCap = 78;
  const wordX0 = cxp - (word.total * wordCap) / 200;
  const wordY = 48; // cap top
  const sub = layout('MULTI-STAGE INTERVAL TIMER', 24);
  const subCap = 24;
  const subX0 = cxp - (sub.total * subCap) / 200;
  const subY = 142;

  // FREE badge.
  const badge = layout('FREE', 14);
  const badgeCap = 17;
  const badgeCx = 860;
  const badgeCy = 415;
  const badgeR = 42;
  const badgeX0 = badgeCx - (badge.total * badgeCap) / 200;
  const badgeY = badgeCy - badgeCap / 2 - 1;

  // Clock icon (top-left).
  const clockCx = 78;
  const clockCy = 66;

  for (let my = 0; my < MH; my++) {
    const uy = my / SS;
    for (let mx = 0; mx < MW; mx++) {
      const ux = mx / SS;
      const i = (my * MW + mx) * 4;
      let r = 0, g = 0, b = 0, a = 255;

      // ---- background: dark + subtle center glow ----
      const dC = Math.hypot(ux - cxp, uy - 250);
      const vt = smoothstep(0.15, 0.85, dC / 900);
      r = lerp(0x13, 0x0b, vt);
      g = lerp(0x19, 0x0f, vt);
      b = lerp(0x21, 0x14, vt);

      // ---- big progress ring (blue→purple, countdown gap) ----
      const dx = ux - cxp;
      const dy = uy - cyp;
      const d = Math.hypot(dx, dy);
      if (d > ringRi - 2 && d < ringRo + 2) {
        const radA = smoothstep(0, feather, d - ringRi) * smoothstep(0, feather, ringRo - d);
        if (radA > 0.003) {
          const ang = Math.atan2(dy, dx);
          const dG = norm(ang - gapS0); // 0 at gap start
          let distGap;
          if (dG <= gapSpan) distGap = 0;
          else distGap = Math.min(dG - gapSpan, TAU - dG);
          const angA = smoothstep(0, 0.05, distGap);
          const segA = radA * angA;
          if (segA > 0.003) {
            const t = norm(ang - norm(gapS0 + gapSpan)) / (TAU - gapSpan);
            let cr, cg, cb;
            if (t < 0.45) {
              const k = t / 0.45;
              cr = lerp(RING_C[0][0], RING_C[1][0], k);
              cg = lerp(RING_C[0][1], RING_C[1][1], k);
              cb = lerp(RING_C[0][2], RING_C[1][2], k);
            } else {
              const k = (t - 0.45) / 0.55;
              cr = lerp(RING_C[1][0], RING_C[2][0], k);
              cg = lerp(RING_C[1][1], RING_C[2][1], k);
              cb = lerp(RING_C[1][2], RING_C[2][2], k);
            }
            r = lerp(r, cr, segA);
            g = lerp(g, cg, segA);
            b = lerp(b, cb, segA);
          }
        }
      }

      // ---- white "20" (7-segment) ----
      for (const [sx, sy, sw, sh] of segRects) {
        const hx = clamp(ux, sx + dTh / 2, sx + sw - dTh / 2);
        const hy = clamp(uy, sy + dTh / 2, sy + sh - dTh / 2);
        const segA = 1 - smoothstep(0, feather, Math.hypot(ux - hx, uy - hy) - dTh / 2);
        if (segA > 0.003) {
          r = lerp(r, TEXT[0], segA);
          g = lerp(g, TEXT[1], segA);
          b = lerp(b, TEXT[2], segA);
        }
      }

      // ---- stage chain rings ----
      for (let k = 0; k < chainAngles.length; k++) {
        const cx = cxp + chainR * Math.cos(chainAngles[k]);
        const cy = cyp + chainR * Math.sin(chainAngles[k]);
        const cd = Math.hypot(ux - cx, uy - cy);
        if (cd > chainRi - 2 && cd < chainRo + 2) {
          const ringA = smoothstep(0, feather, cd - chainRi) * smoothstep(0, feather, chainRo - cd);
          if (ringA > 0.003) {
            const [cr, cg, cb] = STAGE_COLORS[k];
            r = lerp(r, cr, ringA);
            g = lerp(g, cg, ringA);
            b = lerp(b, cb, ringA);
          }
        }
      }

      // ---- wordmark "LOOPTIMER" ----
      if (uy >= wordY - 4 && uy <= wordY + 100 + 4) {
        for (const it of word.items) {
          if (it.ch === ' ') continue;
          const L = wordX0 + (it.x0 * wordCap) / 100;
          const R = wordX0 + ((it.x0 + it.w) * wordCap) / 100;
          if (ux < L - 4 || ux > R + 4) continue;
          const la = letterAlpha(ux - L, uy - wordY, LETTERS[it.ch], wordCap / 100, feather);
          if (la > 0.003) {
            r = lerp(r, TEXT[0], la);
            g = lerp(g, TEXT[1], la);
            b = lerp(b, TEXT[2], la);
          }
        }
      }

      // ---- subtitle ----
      if (uy >= subY - 2 && uy <= subY + 100 * (subCap / 100) + 2) {
        for (const it of sub.items) {
          if (it.ch === ' ' || it.ch === '-') continue;
          const L = subX0 + (it.x0 * subCap) / 100;
          const R = subX0 + ((it.x0 + it.w) * subCap) / 100;
          if (ux < L - 2 || ux > R + 2) continue;
          const la = letterAlpha(ux - L, uy - subY, LETTERS[it.ch], subCap / 100, feather);
          if (la > 0.003) {
            r = lerp(r, MUTED[0], la);
            g = lerp(g, MUTED[1], la);
            b = lerp(b, MUTED[2], la);
          }
        }
      }

      // ---- FREE badge ----
      const bd = Math.hypot(ux - badgeCx, uy - badgeCy);
      if (bd < badgeR + 2) {
        const fillA = 1 - smoothstep(0, feather, bd - badgeR);
        if (fillA > 0.003) {
          const bt = clamp((ux - (badgeCx - badgeR)) / (2 * badgeR), 0, 1);
          const cr = lerp(BADGE_C[0][0], BADGE_C[1][0], bt);
          const cg = lerp(BADGE_C[0][1], BADGE_C[1][1], bt);
          const cb = lerp(BADGE_C[0][2], BADGE_C[1][2], bt);
          r = lerp(r, cr, fillA);
          g = lerp(g, cg, fillA);
          b = lerp(b, cb, fillA);
        }
        if (uy >= badgeY - 2 && uy <= badgeY + 100 * (badgeCap / 100) + 2) {
          for (const it of badge.items) {
            if (it.ch === ' ') continue;
            const L = badgeX0 + (it.x0 * badgeCap) / 100;
            const R = badgeX0 + ((it.x0 + it.w) * badgeCap) / 100;
            if (ux < L - 2 || ux > R + 2) continue;
            const la = letterAlpha(ux - L, uy - badgeY, LETTERS[it.ch], badgeCap / 100, feather);
            if (la > 0.003) {
              r = lerp(r, 0xff, la);
              g = lerp(g, 0xff, la);
              b = lerp(b, 0xff, la);
            }
          }
        }
      }

      // ---- clock icon (top-left) ----
      const ck = Math.hypot(ux - clockCx, uy - clockCy);
      if (ck > 16 && ck < 26) {
        const ckA = smoothstep(0, feather, ck - 16) * smoothstep(0, feather, 26 - ck);
        if (ckA > 0.003) {
          r = lerp(r, MUTED[0], ckA);
          g = lerp(g, MUTED[1], ckA);
          b = lerp(b, MUTED[2], ckA);
        }
      }
      // hands
      const hand = (x1, y1, x2, y2) => {
        const ha = capsuleAlpha(ux, uy, clockCx + x1, clockCy + y1, clockCx + x2, clockCy + y2, 3, feather);
        if (ha > 0.003) {
          r = lerp(r, MUTED[0], ha);
          g = lerp(g, MUTED[1], ha);
          b = lerp(b, MUTED[2], ha);
        }
      };
      hand(0, 0, -4, -11); // hour
      hand(0, 0, 5, -16); // minute

      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = a;
    }
  }
  return buf;
}

/** Box-downsample by exact integer factor. */
function downsample(src, srcW, srcH, tw, th) {
  const fx = srcW / tw;
  const fy = srcH / th;
  const out = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++) {
    const y0 = Math.floor(y * fy);
    const y1 = Math.min(srcH - 1, Math.ceil((y + 1) * fy) - 1);
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor(x * fx);
      const x1 = Math.min(srcW - 1, Math.ceil((x + 1) * fx) - 1);
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = y0; sy <= y1; sy++) {
        for (let sx = x0; sx <= x1; sx++) {
          const si = (sy * srcW + sx) * 4;
          r += src[si]; g += src[si + 1]; b += src[si + 2]; n++;
        }
      }
      const oi = (y * tw + x) * 4;
      out[oi] = Math.round(r / n);
      out[oi + 1] = Math.round(g / n);
      out[oi + 2] = Math.round(b / n);
      out[oi + 3] = 255;
    }
  }
  return out;
}

/* ---------------- Render: 2048×1000 master → 1024×500 ---------------- */

const MW = W * SS;
const MH = H * SS;
console.log(`Rendering master ${MW}×${MH} (${SS}× supersampled)…`);
const master = renderMaster(MW, MH);
const out = downsample(master, MW, MH, W, H);
writeFileSync(OUT, encodePNG(W, H, out));
console.log(`✓ ${OUT}`);
console.log(`  ${W}×${H}px · ${(master.length / 1e6).toFixed(1)}MB master · ${(out.length / 1024).toFixed(1)}KB output`);
console.log('Done.');
