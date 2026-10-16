import {expect} from '@playwright/test';
export async function academy(page){
 const response=await page.goto('/?qa=tour-v103-immutable',{waitUntil:'domcontentloaded'});
 expect(response.status()).toBeLessThan(400);
 const js=await page.request.get('/tennis/tam-tour-v103.js?v=103');
 expect(js.status(),'Module V10.3 absent').toBe(200);
 await page.waitForFunction(()=>!!window.__TennisDynastyCore?.getCareer,{timeout:12000});
 const has=await page.evaluate(()=>!!window.__TennisDynastyCore.getCareer());
 if(!has){
  await page.evaluate(()=>{const el=document.querySelector('#careerName');if(el){el.value='Académie JLG QA';el.dispatchEvent(new Event('input',{bubbles:true}))}document.querySelector('#startCareer')?.click()});
  if(!await page.evaluate(()=>!!window.__TennisDynastyCore.getCareer())){
   const dlg=page.getByRole('dialog').last();const btn=dlg.getByRole('button',{name:/fonder|créer|valider|confirmer/i}).last();if(await btn.count())await btn.click();
  }
 }
 await page.waitForFunction(()=>!!window.__TennisDynastyCore.getCareer(),{timeout:12000});
 await page.evaluate(()=>document.querySelector('[data-td-nav="academy"],[data-td21-go="academy"]')?.click());
 await expect(page.locator('#td5Director')).toBeAttached();
 await expect(page.locator('#tm103Tab')).toBeAttached({timeout:12000});
}
export async function recruit(page,type='junior'){
 await page.locator('#tamRecruit10Tab').evaluate(x=>x.click());
 await expect(page.locator('#tamRecruit10')).toBeVisible();
 await page.locator('#tamRecruit10 [data-screen="'+type+'"]').click();
 await page.locator('#tamRecruit10 [data-candidate]').first().click();
 await expect(page.locator('#recSalary')).toBeEditable();
 await page.locator('#recSalary').fill('18000');await page.locator('#recBonus').fill('12000');await page.locator('#recPerformance').fill('5000');await page.locator('#recYears').selectOption('3');await page.locator('#recHousing').selectOption('flat');await page.locator('#recBenefit').selectOption('school');
 await page.locator('#recSend').click();await expect(page.locator('#recSign')).toBeVisible();
 await page.locator('#recSign').click();await expect(page.locator('#recruitModal')).toHaveCount(0);
 await page.locator('#tamRecruit10 [data-back]').click();await expect(page.locator('#td5Director')).toBeVisible();
}
export async function opened(page,kind='junior'){
 await page.locator('#tm103Tab').click();await expect(page.locator('#tm103Tours')).toBeVisible();
 const info=await page.evaluate(type=>({available:window.TAM103.players().filter(p=>p.kind===type),recruits:(JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'{}').players||[]).filter(p=>type==='junior'?p.age<18:p.age>=18),prospects:window.__TennisDynastyCore.getCareer().academyV2?.prospects||[]}),kind);
 console.log('TOUR_PLAYER_SELECTION '+JSON.stringify(info).slice(0,9000));
 const recruit=info.recruits.at(-1);
 const target=info.available.find(p=>String(p.id)===String(recruit?.id))||info.available[0];
 expect(target,'Aucun joueur recruté dans le module international').toBeTruthy();
 await page.locator('#tm103Player').selectOption(target.id);
 await page.locator('#tm103Event').selectOption(kind==='junior'?'j-barcelona':'p-lyon');
 return target;
}
export async function save(page){
 return page.evaluate(()=>({cash:window.__TennisDynastyCore.getCareer().funds,week:(window.__TennisDynastyCore.getCareer().year-1)*52+window.__TennisDynastyCore.getCareer().week,data:JSON.parse(localStorage.getItem('tennis_academy_tours_v103')||'{}')}));
}
