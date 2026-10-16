import { test, expect } from '@playwright/test';
import { academy, recruitment, negotiate, favorableOffer } from './helpers.mjs';

async function signedJunior(page){
  await recruitment(page,'junior');
  await negotiate(page);
  await favorableOffer(page);
  await page.locator('#recSign').click();
  await expect(page.locator('#recruitModal')).toHaveCount(0);
  await page.locator('#tamRecruit10 [data-back]').click();
  await expect(page.locator('#td5Director')).toBeVisible();
  await expect(page.locator('#tm103Tab')).toBeVisible();
}
async function tour(page){
  await page.locator('#tm103Tab').click();
  await expect(page.locator('#tm103Tours')).toBeVisible();
  await expect(page.locator('#tm103Player')).toBeVisible();
}
async function data(page){
  return page.evaluate(()=>({
    funds:window.__TennisDynastyCore.getCareer().funds,
    time:(window.__TennisDynastyCore.getCareer().year-1)*52+window.__TennisDynastyCore.getCareer().week,
    tours:JSON.parse(localStorage.getItem('tennis_academy_tours_v103')||'{}')
  }));
}
test.beforeEach(async({page})=>{await academy(page)});

test('V10.3 catalogue accessible et toutes les fonctions historiques conservées',async({page})=>{
  await expect(page.locator('#tm103Tab')).toBeVisible();
  await expect(page.locator('#tam101Recruit')).toBeVisible();
  await expect(page.locator('#tam8CalendarTab')).toBeAttached();
  const status=await page.evaluate(()=>window.TAM103?.status());
  expect(status?.ready).toBe(true);
  const events=await page.evaluate(()=>window.TAM103.events());
  expect(events.filter(x=>x.kind==='junior')).toHaveLength(6);
  expect(events.filter(x=>x.kind==='pro')).toHaveLength(6);
  await page.locator('#tm103Tab').click();
  await expect(page.locator('#tm103Tours')).toBeVisible();
  await expect(page.locator('#tm103Tours')).toContainText('Aucun joueur');
  await page.locator('#tm103Back').click();
  await expect(page.locator('#td5Director')).toBeVisible();
  await page.locator('#td5Director [data-tab="facilities"]').click();
  await expect(page.locator('#td5Director .td5-page')).toContainText(/infrastructures|travaux/i);
});

test('V10.3 juniors: financement partagé interdit sans accord, puis engagement et débit unique',async({page})=>{
  await signedJunior(page); await tour(page);
  await page.locator('#tm103Event').selectOption('j-barcelona');
  await page.locator('#tm103Share').selectOption('75');
  await expect(page.locator('#tm103Agreement')).toBeVisible();
  const before=await data(page);
  const quoted=await page.locator('#tm103Fund').innerText();
  await page.locator('#tm103Fund').click();
  await expect(page.locator('#tm103Message')).toContainText(/accord|participation/i);
  let attempted=await data(page);expect(attempted.funds).toBe(before.funds);
  expect(attempted.tours.bookings||[]).toHaveLength(0);
  await page.locator('#tm103Agreement').check();
  await page.locator('#tm103Fund').click();
  const after=await data(page);expect(after.tours.bookings).toHaveLength(1);
  const b=after.tours.bookings[0];
  expect(b.kind).toBe('junior');
  expect(b.share).toBe(75);
  expect(b.breakdown.external).toBeGreaterThan(0);
  expect(b.breakdown.sponsor).toBeGreaterThanOrEqual(0);
  expect(after.funds).toBe(before.funds-b.breakdown.academy);
  await expect(page.locator('#tm103Fund')).toBeDisabled();
  expect(quoted).toContain('Engager');
  await page.reload({waitUntil:'domcontentloaded'});
  const persisted=await data(page);
  expect(persisted.tours.bookings).toHaveLength(1);
  expect(persisted.funds).toBe(after.funds);
});

test('V10.3 juniors: simulation à l’échéance, progression, fatigue et aucun prize money',async({page})=>{
  await signedJunior(page);await tour(page);
  await page.locator('#tm103Event').selectOption('j-barcelona');
  await page.locator('#tm103Fund').click();
  const booked=await data(page),b=booked.tours.bookings[0];
  expect(b.status).toBe('planned');
  const delta=b.eventWeek-booked.time;
  expect(delta).toBeGreaterThan(0);
  await page.evaluate(n=>window.__TennisDynastyCore.getCareer().advance(n),delta);
  const done=await data(page);const result=done.tours.bookings[0];
  expect(result.status).toBe('done');
  expect(result.prize,'Les tournois juniors ne rapportent pas de prize money').toBe(0);
  expect(result.xp).toBeGreaterThan(0);
  expect(result.fatigue).toBeGreaterThan(0);
  const person=await page.evaluate(id=>window.__TennisDynastyCore.getCareer().academyV2.prospects.find(x=>String(x.id)===id),b.playerId);
  expect(person).toBeTruthy();
  expect(person.experience).toBeGreaterThan(0);
  expect(person.skill).toBeGreaterThanOrEqual(b.skill);
  const cash=done.funds;
  await page.reload({waitUntil:'domcontentloaded'});
  const reloaded=await data(page);
  expect(reloaded.tours.bookings[0].status).toBe('done');
  expect(reloaded.funds).toBe(cash);
  await page.evaluate(()=>window.__TennisDynastyCore.getCareer().advance(1));
  const next=await data(page);
  expect(next.tours.bookings.filter(x=>x.status==='done')).toHaveLength(1);
  expect(next.tours.journal.filter(x=>x.kind==='résultat')).toHaveLength(1);
});

test('V10.3 professionnels: tournoi, préparation améliorée et gains conditionnels',async({page})=>{
  await recruitment(page,'pro');await negotiate(page);await favorableOffer(page);await page.locator('#recSign').click();
  await expect(page.locator('#recruitModal')).toHaveCount(0);
  await page.locator('#tamRecruit10 [data-back]').click();await tour(page);
  await page.locator('#tm103Event').selectOption('p-lyon');
  const pre=await data(page);
  const costEconomy=await page.locator('#tm103Tours').innerText();
  await page.locator('#tm103Tours [data-plan="elite"]').click();
  const body=await page.locator('#tm103Tours').innerText();
  expect(body).toContain('Chance indicative');
  expect(body).toContain('récupération');
  await page.locator('#tm103Fund').click();
  const after=await data(page);
  expect(after.tours.bookings).toHaveLength(1);
  const b=after.tours.bookings[0];
  expect(b.plan).toBe('elite');
  expect(b.breakdown.academy).toBeGreaterThan(0);
  expect(after.funds).toBe(pre.funds-b.breakdown.academy);
  await page.evaluate(n=>window.__TennisDynastyCore.getCareer().advance(n),b.eventWeek-after.time);
  const final=await data(page),r=final.tours.bookings[0];
  expect(r.status).toBe('done');
  expect(r.prize).toBeGreaterThanOrEqual(0);
  expect(r.xp).toBeGreaterThan(0);
  const professional=await page.evaluate(id=>window.__TennisDynastyCore.getCareer().roster.find(x=>String(x.id)===id),b.playerId);
  expect(professional).toBeTruthy();
  expect(professional.experience).toBeGreaterThan(0);
  expect(final.tours.journal.filter(x=>x.kind==='prime')).toHaveLength(r.prize>0?1:0);
});

test('V10.3 trésorerie fragile: interdiction sans consentement de risque',async({page})=>{
  await signedJunior(page);await tour(page);
  await page.locator('#tm103Event').selectOption('j-barcelona');
  const cost=await page.evaluate(()=>window.TAM103.events().find(x=>x.id==='j-barcelona'));
  expect(cost).toBeTruthy();
  // Une partie fictive n'a ici plus que quelques milliers d'euros disponibles.
  await page.evaluate(()=>{window.__TennisDynastyCore.getCareer().funds=2000});
  await page.locator('#tm103Event').selectOption('j-lisbon');
  const start=await data(page);
  await expect(page.locator('#tm103Risk')).toBeVisible();
  await page.locator('#tm103Fund').click();
  await expect(page.locator('#tm103Message')).toContainText(/risque/i);
  const blocked=await data(page);
  expect(blocked.funds).toBe(start.funds);
  expect(blocked.tours.bookings||[]).toHaveLength(0);
  await page.locator('#tm103Risk').check();
  await page.locator('#tm103Fund').click();
  const committed=await data(page);
  expect(committed.tours.bookings).toHaveLength(1);
  expect(committed.funds).toBeLessThan(start.funds);
});
