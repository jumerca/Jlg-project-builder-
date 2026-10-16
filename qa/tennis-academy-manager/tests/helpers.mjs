import { expect } from '@playwright/test';

// Tous les tests utilisent des contextes Chromium temporaires, jamais la sauvegarde du joueur.
export async function boot(page) {
  const result = await page.goto('/?qa=github-actions', { waitUntil: 'domcontentloaded' });
  expect(result, 'La page doit répondre').not.toBeNull();
  expect(result.status(), 'Erreur HTTP du jeu').toBeLessThan(400);
  await page.waitForFunction(() => Boolean(window.__TennisDynastyCore?.getCareer), null, { timeout: 20000 });
}

export async function academy(page) {
  await boot(page);
  const hasCareer = () => page.evaluate(() => !!window.__TennisDynastyCore?.getCareer?.());
  if (!await hasCareer()) {
    await page.evaluate(() => {
      const name = document.querySelector('#careerName');
      if (name) {
        name.value = 'JLG Academy Test';
        name.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const btn = document.querySelector('#startCareer');
      if (!btn) throw new Error('Création impossible : #startCareer introuvable');
      btn.click();
    });
  }
  if (!await hasCareer()) {
    const dialog = page.getByRole('dialog').last();
    if (await dialog.count() && await dialog.isVisible()) {
      const academyName = dialog.locator('input').last();
      if (await academyName.count()) await academyName.fill('JLG Academy Test');
      const accept = dialog.getByRole('button', { name: /fonder|créer|valider|confirmer|démarrer/i }).last();
      if (await accept.count()) await accept.click();
    }
  }
  await page.waitForFunction(() => !!window.__TennisDynastyCore?.getCareer?.(), null, { timeout: 15000 });
  const startCash = await page.evaluate(() => window.__TennisDynastyCore.getCareer().funds);
  expect(startCash, 'Le budget initial doit être positif').toBeGreaterThan(0);
  await page.evaluate(() => {
    const academyNav = document.querySelector('[data-td-nav="academy"],[data-td21-go="academy"]');
    if (!academyNav) throw new Error('Bouton de navigation Académie absent');
    academyNav.click();
  });
  await expect(page.locator('#td5Director')).toBeAttached({ timeout: 15000 });
  await expect(page.locator('#tamRecruit10Tab')).toBeAttached({ timeout: 15000 });
}

export async function recruitment(page, type = 'staff') {
  await page.locator('#tamRecruit10Tab').evaluate(el => el.click());
  await expect(page.locator('#tamRecruit10')).toBeVisible();
  if (type !== 'staff') await page.locator('#tamRecruit10 [data-screen="' + type + '"]').click();
  await expect(page.locator('#tamRecruit10 [data-screen]')).toHaveCount(4);
}

export async function negotiate(page) {
  await expect(page.locator('#tamRecruit10 [data-candidate]').first()).toBeVisible();
  await page.locator('#tamRecruit10 [data-candidate]').first().click();
  await expect(page.locator('#recruitModal')).toBeVisible();
  await expect(page.locator('#recSalary')).toBeEditable();
}

export async function favorableOffer(page) {
  await page.locator('#recSalary').fill('18000');
  await page.locator('#recBonus').fill('12000');
  await page.locator('#recPerformance').fill('5000');
  await page.locator('#recYears').selectOption('3');
  await page.locator('#recHousing').selectOption('flat');
  await page.locator('#recBenefit').selectOption('school');
  await expect(page.locator('#recMood')).toContainText('/100');
  await page.locator('#recSend').click();
  await expect(page.locator('#recSign')).toBeVisible();
}
