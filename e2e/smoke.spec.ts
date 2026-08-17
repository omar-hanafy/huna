import { expect, test } from '@playwright/test';

test.describe('application shell', () => {
  test('boots, renders in Arabic RTL, and serves from the project base path', async ({ page }) => {
    await page.goto('./');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'ar');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // The root must actually mount something; a white screen would pass a
    // naive title assertion.
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('loads its own stylesheet rather than falling back to unstyled HTML', async ({ page }) => {
    await page.goto('./');
    const bodyBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bodyBackground).not.toBe('rgba(0, 0, 0, 0)');
  });
});
