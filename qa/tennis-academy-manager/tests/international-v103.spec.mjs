import {test,expect} from '@playwright/test';
import {academy,recruitment,negotiate,favorableOffer} from './helpers.mjs';

test.beforeEach(async({page})=>{await academy(page);});
async function go(page){
  await expect(page.locator('#tour103Tab')).toBeVisible();
  await page.locator('#tour103Tab').click();
  await expect(page.locator('#tour103Panel')).toBeVisible();
}
const details=()=>({now:window.__TennisDynastyCore.getCareer().funds,
  state:JSON.parse(localStorage.getItem('tennis_tourism_v103')||'{}'),
  career:window.__TennisDynastyCore.getCareer()});
async function get(page){return page.evaluate(()=>{const a=JSON.parse(localStorage.getItem('tennis_tourism_v103')||'{}'),c=window.__TennisDynastyCore.getCareer();return {funds:c.funds,week:(c.year-1)*52+c.week,plans:a.bookings||[],results:a.results||[],ledger:a.ledger||[],athletes:a.athletes||{},points:c.points};})}
async function travelTo(page,at){await page.evaluate(target=>{const c=window.__TennisDynastyCore.getCareer();let guard=0;while((c.year-1)*52+c.week<target&&guard++<20){const remain=target-((c.year-1)*52+c.week);c.advance(Math.min(4,remain));}},at);}

test('V10.3 accès au financement sans retirer les onglets existants',async({page})=>{
  const nativeTabs=await page.locator('#td5Director .td5-tabs [data-tab]').evaluateAll(x=>x.map(el=>el.dataset.tab));
  await go(page);
  await expect(page.locator('#tour103Player')).toBeVisible();
  await expect(page.locator('#tour103Event option').first()).toBeAttached();
  for(const value of ['low','normal','top'])await expect(page.locator('#tour103Panel [data-mode="'+value+'"]')).toBeVisible();
  const q=await page.evaluate(()=>{
    const id=document.querySelector('#tour103Event').value,player=document.querySelector('#tour103Player').value;
    return ['low','normal','top'].map(m=>window.TAM103.quote(id,player,m).due);
  });
  expect(q[0]).toBeLessThan(q[1]);expect(q[1]).toBeLessThan(q[2]);
  await page.locator('#tour103Panel [data-exit]').click();
  await expect(page.locator('#td5Director')).toBeVisible();
  const afterTabs=await page.locator('#td5Director .td5-tabs [data-tab]').evaluateAll(x=>x.map(el=>el.dataset.tab));
  for(const tab of nativeTabs)expect(afterTabs,'Onglet natif supprimé : '+tab).toContain(tab);
  await expect(page.locator('#tam101Recruit')).toBeVisible();
  await expect(page.locator('#tour103Tab')).toBeVisible();
});

test('V10.3 déplacement confirmé : prélèvement immédiat unique et persistance',async({page})=>{
  await go(page);
  const before=await get(page);
  await page.locator('#tour103Book').click();
  const after=await get(page);
  expect(after.plans).toHaveLength(1);
  expect(after.plans[0].status).toBe('scheduled');
  expect(before.funds-after.funds).toBe(after.plans[0].price);
  await page.locator('#tour103Book').click();
  const duplicate=await get(page);
  expect(duplicate.plans).toHaveLength(1);
  expect(duplicate.funds).toBe(after.funds);
  await page.reload({waitUntil:'domcontentloaded'});
  const saved=await get(page);
  expect(saved.plans).toHaveLength(1);
  expect(saved.funds).toBe(after.funds);
});

test('V10.3 résultat à la semaine de compétition, sans double traitement après rechargement',async({page})=>{
  await go(page);
  await page.locator('#tour103Book').click();
  let initial=await get(page),due=initial.plans[0].at;
  await travelTo(page,due);
  let finished=await get(page);
  expect(finished.plans[0].status).toBe('played');
  expect(finished.results).toHaveLength(1);
  expect(finished.results[0].wins).toBeGreaterThanOrEqual(0);
  expect(finished.results[0].wins).toBeLessThanOrEqual(4);
  expect(finished.results[0].pts).toBeGreaterThanOrEqual(0);
  expect(finished.athletes.lead.played).toBe(1);
  expect(finished.plans[0].prize).toBeGreaterThanOrEqual(0);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.evaluate(()=>window.__TennisDynastyCore.getCareer().advance(1));
  const stable=await get(page);
  expect(stable.results).toHaveLength(1);
  expect(stable.athletes.lead.played).toBe(1);
  expect(stable.plans[0].status).toBe('played');
});

test('V10.3 annulation rembourse seulement une fraction du billet',async({page})=>{
  await go(page);
  const initial=await get(page);
  await page.locator('#tour103Book').click();
  const booked=await get(page);
  const cost=booked.plans[0].price;
  await page.locator('#tour103Panel [data-cancel]').click();
  const cancelled=await get(page);
  expect(cancelled.plans[0].status).toBe('cancelled');
  expect(cancelled.plans[0].refund).toBeGreaterThan(0);
  expect(cancelled.plans[0].refund).toBeLessThan(cost);
  expect(cancelled.funds-booked.funds).toBe(cancelled.plans[0].refund);
  expect(cancelled.funds).toBeLessThan(initial.funds);
});

test('V10.3 réserve d’exploitation : confirmation explicite si le déplacement est risqué',async({page})=>{
  await go(page);
  const amount=await page.evaluate(()=>{
    const item=document.querySelector('#tour103Event').value,
    person=document.querySelector('#tour103Player').value,
    due=window.TAM103.quote(item,person,'normal').due;
    const c=window.__TennisDynastyCore.getCareer();c.funds=due+80;return due;
  });
  await page.locator('#tour103Book').click();
  await expect(page.locator('#tour103Panel')).toContainText(/risque financier|réserve/i);
  expect((await get(page)).plans).toHaveLength(0);
  await page.locator('#tour103Risk').check();
  await page.locator('#tour103Book').click();
  const result=await get(page);
  expect(result.plans).toHaveLength(1);
  expect(result.funds).toBe(80);
  expect(result.plans[0].price).toBe(amount);
});

test('V10.3 jeune joueur : compétition junior et absence de primes fictives',async({page})=>{
  await recruitment(page,'junior');await negotiate(page);await favorableOffer(page);
  await page.locator('#recSign').click();
  await expect(page.locator('#recruitModal')).toHaveCount(0);
  await page.locator('#tamRecruit10 [data-back]').click();
  await go(page);
  await page.locator('#tour103Player').selectOption({label:/Junior/}).catch(async()=>{
    const opt=page.locator('#tour103Player option').filter({hasText:/Junior/}).first();
    await page.locator('#tour103Player').selectOption(await opt.getAttribute('value'));
  });
  await expect(page.locator('#tour103Event option').first()).toBeAttached();
  await page.locator('#tour103Panel [data-mode="low"]').click();
  await page.locator('#tour103Book').click();
  const planned=await get(page);
  expect(planned.plans).toHaveLength(1);
  expect(planned.plans[0].category).toBe('junior');
  await travelTo(page,planned.plans[0].at);
  const after=await get(page);
  expect(after.plans[0].status).toBe('played');
  expect(after.plans[0].prize).toBe(0);
  const youths=await page.evaluate(()=>window.__TennisDynastyCore.getCareer().academyV2.prospects);
  expect(youths.some(p=>p.tourPoints>=0)).toBe(true);
});

test('V10.3 Android : les coûts, choix et résultats restent lisibles sans débordement',async({page},info)=>{
  test.skip(info.project.name!=='android-chromium','Test mobile spécifique');
  await go(page);
  const sizes=await page.evaluate(()=>{
    const panel=document.querySelector('#tour103Panel');
    return {scroll:panel.scrollWidth,client:panel.clientWidth};
  });
  expect(sizes.scroll-sizes.client).toBeLessThanOrEqual(5);
  await page.locator('#tour103Panel [data-mode="top"]').click();
  await expect(page.locator('#tour103Book')).toBeVisible();
});
