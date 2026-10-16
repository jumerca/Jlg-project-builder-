import {test,expect} from '@playwright/test';
import {academy,recruit,opened,save} from './helpers.mjs';
test.beforeEach(async({page})=>{const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});await academy(page);});

test('chargement et onglets préservés',async({page})=>{
 const info=await page.evaluate(()=>({status:window.TAM103?.status?.(),tabs:[...document.querySelectorAll('#td5Director .td5-tabs button')].map(x=>x.id)}));
 console.log('V103_QUALITY',JSON.stringify(info));
 expect(info.status?.ready).toBe(true);
 expect(info.status?.tab).toBe(true);
 await expect(page.locator('#tam101Recruit')).toBeVisible();
 await expect(page.locator('#tam8CalendarTab')).toBeAttached();
 await page.locator('#tm103Tab').click();
 await expect(page.locator('#tm103Tours')).toBeVisible();
 await page.locator('#tm103Back').click();await expect(page.locator('#td5Director')).toBeVisible();
});

test('junior: accord de la famille obligatoire, prélèvement unique puis sauvegarde',async({page})=>{
 await recruit(page);await opened(page);
 await page.locator('#tm103Share').selectOption('75');
 const before=await save(page);
 await page.locator('#tm103Fund').click();
 await expect(page.locator('#tm103Message')).toContainText(/accord|participation/i);
 expect((await save(page)).cash).toBe(before.cash);
 await page.locator('#tm103Agreement').check();
 await page.locator('#tm103Fund').click();
 const booked=await save(page);
 expect(booked.data.bookings).toHaveLength(1);
 expect(booked.cash).toBe(before.cash-booked.data.bookings[0].breakdown.academy);
 await expect(page.locator('#tm103Fund')).toBeDisabled();
 await page.reload({waitUntil:'domcontentloaded'});
 expect((await save(page)).data.bookings).toHaveLength(1);
 expect((await save(page)).cash).toBe(booked.cash);
});

test('junior: résultat sportif à l’échéance, expérience sans primes',async({page})=>{
 await recruit(page);await opened(page);
 await page.locator('#tm103Fund').click();
 const a=await save(page),b=a.data.bookings[0];
 expect(b.status).toBe('planned');
 const span=b.eventWeek-a.week;expect(span).toBeGreaterThan(0);
 await page.evaluate(n=>window.__TennisDynastyCore.getCareer().advance(n),span);
 const after=await save(page),s=after.data.bookings[0];expect(s.status).toBe('done');
 expect(s.prize).toBe(0);expect(s.xp).toBeGreaterThan(0);
 const athlete=await page.evaluate(id=>window.__TennisDynastyCore.getCareer().academyV2.prospects.find(p=>String(p.id)===id),b.playerId);
 expect(athlete.experience).toBeGreaterThan(0);
 await page.reload({waitUntil:'domcontentloaded'});
 expect((await save(page)).data.bookings[0].status).toBe('done');
 expect((await save(page)).cash).toBe(after.cash);
});

test('professionnel: arbitrage performance et résultats sans gains garantis',async({page})=>{
 await recruit(page,'pro');await opened(page,'pro');
 await page.locator('#tm103Tours [data-plan="eco"]').click();
 const cheap=(await page.locator('#tm103Fund').textContent()).trim();
 await page.locator('#tm103Tours [data-plan="elite"]').click();
 const expensive=(await page.locator('#tm103Fund').textContent()).trim();
 expect(expensive).not.toBe(cheap);
 const cash=(await save(page)).cash;
 await page.locator('#tm103Fund').click();
 const after=await save(page),b=after.data.bookings[0];
 expect(after.cash).toBe(cash-b.breakdown.academy);
 await page.evaluate(n=>window.__TennisDynastyCore.getCareer().advance(n),b.eventWeek-after.week);
 const outcome=(await save(page)).data.bookings[0];
 expect(outcome.status).toBe('done');
 expect(outcome.prize).toBeGreaterThanOrEqual(0);
 expect(outcome.xp).toBeGreaterThan(0);
});

test('trésorerie à risque: refus sans confirmation puis acceptation',async({page})=>{
 await recruit(page);await opened(page);
 await page.evaluate(()=>window.__TennisDynastyCore.getCareer().funds=2000);
 await page.locator('#tm103Event').selectOption('j-lisbon');
 await expect(page.locator('#tm103Risk')).toBeVisible();
 await page.locator('#tm103Fund').click();
 await expect(page.locator('#tm103Message')).toContainText(/risque/i);
 expect((await save(page)).data.bookings||[]).toHaveLength(0);
 await page.locator('#tm103Risk').check();
 await page.locator('#tm103Fund').click();
 const booked=await save(page);
 expect(booked.data.bookings).toHaveLength(1);
 expect(booked.cash).toBeLessThan(2000);
});
