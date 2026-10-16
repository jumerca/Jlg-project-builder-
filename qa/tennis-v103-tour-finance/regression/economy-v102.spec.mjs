import { test, expect } from '@playwright/test';
import { academy, recruitment, negotiate, favorableOffer } from './helpers.mjs';

test.beforeEach(async ({ page }) => { await academy(page); });

async function state(page) {
  return page.evaluate(() => {
    const core=window.__TennisDynastyCore.getCareer();
    const native=JSON.parse(localStorage.getItem('tennis_dynasty_director_v5')||'{}');
    const recruit=JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}');
    return {funds:core.funds,week:(core.year-1)*52+core.week,courts:core.courts,staff:native.staff||[],facilities:native.facilities||{},contracts:recruit.staff||[],players:recruit.players||[],ledger:native.ledger||[]};
  });
}
async function tab(page, code) {
  const el=page.locator('#td5Director .td5-tabs button[data-tab="'+code+'"]');
  await el.click();
  await expect(page.locator('#td5Director .td5-page')).toBeVisible();
}

test('V10.2 finances: salaire réel du coach payé chaque semaine, même après rechargement',async({page})=>{
  const first=await state(page);
  await page.evaluate(()=>window.__TennisDynastyCore.getCareer().advance(1));
  const without=await state(page);
  const baseline=first.funds-without.funds;
  console.log('PAYROLL_BASELINE '+JSON.stringify({baseline,first:first.funds,without:without.funds}));
  await recruitment(page);
  await page.locator('#recJob').selectOption('coach');
  await negotiate(page);
  await favorableOffer(page);
  await page.locator('#recSign').click();
  await expect(page.locator('#recruitModal')).toHaveCount(0);
  let hired=await state(page);
  expect(hired.contracts.filter(x=>x.role==='coach')).toHaveLength(1);
  expect(hired.staff.filter(x=>x.role==='coach')).toHaveLength(1);
  const coach=hired.staff.find(x=>x.role==='coach');
  expect(coach.monthly).toBeGreaterThan(10000);
  console.log('PAYROLL_CONTRACT '+JSON.stringify(coach));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__TennisDynastyCore?.getCareer?.());
  await page.evaluate(()=>window.__TennisDynastyCore.getCareer().advance(1));
  const later=await state(page);
  const paid=hired.funds-later.funds;
  console.log('PAYROLL_AFTER_RELOAD '+JSON.stringify({baseline,paid,monthly:coach.monthly,staff:later.staff.length,week:later.week,ledger:later.ledger.at(0)}));
  expect(later.staff.filter(x=>x.role==='coach')).toHaveLength(1);
  expect(paid-baseline,'Un salaire élevé doit se traduire par une dépense hebdomadaire significative').toBeGreaterThan(coach.monthly/4.33-250);
  expect(paid-baseline,'Le salaire ne doit pas être débité deux fois').toBeLessThan(coach.monthly/4.33+350);
  await page.reload({waitUntil:'domcontentloaded'});
  const last=await state(page);
  expect(last.staff.filter(x=>x.role==='coach')).toHaveLength(1);
  expect(last.funds).toBe(later.funds);
});

test('V10.2 bâtiments: un investissement est persistant et ne peut être débité deux fois au rechargement',async({page})=>{
  await tab(page,'facilities');
  const previous=await state(page);
  const build=page.locator('#td5Director .td5-page button').filter({hasText:/construire|agrandir|développer|investir|bâtir/i}).first();
  await expect(build).toBeVisible();
  await build.click();
  const built=await state(page);
  expect(built.funds).toBeLessThan(previous.funds);
  console.log('BUILDING_STATE_BEFORE_RELOAD '+JSON.stringify({previous:{funds:previous.funds,courts:previous.courts,facilities:previous.facilities},built:{funds:built.funds,courts:built.courts,facilities:built.facilities}}));
  await page.reload({waitUntil:'domcontentloaded'});
  const reloaded=await state(page);
  expect(reloaded.funds,'Trésorerie modifiée après rechargement du bâtiment').toBe(built.funds);
  expect(reloaded.courts,'Le nouveau terrain a disparu au rechargement').toBe(built.courts);
  expect(reloaded.facilities,'Les bâtiments enregistrés ont changé').toEqual(built.facilities);
});

test('V10.2 junior: signature par les parents enregistrée et sauvegardée dans l’académie',async({page})=>{
  await recruitment(page,'junior');
  await negotiate(page);
  await favorableOffer(page);
  const cash=await state(page);
  await page.locator('#recSign').click();
  await expect(page.locator('#recruitModal')).toHaveCount(0);
  let done=await state(page);
  expect(done.players.filter(x=>x.age<18)).toHaveLength(1);
  expect(done.funds).toBeLessThan(cash.funds);
  const athletes=await page.evaluate(()=>window.__TennisDynastyCore.getCareer().academyV2.prospects.map(x=>x.id));
  expect(athletes).toContain(done.players[0].id);
  await page.reload({waitUntil:'domcontentloaded'});
  done=await state(page);
  expect(done.players.filter(x=>x.age<18)).toHaveLength(1);
  const after=await page.evaluate(()=>window.__TennisDynastyCore.getCareer().academyV2.prospects.map(x=>x.id));
  expect(after).toContain(done.players[0].id);
});
