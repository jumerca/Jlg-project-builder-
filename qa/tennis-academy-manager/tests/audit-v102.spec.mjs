import { test, expect } from '@playwright/test';
import { academy, recruitment, negotiate, favorableOffer } from './helpers.mjs';

test.beforeEach(async ({ page }) => { await academy(page); });

async function tab(page, name) {
  const el=page.locator('#td5Director .td5-tabs [data-tab="'+name+'"]');
  await expect(el).toBeVisible();
  await el.click();
  await expect(page.locator('#td5Director .td5-page')).toBeVisible();
}
const bank = () => {
  const a=window.__TennisDynastyCore.getCareer();
  return {funds:a.funds, week:a.week, year:a.year, courts:a.courts};
};
async function snapshot(page) {
  return page.evaluate(bank);
}

test('V10.2 inventaire visuel des actions dans chaque écran académique', async ({ page }) => {
  const tabs=['direction','staff','facilities','finance','health'];
  for (const key of tabs) {
    await tab(page,key);
    const items=await page.locator('#td5Director .td5-page button').evaluateAll(nodes=>nodes.map(b=>({label:b.textContent?.trim(),attrs:[...b.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]),disabled:b.disabled,hidden:getComputedStyle(b).display==='none'})));
    console.log('V102_BUTTON_INVENTORY '+key+' '+JSON.stringify(items));
    expect(items.length,'Aucun bouton dans '+key).toBeGreaterThan(0);
    expect(items.filter(x=>!x.hidden).length,'Aucun bouton visible dans '+key).toBeGreaterThan(0);
  }
});

test('V10.2 un bouton de recrutement historique mène à un marché unique', async ({ page }) => {
  await tab(page,'staff');
  const buttons=page.locator('#td5Director .td5-page button');
  const action=buttons.filter({hasText:/recruter|candidat|négocier/i}).first();
  await expect(action).toBeVisible();
  await action.click();
  await expect(page.locator('#tamRecruit10')).toBeVisible();
  await expect(page.locator('#tamRecruit10 [data-screen]')).toHaveCount(4);
  await page.locator('#tamRecruit10 [data-back]').click();
  await expect(page.locator('#td5Director')).toBeVisible();
});

test('V10.2 catalogue des bâtiments préservé et devis réactif', async ({ page }) => {
  await tab(page,'facilities');
  const content=page.locator('#td5Director .td5-page');
  const text=await content.innerText();
  console.log('V102_FACILITY_UI '+text.slice(0,1000));
  const controls=content.getByRole('button');
  expect(await controls.count(),'Catalogue installations vide').toBeGreaterThanOrEqual(8);
  const before=await snapshot(page);
  const btn=controls.filter({hasText:/construire|agrandir|développer|devis|installer|investir|bâtir/i}).first();
  await expect(btn).toBeVisible();
  await btn.click();
  const after=await snapshot(page);
  const modal=page.locator('[role="dialog"]:visible, .td5-modal:visible, #td5Neg:visible');
  const visibleModal=await modal.count()>0;
  const change=after.funds!==before.funds||after.courts!==before.courts;
  console.log('V102_FACILITY_CLICK '+JSON.stringify({before,after,visibleModal}));
  expect(visibleModal||change,'Clic Construction sans fenêtre ni changement d’état').toBe(true);
});

test('V10.2 une négociation refusée ne peut créer un contrat', async ({ page }) => {
  await recruitment(page);
  await negotiate(page);
  const before=await snapshot(page);
  const contractCount=await page.evaluate(()=>JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}').staff?.length||0);
  await page.locator('#recSalary').fill('0');
  await page.locator('#recBonus').fill('0');
  await page.locator('#recHousing').selectOption('none');
  await page.locator('#recBenefit').selectOption('none');
  await page.locator('#recSend').click();
  await expect(page.locator('#recSign')).toBeHidden();
  const after=await snapshot(page);
  expect(after.funds).toBe(before.funds);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}').staff?.length||0)).toBe(contractCount);
});

test('V10.2 recruter, recharger, retourner au recrutement et éviter les doublons', async ({ page }) => {
  await recruitment(page);
  await page.locator('#recJob').selectOption('coach');
  await negotiate(page);
  await favorableOffer(page);
  await page.locator('#recSign').click();
  await expect(page.locator('#recruitModal')).toHaveCount(0);
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}').staff?.filter(x=>x.role==='coach')||[]);
  expect(before).toHaveLength(1);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__TennisDynastyCore?.getCareer?.());
  const after=await page.evaluate(()=>({
    staff:JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}').staff?.filter(x=>x.role==='coach')||[],
    legacy:JSON.parse(localStorage.getItem('tennis_dynasty_director_v5')||'{}').staff?.filter(x=>x.role==='coach')||[]
  }));
  expect(after.staff).toHaveLength(1);
  expect(after.legacy).toHaveLength(1);
  await page.evaluate(()=>document.querySelector('[data-td-nav="academy"],[data-td21-go="academy"]')?.click());
  await expect(page.locator('#tam101Recruit')).toBeVisible();
  await page.locator('#tam101Recruit').click();
  await page.locator('#recJob').selectOption('coach');
  await expect(page.locator('#tamRecruit10')).toContainText(/poste déjà pourvu/i);
});

test('V10.2 salaires des joueurs appliqués sur plusieurs semaines et conservés', async ({ page }) => {
  await recruitment(page,'pro');
  await negotiate(page);
  await favorableOffer(page);
  await page.locator('#recSign').click();
  await expect(page.locator('#recruitModal')).toHaveCount(0);
  const pre=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}');
    const c=window.__TennisDynastyCore.getCareer();
    return {week:(c.year-1)*52+c.week,monthly:s.players[0].monthly,entries:s.payroll101?.length||0};
  });
  await page.evaluate(()=>window.__TennisDynastyCore.getCareer().advance(3));
  const post=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}');
    const c=window.__TennisDynastyCore.getCareer();
    return {week:(c.year-1)*52+c.week,log:s.payroll101?.[0],entries:s.payroll101?.length||0};
  });
  expect(post.week-pre.week).toBe(3);
  expect(post.entries-pre.entries).toBe(1);
  expect(post.log.weeks).toBe(3);
  expect(post.log.amount).toBeGreaterThan(0);
  // Écart toléré d’un euro à cause des arrondis comptables par avance.
  expect(Math.abs(post.log.amount-pre.monthly*36/52)).toBeLessThanOrEqual(2);
  await page.reload({waitUntil:'domcontentloaded'});
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}').payroll101?.[0]);
  expect(persisted.amount).toBe(post.log.amount);
});

test('V10.2 les calendriers restent accessibles après navigation par recrutement', async ({ page }) => {
  await page.locator('#tam101Recruit').click();
  await page.locator('#tamRecruit10 [data-screen="junior"]').click();
  await page.locator('#tamRecruit10 [data-back]').click();
  await expect(page.locator('#td5Director')).toBeVisible();
  await expect(page.locator('#tam8CalendarTab')).toBeAttached();
  await page.locator('#tam8CalendarTab').click();
  await expect(page.locator('#tam8CalendarPanel')).toBeVisible();
  await expect(page.locator('#tam8CalendarPanel')).toContainText(/calendrier/i);
});
