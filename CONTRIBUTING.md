# Contributing

## Setup

[Bun](https://bun.sh) 1.2 or newer, plus Node 18 or newer: Bun installs packages and
runs the scripts, Astro and Playwright still run on Node.

```bash
bun install                               # also runs scripts/fetch-ffmpeg.mjs (ffmpeg-core, 31 MB)
bunx playwright install chromium webkit   # browsers for the end-to-end tests, once
```

## Scripts

```bash
bun run dev          # http://localhost:4321/boomerang/
bun run build        # astro check (typecheck) + static build into dist/
bun run preview      # serve dist/ the way the tests see it
bun run test:e2e     # Playwright, desktop Chrome + iPhone 14 WebKit
bun run test:e2e:ui  # same, interactive
```

There is no separate linter: `bun run build` is the type check. Run it and
`bun run test:e2e` before opening a pull request. The workflow in
`.github/workflows/deploy.yml` runs both on every pull request and deploys
`main` only when they pass.

## Layout

```
src/
├── lib/
│   ├── presets.ts      # Output presets and limits
│   ├── sequence.ts     # Pure helpers: boomerang indices, cycle count, contain math
│   ├── image.ts        # Decode, EXIF orientation, pad, resize, JPEG bytes
│   ├── encoder.ts      # ffmpeg.wasm wrapper
│   └── pipeline.ts     # Worker orchestration, the only API the UI calls
├── workers/            # preprocess (image) and encode (ffmpeg) workers
├── components/         # App, Dropzone, Settings, Preview, ProgressBar, ExportButton
├── pages/index.astro
└── styles/global.css
scripts/
├── fetch-ffmpeg.mjs    # downloads ffmpeg-core (bun install postinstall)
└── make-fixtures.mjs   # regenerates tests/fixtures/*.png
tests/                  # Playwright specs and fixtures
```

Rules of thumb:

- `sequence.ts` and `presets.ts` stay pure (no DOM): they are the part a
  unit test can cover.
- Heavy work (decoding, encoding) stays in the workers. The main thread
  dispatches and renders.
- No new runtime dependency without a reason in the pull request. The bundle
  is small on purpose and ffmpeg-core already weighs 31 MB.
- A component gets a `data-testid` when a test needs it; the specs select by
  test id only.

## Pull requests

- One topic per pull request, small diffs.
- Commit messages: one line, imperative, no body.
- Add or update a Playwright test when behavior changes. Fixtures are 64x64
  PNGs; keep them tiny.
- Say what you tested in the pull request description.

## Updating ffmpeg-core

The version is pinned in `scripts/fetch-ffmpeg.mjs`. After changing it, delete
`public/ffmpeg/` and run `bun run setup:ffmpeg`. The ESM build is required
because the ffmpeg class worker runs as a module worker.
