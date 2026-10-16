import {test,expect} from '@playwright/test';
import {academy} from './helpers.mjs';
test('Diagnostic source : identifier la réinitialisation V5 et API disponible',async({page})=>{
 await academy(page);
 const t=await page.request.get('/tennis/academy-director-v5.js');expect(t.status()).toBe(200);const s=await t.text();
 const patterns=['const KEY=', 'let db;', 'db=starter()', 'function init(', 'function sync(', 'function render(', 'function weekly(', 'function hook(', 'function commit(', 'function save(', 'function staffOptions(', 'function renderDirector(', 'function refresh(', 'window.Tennis', 'window.__Tennis', "storage", "lastRosterSig", 'db.staff=[]', 'db.staff = []'];
 for(const p of patterns){let n=0,pos=-1;while(n<5&&(pos=s.indexOf(p,pos+1))>=0){console.log('V102_SOURCE_PART '+JSON.stringify({p,pos,snippet:s.slice(Math.max(0,pos-350),pos+1150)}));n++;}}
 const exports=s.slice(-2800);console.log('V102_SOURCE_TAIL '+exports);
 const tab=page.locator('#td5Director .td5-tabs [data-tab="staff"]');await tab.click();
 console.log('V102_STAFF_STRUCTURE '+JSON.stringify(await page.locator('#td5Director .td5-page').evaluate(el=>({text:el.innerText.slice(0,1500),html:el.innerHTML.slice(0,2700)}))));
});