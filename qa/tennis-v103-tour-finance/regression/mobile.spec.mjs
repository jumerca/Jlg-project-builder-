import { test, expect } from '@playwright/test';
import { academy, recruitment, negotiate } from './helpers.mjs';

test('les négociations restent utilisables au format Android', async ({ page }, info) => {
  test.skip(info.project.name !== 'android-chromium', 'Contrôle Android uniquement');
  await academy(page);
  await recruitment(page);
  await negotiate(page);
  await page.locator('#recSalary').fill('9000');
  await expect(page.locator('#recMood')).toContainText('/100');
  const overflow = await page.evaluate(() => {
    const el = document.querySelector('#recruitModal .rec-dialog');
    return el ? el.scrollWidth > el.clientWidth + 5 : true;
  });
  expect(overflow, 'La négociation déborde horizontalement sur mobile').toBe(false);
});
