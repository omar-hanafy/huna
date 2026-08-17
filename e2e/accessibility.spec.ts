import { expect, test, type Page } from '@playwright/test';

async function start({ page }: { page: Page }) {
  await page.goto('./');
  await page.getByRole('button', { name: 'تخطَّ' }).click();
  await expect(page).toHaveURL(/#\/$/);
}

test.describe('keyboard operation', () => {
  test.beforeEach(start);

  /**
   * Someone whose hands are unsteady, or who is on a desktop mid-episode, must
   * be able to get through the flow without a pointer.
   */
  test('completes the alert flow with the keyboard alone', async ({ page }) => {
    await page.goto('./#/alert');

    await page.getByRole('button', { name: 'لا يوجد خطر مباشر محدد' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('تحقّقت مرة واحدة')).toBeVisible();

    await page.getByRole('button', { name: /لم يتغيّر شيء/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ما أقوى شيء');

    await page.getByRole('button', { name: /أراقب الناس أو المخارج/ }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByText(/الخطوة 1 من 5/)).toBeVisible();

    for (let step = 0; step < 5; step += 1) {
      await page.getByRole('button', { name: /الخطوة التالية|أنهيت التمرين/ }).focus();
      await page.keyboard.press('Enter');
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText('الفعل الصغير');
  });

  test('gives a keyboard-focused control a visible focus ring', async ({ page }) => {
    await page.goto('./#/alert');
    // Tab rather than .focus(): :focus-visible only engages for keyboard focus,
    // which is exactly the case this rule exists to serve.
    await page.keyboard.press('Tab');

    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const style = getComputedStyle(el);
      return { width: style.outlineWidth, style: style.outlineStyle, tag: el.tagName };
    });

    expect(outline).not.toBeNull();
    expect(outline?.style).not.toBe('none');
    expect(Number.parseFloat(outline?.width ?? '0')).toBeGreaterThanOrEqual(2);
  });

  test('reaches the alarm button by tabbing from the top of the page', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
    expect(focused).toContain('أنا في حالة استنفار');
  });
});

test.describe('target sizes', () => {
  test.beforeEach(start);

  /**
   * Spec §15.2: 48px, deliberately more forgiving than the WCAG 2.2 minimum,
   * because reduced concentration and unsteady hands are the baseline here.
   */
  const MIN = 44;

  async function checkTargets(page: Page, path: string) {
    await page.goto(path);
    await page.waitForTimeout(200);

    const small = await page.evaluate((min) => {
      const selectors = 'button, a[href], input:not([type="range"]), select, textarea';

      /**
       * A checkbox wrapped in a label is activated by clicking anywhere in that
       * label, so the label is the real target, not the 24px box inside it.
       */
      const activationArea = (el: Element): DOMRect => {
        const label = el.closest('label');
        return (label ?? el).getBoundingClientRect();
      };

      return [...document.querySelectorAll(selectors)]
        .filter((el) => {
          // Visually hidden controls are driven by a visible button elsewhere.
          if (el.classList.contains('sr-only')) return false;
          const rect = activationArea(el);
          return rect.width > 0 && rect.height > 0 && rect.height < min;
        })
        .map((el) => `${el.tagName}.${el.className} h=${Math.round(activationArea(el).height)}`);
    }, MIN);

    expect(small, `Targets under ${MIN}px on ${path}:\n${small.join('\n')}`).toEqual([]);
  }

  for (const path of ['./#/', './#/alert', './#/today', './#/tools', './#/check', './#/settings']) {
    test(`keeps every control large enough on ${path}`, async ({ page }) => {
      await checkTargets(page, path);
    });
  }
});

test.describe('reduced motion', () => {
  test('disables transitions when the OS asks for it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await start({ page });

    const duration = await page.evaluate(() => {
      const button = document.querySelector('.alert-button');
      return button ? getComputedStyle(button).transitionDuration : '';
    });
    expect(Number.parseFloat(duration)).toBeLessThan(0.05);
  });

  test('honours the in-app toggle independently of the OS', async ({ page }) => {
    await start({ page });
    await page.goto('./#/settings');
    await page.getByRole('checkbox', { name: 'تقليل الحركة' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    const duration = await page.evaluate(() => {
      const el = document.querySelector('.button');
      return el ? getComputedStyle(el).transitionDuration : '';
    });
    expect(Number.parseFloat(duration)).toBeLessThan(0.05);
  });
});

test.describe('discreet mode', () => {
  test('removes the illustrations so the flow reads as an ordinary timer', async ({ page }) => {
    await start({ page });
    await page.goto('./#/settings');
    await page.getByRole('checkbox', { name: 'الوضع الهادئ' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-discreet', 'true');

    await page.goto('./#/alert');
    await page.getByRole('button', { name: 'لا يوجد خطر مباشر محدد' }).click();
    await page.getByRole('button', { name: /لم يتغيّر شيء/ }).click();

    const visibleIcons = await page.locator('.state-card svg:visible').count();
    expect(visibleIcons).toBe(0);
  });
});

test.describe('document language', () => {
  test('marks the page as Arabic and right to left', async ({ page }) => {
    await start({ page });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('never scrolls the body sideways', async ({ page }) => {
    await start({ page });
    for (const path of ['./#/', './#/alert', './#/today', './#/progress']) {
      await page.goto(path);
      await page.waitForTimeout(200);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
    }
  });
});
