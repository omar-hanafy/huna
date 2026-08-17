import { expect, test, type Page } from '@playwright/test';

async function start({ page }: { page: Page }) {
  await page.goto('./');
  await page.getByRole('button', { name: 'تخطَّ' }).click();
  await expect(page).toHaveURL(/#\/$/);
}

test.describe('check once', () => {
  test.beforeEach(start);

  test('records a check and then offers both honest choices, blocking neither', async ({ page }) => {
    await page.goto('./#/check');
    await page.getByRole('button', { name: 'الباب' }).click();

    // Re-entering inside the window surfaces the seal rather than a refusal.
    await page.reload();
    await expect(page.getByText(/آخر فحص/)).toBeVisible();

    const passIt = page.getByRole('button', { name: /سأترك الموجة تمر/ });
    const changed = page.getByRole('button', { name: /الوضع تغيّر/ });
    await expect(passIt).toBeEnabled();
    await expect(changed).toBeEnabled();

    // Choosing to check again is always possible.
    await changed.click();
    await expect(page.getByRole('button', { name: 'الباب' })).toBeEnabled();
  });

  test('names the real-danger boundary', async ({ page }) => {
    await page.goto('./#/check');
    await expect(page.getByText(/لا تحاول تدريب نفسك على تجاهله/)).toBeVisible();
  });
});

test.describe('journal', () => {
  test.beforeEach(start);

  test('saves an entry and lists it', async ({ page }) => {
    await page.goto('./#/journal');
    await page.getByLabel('ماذا حدث قبل الاستنفار؟').fill('صوت باب');
    await page.getByLabel('ماذا توقّع عقلك أن يحدث؟').fill('حد داخل');
    await page.getByRole('button', { name: 'حفظ' }).click();

    await expect(page.getByText('صوت باب')).toBeVisible();
  });

  /** The prompts must not tell the user their thinking is faulty. */
  test('uses neutral language rather than calling the thought irrational', async ({ page }) => {
    await page.goto('./#/journal');
    const body = await page.locator('main').innerText();
    expect(body).toContain('توقّع عقلك');
    expect(body).not.toContain('غير منطقية');
    expect(body).not.toContain('خاطئة');
  });
});

test.describe('life ladder', () => {
  test.beforeEach(start);

  test('adds an activity, runs a session, and records readings', async ({ page }) => {
    await page.goto('./#/ladder');
    await page.getByRole('textbox').first().fill('الجلوس في مقهى هادئ');
    await page.getByRole('button', { name: 'إضافة' }).click();

    await expect(page.getByRole('heading', { name: 'الجلوس في مقهى هادئ' })).toBeVisible();

    await page.getByRole('button', { name: 'ابدأ الجلسة' }).click();
    await page.getByRole('button', { name: 'الدقيقة 0' }).click();
    await expect(page.getByRole('button', { name: 'الدقيقة 0' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'أنهيت النشاط' }).click();
  });

  test('states both boundaries', async ({ page }) => {
    await page.goto('./#/ladder');
    await expect(page.getByText(/لا تستخدمها لاسترجاع ذكريات مؤلمة/)).toBeVisible();
    await expect(page.getByText(/تحتاج متخصصًا معك/)).toBeVisible();
  });
});

test.describe('progress', () => {
  test.beforeEach(start);

  /** Numbers on the way to everything else invite the monitoring this reduces. */
  test('is absent from the tab bar', async ({ page }) => {
    await expect(page.locator('.tabbar').getByText('التقدّم')).toHaveCount(0);
  });

  test('withholds the rate until there is enough data to be meaningful', async ({ page }) => {
    await page.goto('./#/progress');
    await expect(page.getByText('لسه بدري على الرقم ده.')).toBeVisible();
  });

  test('can be hidden entirely without deleting anything', async ({ page }) => {
    await page.goto('./#/settings');
    const metrics = page.getByRole('checkbox', { name: 'إظهار الأرقام' });
    // click plus an explicit assertion, because uncheck() reads the DOM before
    // React has committed the re-render and then clicks again to "fix" it.
    await metrics.click();
    await expect(metrics).not.toBeChecked();

    await page.goto('./#/progress');
    await expect(page.getByText(/الأرقام مخفية حسب اختيارك/)).toBeVisible();
    await expect(page.getByText(/لم يُحذف شيء/)).toBeVisible();
  });

  test('pairs its chart with a data table rather than leaving it unreadable', async ({ page }) => {
    await page.goto('./#/progress');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.locator('.check-chart')).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe('the coping card', () => {
  test.beforeEach(start);

  test('persists what does not help, which is the field that makes it personal', async ({ page }) => {
    await page.goto('./#/card');
    await page.getByLabel('ما الذي لا يساعدني').fill('التنفس العميق');

    await page.goto('./#/');
    await page.goto('./#/card');
    await expect(page.getByLabel('ما الذي لا يساعدني')).toHaveValue('التنفس العميق');
  });
});

test.describe('settings', () => {
  test.beforeEach(start);

  test('switches the whole interface to English and flips direction', async ({ page }) => {
    await page.goto('./#/settings');
    await page.getByLabel('اللغة').selectOption('en');

    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('applies a dark theme override', async ({ page }) => {
    await page.goto('./#/settings');
    await page.getByLabel('المظهر').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('erasing data is not styled as an emergency', async ({ page }) => {
    await page.goto('./#/settings');
    const erase = page.getByRole('button', { name: 'مسح كل البيانات' });
    await expect(erase).toHaveClass(/destructive-action/);
    await expect(erase).not.toHaveClass(/danger-action/);
  });
});
