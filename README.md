# Boomerang

Turns a sequence of photos into a looped MP4 (forward, then backward) for
Instagram, Reels, Stories or TikTok. Everything runs in the browser with
ffmpeg.wasm; nothing is uploaded.

Live: <https://theotaburet.github.io/boomerang/>

## What it does

- Square, portrait (9:16) and landscape (16:9) presets, long edge from 720 to 4096 px.
- Padding and background color.
- EXIF orientation, HEIC input (converted on the fly).
- Live canvas preview before encoding.
- H.264, yuv420p, faststart MP4.
- Images are preprocessed in parallel Web Workers. ffmpeg uses the
  single-threaded core, so no COOP/COEP headers are needed.

## Run it locally

```bash
bun install     # also downloads ffmpeg-core (31 MB) into public/ffmpeg/
bun run dev     # http://localhost:4321/boomerang/
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the build, the tests and the
project layout.

## Deploy

`.github/workflows/deploy.yml` builds, runs the end-to-end tests and publishes
`dist/` to GitHub Pages on every push to `main`.

The output is static, served under `base: '/boomerang'` (`astro.config.mjs`;
set it to `/` for a root domain).

To serve ffmpeg-core from a CDN instead of self-hosting it, set
`VITE_FFMPEG_CORE_BASE` before building, for example
`https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm`. Cloudflare Pages needs this
because it caps files at 25 MiB. `public/_headers` sets the caching and CORP
headers for Netlify.

## License

MIT
