import { expect, test, type Page } from '@playwright/test';

async function start({ page }: { page: Page }) {
  await page.goto('./');
  await page.getByRole('button', { name: 'تخطَّ' }).click();
  await expect(page).toHaveURL(/#\/$/);
  // The navigation happens before the write lands. Anything that leaves home
  // straight away would be gated back into onboarding by the stored record.
  await page.waitForFunction(async () => {
    const request = indexedDB.open('huna');
    const db = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    const rows = await new Promise<Record<string, unknown>[]>((resolve) => {
      const query = db.transaction('preferences', 'readonly').objectStore('preferences').getAll();
      query.onsuccess = () => resolve(query.result as Record<string, unknown>[]);
    });
    db.close();
    return rows.some((row) => row.onboardingCompletedAt !== null);
  });
}

test.describe('check once', () => {
  test.beforeEach(start);

  test('records a check and then offers both honest choices, blocking neither', async ({ page }) => {
    await page.goto('./#/check');
    await page.getByRole('button', { name: 'الباب' }).click();

    // The seal appears as soon as the check is recorded, which is also how we
    // know the write landed before reloading.
    await expect(page.getByText(/آخر فحص/)).toBeVisible();

    // It survives a reload: the seal is stored, not held in component state.
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
    await expect(page.getByText('ما زال مبكرًا على هذا الرقم.')).toBeVisible();
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

  /**
   * A number changes, or a person leaves someone's life. Trusted contacts used
   * to be editable during onboarding only, which left the safety screen
   * offering a number the user could no longer correct.
   */
  test('lets a trusted contact be added and removed after onboarding', async ({ page }) => {
    await page.goto('./#/settings');
    await page.getByLabel('الاسم').fill('أمي');
    await page.getByLabel('الرقم').fill('0100000000');
    await page.getByRole('button', { name: 'إضافة' }).click();

    await page.goto('./#/alert');
    await page.getByRole('button', { name: 'نعم، قد يكون هناك خطر' }).click();
    await expect(page.getByRole('link', { name: /اتصال بـ أمي/ })).toBeVisible();

    await page.goto('./#/settings');
    await page.getByRole('button', { name: 'حذف' }).click();
    await expect(page.getByText('0100000000')).toHaveCount(0);
  });
});

test.describe('the daily routine', () => {
  test.beforeEach(start);

  /**
   * Real data loss: two fields edited seconds apart shared one pending write,
   * so the first one was discarded without a trace.
   */
  test('keeps every evening field that was filled in', async ({ page }) => {
    await page.goto('./#/today');
    await page.getByLabel('ساعات النوم').fill('7');
    await page.getByLabel('مدة العودة بعد موجة').fill('30');
    await page.getByLabel('أكثر شيء ساعدني اليوم').fill('المشي');

    // The screen promises it saves by itself, so wait for the store rather than
    // for a stopwatch: under load a fixed pause is either too short or a lie.
    await expect(page.getByText('محفوظ تلقائيًا على جهازك')).toBeVisible();
    await page.waitForFunction(async () => {
      const open = indexedDB.open('huna');
      const db = await new Promise<IDBDatabase>((resolve) => {
        open.onsuccess = () => resolve(open.result);
      });
      const days = await new Promise<
        { sleepHours: number | null; recoveryMinutes: number | null; note: string }[]
      >((resolve) => {
        const request = db.transaction('days', 'readonly').objectStore('days').getAll();
        request.onsuccess = () => resolve(request.result);
      });
      db.close();
      return days.some((day) => day.sleepHours === 7 && day.recoveryMinutes === 30 && day.note === 'المشي');
    });

    await page.goto('./#/');
    await page.goto('./#/today');

    // A generous timeout on purpose: the fields fill in from a fresh IndexedDB
    // read after two navigations, and on a machine running three browsers at
    // once that read is slow rather than broken.
    const restored = { timeout: 15_000 };
    await expect(page.getByLabel('ساعات النوم')).toHaveValue('7', restored);
    await expect(page.getByLabel('مدة العودة بعد موجة')).toHaveValue('30', restored);
    await expect(page.getByLabel('أكثر شيء ساعدني اليوم')).toHaveValue('المشي', restored);
  });

  /** Home and Today counted the same routine differently: "1 of 6" against "1 of 3". */
  test('shows the same count on the home screen as on the day itself', async ({ page }) => {
    await page.goto('./#/today');
    await page.getByRole('button', { name: /يوم مزدحم/ }).click();
    const counter = page.locator('.today__head .step-count');
    await expect(counter).toHaveText(/0 من 4/);

    await page.goto('./#/');
    await expect(page.locator('.home-routine .step-count')).toHaveText(/0 من 4/);
  });
});

test.describe('onboarding', () => {
  /**
   * The worst defect found in testing: reopening onboarding after finishing it
   * and tapping skip once wrote fresh defaults over the trusted contacts, the
   * breathing answer, and the country.
   */
  test('cannot be re-entered to overwrite what was already answered', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'تخطَّ' }).click();
    await expect(page).toHaveURL(/#\/$/);

    await page.goto('./#/settings');
    await page.getByLabel('الاسم').fill('صديق');
    await page.getByLabel('الرقم').fill('0111111111');
    await page.getByRole('button', { name: 'إضافة' }).click();
    await expect(page.getByText('0111111111')).toBeVisible();

    await page.goto('./#/onboarding');
    await expect(page).toHaveURL(/#\/$/);

    await page.goto('./#/settings');
    await expect(page.getByText('0111111111')).toBeVisible();
  });
});
