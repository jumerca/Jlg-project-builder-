import { test, expect } from '@playwright/test';
import { academy, recruitment, negotiate, favorableOffer } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  await academy(page);
  await recruitment(page);
});

test('chaque onglet de recrutement répond', async ({ page }) => {
  for (const part of ['staff', 'junior', 'pro', 'contracts']) {
    await page.locator('#tamRecruit10 [data-screen="' + part + '"]').click();
    if (part !== 'contracts') await expect(page.locator('#tamRecruit10 [data-candidate]').first()).toBeVisible();
    else await expect(page.locator('#tamRecruit10')).toContainText('Contrats');
  }
});

test('chaque métier ouvre un candidat et une fenêtre de négociation', async ({ page }) => {
  const roles = await page.locator('#recJob option').evaluateAll(list => list.map(x => x.value));
  expect(roles.length, 'Il manque des métiers').toBeGreaterThanOrEqual(18);
  for (const role of roles) {
    await page.locator('#recJob').selectOption(role);
    await negotiate(page);
    await page.locator('#recSalary').fill('6500');
    await expect(page.locator('#recMood')).toContainText('/100');
    await page.locator('#recruitModal [data-modal="close"]').click();
    await expect(page.locator('#recruitModal')).toHaveCount(0);
  }
});

test('un entraîneur signé coûte de l’argent et reste après rechargement', async ({ page }) => {
  await page.locator('#recJob').selectOption('coach');
  await negotiate(page);
  const before = await page.evaluate(() => window.__TennisDynastyCore.getCareer().funds);
  await favorableOffer(page);
  await page.locator('#recSign').click();
  await expect(page.locator('#recruitModal')).toHaveCount(0);
  const state = await page.evaluate(() => {
    const recruits = JSON.parse(localStorage.getItem('tennis_academy_recruit_v10') || '{}');
    const management = JSON.parse(localStorage.getItem('tennis_dynasty_director_v5') || '{}');
    return { contract: recruits.staff?.find(x => x.role === 'coach'), legacy: management.staff?.find(x => x.role === 'coach'), funds: window.__TennisDynastyCore.getCareer().funds };
  });
  expect(state.contract).toBeTruthy();
  expect(state.legacy).toBeTruthy();
  expect(state.funds).toBeLessThan(before);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tennis_academy_recruit_v10') || '{}').staff?.some(x => x.role === 'coach'))).toBe(true);
});

test('les négociations juniors utilisent les parents et les pros les agents', async ({ page }) => {
  for (const type of ['junior', 'pro']) {
    await page.locator('#tamRecruit10 [data-screen="' + type + '"]').click();
    await negotiate(page);
    await expect(page.locator('#recruitModal')).toContainText(type === 'junior' ? /Parents|tuteurs/i : /Joueur|agence/i);
    await page.locator('#recruitModal [data-modal="close"]').click();
  }
});
