#!/usr/bin/env node
/**
 * Generate tiny solid-color JPEG fixtures for E2E tests.
 * KISS: writes minimal valid JPEGs via canvas (sharp-free, zero deps).
 *
 * Uses Node's built-in `node:canvas` is not available, so we hand-roll
 * a minimal JPEG using a base64 1x1 then resize? Simpler: ship pre-made
 * tiny PNGs via base64 + use those (PNG works just as well as test input).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'tests', 'fixtures');
await mkdir(outDir, { recursive: true });

/** Build a 64x64 solid-color PNG via raw zlib-less PNG (uncompressed IDAT). */
const crc32 = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

const adler32 = (buf) => {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) { a = (a + buf[i]) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
};

const u32 = (n) => Buffer.from([n >>> 24, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);

const chunk = (type, data) => {
  const t = Buffer.from(type, 'ascii');
  const len = u32(data.length);
  const c = u32(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, c]);
};

/** Solid-color 64x64 RGB PNG with stored (uncompressed) zlib stream. */
const makePng = (r, g, b) => {
  const W = 64, H = 64;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.concat([u32(W), u32(H), Buffer.from([8, 2, 0, 0, 0])]); // 8-bit RGB
  // Raw scanlines: each row = filter byte (0) + W*3 RGB
  const row = Buffer.alloc(1 + W * 3);
  for (let x = 0; x < W; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }
  const raw = Buffer.alloc(H * row.length);
  for (let y = 0; y < H; y++) row.copy(raw, y * row.length);

  // zlib stored (no compression): 0x78 0x01 + DEFLATE stored blocks + adler32
  const blocks = [];
  let pos = 0;
  while (pos < raw.length) {
    const remain = raw.length - pos;
    const take = Math.min(0xffff, remain);
    const last = pos + take === raw.length ? 1 : 0;
    const head = Buffer.from([last, take & 0xff, (take >>> 8) & 0xff, ~take & 0xff, (~take >>> 8) & 0xff]);
    blocks.push(head, raw.slice(pos, pos + take));
    pos += take;
  }
  const zlib = Buffer.concat([Buffer.from([0x78, 0x01]), ...blocks, u32(adler32(raw))]);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const palette = [
  ['frame_01.png', 230, 60, 70],
  ['frame_02.png', 60, 200, 90],
  ['frame_03.png', 60, 90, 230],
  ['frame_04.png', 240, 200, 40],
];

for (const [name, r, g, b] of palette) {
  await writeFile(resolve(outDir, name), makePng(r, g, b));
  console.log(`✓ ${name}`);
}
console.log(`\nWrote ${palette.length} fixture(s) to tests/fixtures/`);
