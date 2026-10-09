#!/usr/bin/env node
/**
 * Self-host ffmpeg-core assets in `public/ffmpeg/`.
 * Runs on `bun install` (postinstall) and on `bun run setup:ffmpeg`.
 *
 * No dependencies: uses global fetch.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.12.10';
// ESM build: required because we spawn the @ffmpeg/ffmpeg class worker as `type: "module"`
// (its `importScripts` fallback fails in module workers, so it must `await import()` the core).
const BASE = `https://unpkg.com/@ffmpeg/core@${VERSION}/dist/esm`;
const FILES = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public', 'ffmpeg');

const exists = async (p) => stat(p).then(() => true, () => false);

await mkdir(outDir, { recursive: true });

let downloaded = 0;
for (const name of FILES) {
  const dest = resolve(outDir, name);
  if (await exists(dest)) {
    console.log(`✓ ${name} (cached)`);
    continue;
  }
  const url = `${BASE}/${name}`;
  console.log(`↓ ${name} ← ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`✗ ${name} HTTP ${res.status}`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  downloaded++;
  console.log(`✓ ${name} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
}

console.log(
  downloaded
    ? `\nDone. ${downloaded} file(s) downloaded to public/ffmpeg/`
    : '\nNothing to do, all files already present.'
);
