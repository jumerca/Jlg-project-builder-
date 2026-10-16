import { test, expect } from '@playwright/test';
import { boot, academy } from './helpers.mjs';

test('le site et le script de recrutement sont servis', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await expect(page.locator('body')).toContainText(/tennis|academy/i);
  const script = await page.request.get('/tennis/tam-recruit-v10.js?v=10');
  expect(script.status()).toBe(200);
  expect(await script.text()).toContain('Recruit');
  expect(errors, 'Erreurs JavaScript non gérées').toEqual([]);
});

test('la direction et les autres écrans ne sont pas remplacés', async ({ page }) => {
  await academy(page);
  await expect(page.locator('#td5Director')).toBeAttached();
  const tabs = await page.locator('#td5Director .td5-tabs button').allTextContents();
  expect(tabs.length).toBeGreaterThanOrEqual(5);
  await expect(page.locator('#tdAcademyView')).toBeAttached();
});
