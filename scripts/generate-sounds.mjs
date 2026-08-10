/**
 * Generates tiny WAV files for the 3 built-in transition sounds.
 * Pure Node — no dependencies. Run: node scripts/generate-sounds.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'assets', 'sounds');
mkdirSync(OUT_DIR, { recursive: true });

const SAMPLE_RATE = 22050;

function makeWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  samples.forEach((s, i) => buffer.writeInt16LE(Math.round(s), 44 + i * 2));
  return buffer;
}

function tone(freq, durationSec, volume = 0.5, fadeMs = 8) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float64Array(n);
  const fadeN = Math.floor((SAMPLE_RATE * fadeMs) / 1000);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / fadeN, (n - i) / fadeN);
    out[i] = volume * 32767 * env * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return out;
}

function concat(...arrays) {
  const total = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Float64Array(total);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

const sounds = {
  'chime-up.wav': tone(880, 0.18), // bright single beep — WORK/REST start
  'chime-down.wav': tone(440, 0.22), // lower beep — stage end
  'chime-done.wav': concat(tone(660, 0.15), tone(880, 0.15), tone(1046, 0.3)), // rising arpeggio — session complete
};

for (const [name, samples] of Object.entries(sounds)) {
  writeFileSync(join(OUT_DIR, name), makeWav(samples));
  console.log(`wrote ${name}`);
}
