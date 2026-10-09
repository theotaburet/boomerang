import { test, expect, type Page } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = ['frame_01.png', 'frame_02.png', 'frame_03.png', 'frame_04.png']
  .map((f) => resolve(here, 'fixtures', f));

const dropFiles = async (page: Page) => {
  await page.setInputFiles('[data-testid="file-input"]', FIXTURES);
};

test.describe('Boomerang app', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('renders header and dropzone', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /boomerang/i })).toBeVisible();
    await expect(page.getByTestId('dropzone')).toBeVisible();
    await expect(page.getByTestId('preview')).toBeVisible();
  });

  test('accepts files and shows settings + preview canvas', async ({ page }) => {
    await dropFiles(page);

    await expect(page.getByTestId('dropzone')).toContainText(/4 photos selected/i);
    await expect(page.getByTestId('settings')).toBeVisible();
    // Wait for preprocessing to finish: the canvas appears once frames are ready.
    await expect(page.getByTestId('preview-canvas')).toBeVisible({ timeout: 30_000 });
  });

  test('size selector updates output dimensions hint', async ({ page }) => {
    await dropFiles(page);
    await expect(page.getByTestId('settings')).toBeVisible();

    const hint = page.getByTestId('hint-size');
    await page.getByTestId('size-720').click();
    await expect(hint).toContainText('720×720');

    await page.getByTestId('size-1440').click();
    await expect(hint).toContainText('1440×1440');

    await page.getByTestId('size-2048').click();
    await expect(hint).toContainText(/slow on mobile/i);
  });

  test('preset switch changes aspect ratio dimensions', async ({ page }) => {
    await dropFiles(page);
    await expect(page.getByTestId('settings')).toBeVisible();

    // Default is square 1080.
    await expect(page.getByTestId('hint-size')).toContainText('1080×1080');

    await page.getByTestId('preset-portrait').click();
    // 9:16 at long edge 1080 gives 608×1080 (rounded to even).
    await expect(page.getByTestId('hint-size')).toContainText(/×1080/);

    await page.getByTestId('preset-landscape').click();
    await expect(page.getByTestId('hint-size')).toContainText(/1080×/);
  });

  test('fps and duration sliders update hints', async ({ page }) => {
    await dropFiles(page);
    await expect(page.getByTestId('settings')).toBeVisible();

    const fps = page.getByTestId('fps-slider');
    await fps.fill('45');
    await expect(page.getByTestId('hint-fps')).toContainText('45');

    // Sub-1 fps supported.
    await fps.fill('0.5');
    await expect(page.getByTestId('hint-fps')).toContainText('0.5');

    const dur = page.getByTestId('duration-slider');
    await dur.fill('6');
    await expect(page.getByTestId('hint-duration')).toContainText('6s');
  });

  test('full export pipeline produces a downloadable mp4', async ({ page }) => {
    test.setTimeout(180_000);

    const errors: string[] = [];
    page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
    page.on('console', (msg) => {
      const t = msg.type();
      if (t === 'error' || t === 'warning' || msg.text().includes('[encode]')) {
        console.log(`[console.${t}]`, msg.text());
      }
    });

    await dropFiles(page);
    // Wait for preprocessing to complete: canvas visible, busy overlay gone.
    await expect(page.getByTestId('preview-canvas')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('preview-busy')).toHaveCount(0, { timeout: 30_000 });

    // Keep settings small so encoding is fast.
    await page.getByTestId('size-720').click();
    await page.getByTestId('fps-slider').fill('15');
    await page.getByTestId('duration-slider').fill('2');

    // Trigger export.
    const exportBtn = page.getByTestId('export-button');
    await expect(exportBtn).toBeEnabled();
    await exportBtn.click();

    // Encoding overlay should appear.
    await expect(page.getByTestId('preview-busy')).toBeVisible({ timeout: 60_000 });

    // Wait for the <video> to appear (export done).
    const video = page.getByTestId('preview-video');
    await expect(video).toBeVisible({ timeout: 60_000 });
    const src = await video.getAttribute('src');
    expect(src).toMatch(/^blob:/);

    // No JS errors during the whole pipeline.
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('re-export after first export does not crash (detached-buffer regression)', async ({ page }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await dropFiles(page);
    await expect(page.getByTestId('preview-canvas')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('preview-busy')).toHaveCount(0, { timeout: 30_000 });

    await page.getByTestId('size-720').click();
    await page.getByTestId('fps-slider').fill('15');
    await page.getByTestId('duration-slider').fill('2');

    // First export.
    await page.getByTestId('export-button').click();
    await expect(page.getByTestId('preview-video')).toBeVisible({ timeout: 120_000 });

    // Trigger a state change that returns us to the canvas preview, then re-export.
    await page.getByTestId('fps-slider').fill('20');
    await expect(page.getByTestId('preview-canvas')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('export-button').click();
    await expect(page.getByTestId('preview-video')).toBeVisible({ timeout: 120_000 });

    expect(errors, errors.join('\n')).toEqual([]);
  });
});
