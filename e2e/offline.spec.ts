import { expect, test } from '@playwright/test';

/**
 * Offline is not a nicety here. Someone reaching for this on a train or in a
 * basement has the worst connectivity at exactly the moment they most need the
 * sequence, so the whole alert flow must run with the network gone.
 *
 * Service workers are not supported in Playwright's WebKit build, so this runs
 * on Chromium only. The behaviour is verified in a real browser at deploy time.
 */
test.describe('offline', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'service workers need chromium here');

  test('runs the whole alert flow with the network disabled', async ({ page, context }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'تخطَّ' }).click();
    await expect(page).toHaveURL(/#\/$/);

    // Wait for the service worker to take control before cutting the network.
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
      timeout: 15_000,
    });

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole('link', { name: /أنا في حالة استنفار/ })).toBeVisible();

    await page.getByRole('link', { name: /أنا في حالة استنفار/ }).click();
    await page.getByRole('button', { name: 'لا يوجد خطر مباشر محدد' }).click();
    await page.getByRole('button', { name: /لم يتغيّر شيء/ }).click();
    await page.getByRole('button', { name: /أراقب الناس أو المخارج/ }).click();

    // Content JSON is precached, so the sequence text is there without a network.
    await expect(page.getByText(/انظر حولك مرة واحدة/)).toBeVisible();

    await context.setOffline(false);
  });

  test('keeps the crisis numbers available offline', async ({ page, context }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'تخطَّ' }).click();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
      timeout: 15_000,
    });

    await context.setOffline(true);
    await page.goto('./#/alert');
    await page.getByRole('button', { name: 'نعم، قد يكون هناك خطر' }).click();

    await expect(page.getByRole('link', { name: /123/ })).toBeVisible();

    await context.setOffline(false);
  });
});

test.describe('install metadata', () => {
  test('serves a manifest with maskable and apple icons under the base path', async ({ page, request }) => {
    await page.goto('./');

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBe('/huna/manifest.webmanifest');

    const response = await request.get('/huna/manifest.webmanifest');
    expect(response.ok()).toBe(true);
    const manifest = (await response.json()) as {
      start_url: string;
      icons: { src: string; purpose: string; sizes: string }[];
      shortcuts: { url: string }[];
    };

    expect(manifest.start_url).toBe('./#/');
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    expect(manifest.icons.some((icon) => icon.sizes === '512x512')).toBe(true);
    // Honoured on Android, ignored on iOS, which uses a Shortcut instead.
    expect(manifest.shortcuts[0]?.url).toBe('./#/alert');

    // SVG-only icons are why install used to be broken on iOS.
    const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect(apple).toBe('/huna/icons/apple-touch-icon.png');
    expect((await request.get('/huna/icons/apple-touch-icon.png')).ok()).toBe(true);
    expect((await request.get('/huna/icons/icon-512.png')).ok()).toBe(true);
    expect((await request.get('/huna/icons/icon-maskable-512.png')).ok()).toBe(true);
  });
});
