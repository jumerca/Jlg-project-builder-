import { test, expect } from '@playwright/test';
import { academy, recruitment, negotiate, favorableOffer } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  await academy(page);
});

test('V10.1 : recrutement accessible par une entrée unique et anciens doublons masqués', async ({ page }) => {
  await expect(page.locator('#tam101Recruit')).toBeVisible();
  await expect(page.locator('#tam101Recruit')).toHaveCount(1);
  await expect(page.locator('#tamRecruit10Tab')).toBeHidden();
  const report = await page.evaluate(() => window.TAM101?.status());
  expect(report?.ready, 'Adaptateur V10.1 non chargé').toBe(true);
  expect(report.recruitmentEntrypoints).toBe(1);
  expect(report.nativeDuplicateHidden).toBe(true);
  await page.locator('#tam101Recruit').click();
  await expect(page.locator('#tamRecruit10')).toBeVisible();
  for (const screen of ['staff','junior','pro','contracts']) {
    await page.locator('#tamRecruit10 [data-screen="' + screen + '"]').click();
    await expect(page.locator('#tamRecruit10')).toBeVisible();
  }
  await page.locator('#tamRecruit10 [data-back]').click();
  await expect(page.locator('#td5Director')).toBeVisible();
});

test('V10.1 : inventaire de tous les onglets conservés et navigation sans disparition', async ({ page }) => {
  const tabs = await page.locator('#td5Director .td5-tabs button[data-tab]').evaluateAll(
    nodes => nodes.map(x=>({id:x.dataset.tab,text:x.textContent?.trim(),hidden:getComputedStyle(x).display==='none'}))
  );
  console.log('TENNIS_V101_NATIVE_TABS '+JSON.stringify(tabs));
  expect(tabs.length).toBeGreaterThanOrEqual(5);
  const visible = tabs.filter(x=>!x.hidden && x.id!=='match' && x.id!=='recruit');
  for(const tab of visible) {
    const button=page.locator('#td5Director .td5-tabs button[data-tab="'+tab.id+'"]');
    await button.evaluate(el=>el.click());
    await expect(page.locator('#td5Director')).toBeAttached();
    await expect(page.locator('#td5Director .td5-page')).toBeAttached();
  }
  await expect(page.locator('#tam101Recruit')).toBeVisible();
});

test('V10.1 : une négociation annulée ne modifie ni contrat ni budget', async ({ page }) => {
  await recruitment(page);
  await page.locator('#recJob').selectOption('physio');
  const before = await page.evaluate(()=>({
    money:window.__TennisDynastyCore.getCareer().funds,
    contracts:JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}').staff?.length||0
  }));
  await negotiate(page);
  await page.locator('#recSalary').fill('4500');
  await expect(page.locator('#recMood')).toContainText('/100');
  await page.locator('#recruitModal [data-modal="close"]').click();
  const after = await page.evaluate(()=>({
    money:window.__TennisDynastyCore.getCareer().funds,
    contracts:JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}').staff?.length||0
  }));
  expect(after).toEqual(before);
});

test('V10.1 : montant négatif refusé sans aucun contrat créé', async ({ page }) => {
  await recruitment(page);
  await negotiate(page);
  await page.locator('#recSalary').fill('-500');
  await page.locator('#recSend').click();
  await expect(page.locator('#recAnswer')).toContainText(/invalides/i);
  await expect(page.locator('#recSign')).toBeHidden();
});

test('V10.1 : recrutements juniors et professionnels affichent tous leurs profils', async ({ page }) => {
  await recruitment(page);
  for (const part of ['junior', 'pro']) {
    await page.locator('#tamRecruit10 [data-screen="'+part+'"]').click();
    await expect(page.locator('#tamRecruit10 [data-candidate]').first()).toBeVisible();
    const first=await page.locator('#tamRecruit10 [data-candidate]').first().getAttribute('data-candidate');
    await page.locator('#tamRecruit10 [data-page="next"]').click();
    const next=await page.locator('#tamRecruit10 [data-candidate]').first().getAttribute('data-candidate');
    expect(next).not.toBe(first);
    await page.locator('#tamRecruit10 [data-page="prev"]').click();
    await expect(page.locator('#tamRecruit10 [data-candidate]').first()).toHaveAttribute('data-candidate',first);
  }
});

test('V10.1 : joueurs professionnels, salaire hebdomadaire et sauvegarde persistants', async ({ page }) => {
  await recruitment(page,'pro');
  await negotiate(page);
  await favorableOffer(page);
  await page.locator('#recSign').click();
  await expect(page.locator('#recruitModal')).toHaveCount(0);
  const signed=await page.evaluate(()=>{
    const save=JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}');
    return {player:save.players?.[0],funds:window.__TennisDynastyCore.getCareer().funds}
  });
  expect(signed.player).toBeTruthy();
  expect(signed.player.monthly).toBeGreaterThan(0);
  const yearWeek=await page.evaluate(()=>{
    const a=window.__TennisDynastyCore.getCareer(),before=(a.year-1)*52+a.week;
    a.advance(1);
    return {before,after:(a.year-1)*52+a.week}
  });
  expect(yearWeek.after).toBeGreaterThan(yearWeek.before);
  const detail=await page.evaluate(()=>{
    const save=JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}');
    return {last:save.payroll101?.[0],recorded:save.players?.[0]?.name};
  });
  expect(detail.last?.amount,'Le salaire des nouveaux professionnels doit être prélevé').toBeGreaterThan(0);
  await page.reload({waitUntil:'domcontentloaded'});
  const stored=await page.evaluate(()=>{
    const a=JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}');
    return {players:a.players?.length,payroll:a.payroll101?.length}
  });
  expect(stored.players).toBeGreaterThan(0);
  expect(stored.payroll).toBeGreaterThan(0);
});

test('V10.1 : retour de l’académie et intégrité des écrans d’investissements', async ({ page }) => {
  const tabs=await page.locator('#td5Director .td5-tabs button[data-tab]').evaluateAll(
    nodes=>nodes.map(x=>({key:x.dataset.tab,title:x.textContent?.trim()||''}))
  );
  console.log('ACADEMY_TAB_INVENTORY '+JSON.stringify(tabs));
  const matches=tabs.filter(x=>/finance|santé|installation|court|bâtiment|construction|infrastructure/i.test(x.title+' '+x.key));
  expect(matches.length,'Les onglets principaux de l’académie ont disparu').toBeGreaterThanOrEqual(2);
  for (const item of matches) {
    const loc=page.locator('#td5Director .td5-tabs button[data-tab="'+item.key+'"]');
    if(await loc.isVisible()){
      await loc.click();
      await expect(page.locator('#td5Director .td5-page')).toBeAttached();
    }
  }
});
