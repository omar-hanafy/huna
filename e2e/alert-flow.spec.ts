import { expect, test, type Page } from '@playwright/test';

/**
 * The alert flow is the product. These tests exercise it the way it will
 * actually be used: opened directly, answered honestly, and left quickly.
 */

async function completeOnboarding(page: Page) {
  await page.goto('./');
  // Onboarding is skippable from any step, which is itself the requirement.
  await page.getByRole('button', { name: 'تخطَّ' }).click();
  await expect(page.getByRole('link', { name: /أنا في حالة استنفار/ })).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);
}

test.describe('the alert flow', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test('runs from the alarm button to a chosen next action', async ({ page }) => {
    await page.getByRole('link', { name: /أنا في حالة استنفار/ }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('خطر مباشر');
    await page.getByRole('button', { name: 'لا يوجد خطر مباشر محدد' }).click();

    // The seal, confirming the check was recorded.
    await expect(page.getByText('تحقّقت مرة واحدة')).toBeVisible();
    await page.getByRole('button', { name: /لم يتغيّر شيء/ }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('ما أقوى شيء');
    await page.getByRole('button', { name: /أراقب الناس أو المخارج/ }).click();

    // One instruction per screen, walked to the end.
    for (let step = 0; step < 5; step += 1) {
      await expect(page.getByText(/الخطوة \d+ من 5/)).toBeVisible();
      await page.getByRole('button', { name: /الخطوة التالية|أنهيت التمرين/ }).click();
    }

    await expect(page.getByRole('heading', { level: 1 })).toContainText('الفعل الصغير');
    await page.getByRole('button', { name: /امشِ برفق لدقيقتين/ }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('أكملت التمرين');
    // No celebration: completion is quiet by design.
    await expect(page.getByText(/ارجع لحياتك الآن/)).toBeVisible();
  });

  /** The most important branch in the product. */
  test('routes "not sure" to safety mode rather than to grounding', async ({ page }) => {
    await page.goto('./#/alert');
    await page.getByRole('button', { name: 'لست متأكدًا' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('أمانك');
    await expect(page.getByText(/لا يستطيع أن يعرف/)).toBeVisible();
  });

  test('routes "yes" to safety mode and offers a verified number', async ({ page }) => {
    await page.goto('./#/alert');
    await page.getByRole('button', { name: 'نعم، قد يكون هناك خطر' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('أمانك');
    // Verified Egyptian ambulance number, offered as a link and never dialled.
    const call = page.getByRole('link', { name: /123/ });
    await expect(call).toBeVisible();
    await expect(call).toHaveAttribute('href', 'tel:123');
  });

  test('shows the seal on re-entry and never blocks a re-check', async ({ page }) => {
    await page.goto('./#/alert');
    await page.getByRole('button', { name: 'لا يوجد خطر مباشر محدد' }).click();
    await expect(page.getByText('تحقّقت مرة واحدة')).toBeVisible();

    // Re-entering inside the reminder window surfaces the seal first.
    await page.goto('./#/');
    await page.getByRole('link', { name: /أنا في حالة استنفار/ }).click();
    await expect(page.getByText(/تحقّقت الساعة/)).toBeVisible();

    // Both choices lead somewhere; neither is disabled.
    await page.getByRole('button', { name: /الوضع تغيّر/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('خطر مباشر');
  });

  test('resumes at the right step after a reload', async ({ page }) => {
    await page.goto('./#/alert');
    await page.getByRole('button', { name: 'لا يوجد خطر مباشر محدد' }).click();
    await page.getByRole('button', { name: /لم يتغيّر شيء/ }).click();
    await page.getByRole('button', { name: /صوت أو حركة أفزعتني/ }).click();
    await expect(page.getByText(/الخطوة 1 من 5/)).toBeVisible();

    await page.reload();

    // Back on the sequence, not back at the safety question.
    await expect(page.getByText(/الخطوة 1 من 5/)).toBeVisible();
  });

  test('records "nothing right now" as a real choice, not a refusal', async ({ page }) => {
    await page.goto('./#/alert');
    await page.getByRole('button', { name: 'لا يوجد خطر مباشر محدد' }).click();
    await page.getByRole('button', { name: /لم يتغيّر شيء/ }).click();
    await page.getByRole('button', { name: /لا أعرف، أشعر فقط أنني على الحافة/ }).click();

    for (let step = 0; step < 5; step += 1) {
      await page.getByRole('button', { name: /الخطوة التالية|أنهيت التمرين/ }).click();
    }

    await page.getByRole('button', { name: 'لا شيء الآن' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('أكملت التمرين');
  });
});

test.describe('breathing preference', () => {
  /**
   * The load-bearing onboarding answer: it must change content, not merely
   * reorder it.
   */
  test('removes every breathing step and hides the breathing tool', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'التالي' }).click();
    await page.getByRole('button', { name: 'يزيد التوتر' }).click();
    await page.getByRole('button', { name: 'تخطَّ' }).click();
    // The redirect only happens once the preference has been written.
    await expect(page).toHaveURL(/#\/$/);

    await page.goto('./#/tools');
    await expect(page.getByText(/أخفينا أداة التنفّس/)).toBeVisible();
    await expect(page.getByRole('tab', { name: 'التنفّس' })).toHaveCount(0);

    // The startled sequence normally contains a breath step; it must not now.
    await page.goto('./#/alert');
    await page.getByRole('button', { name: 'لا يوجد خطر مباشر محدد' }).click();
    await page.getByRole('button', { name: /لم يتغيّر شيء/ }).click();
    await page.getByRole('button', { name: /صوت أو حركة أفزعتني/ }).click();

    for (let step = 0; step < 5; step += 1) {
      await expect(page.getByText(/شهيق|الزفير أطول/)).toHaveCount(0);
      await page.getByRole('button', { name: /الخطوة التالية|أنهيت التمرين/ }).click();
    }
  });
});
