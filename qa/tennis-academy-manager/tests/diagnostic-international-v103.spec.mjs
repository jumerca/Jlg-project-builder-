import {test,expect} from '@playwright/test';
import {academy} from './helpers.mjs';
test('V10.3 diagnostic du chargement',async({page})=>{
const errors=[],logs=[],net=[];
page.on('pageerror',err=>errors.push(err.stack||err.message));
page.on('console',msg=>{if(msg.type()==='error')logs.push(msg.text())});
page.on('response',r=>{if(r.url().includes('tam-tour-international-v103')||r.url().includes('tam-identity-v6'))net.push({url:r.url(),status:r.status()})});
await academy(page);await page.waitForTimeout(2000);
const response=await page.request.get('/tennis/tam-tour-international-v103.js?v=103');
const info=await page.evaluate(()=>({exists:!!window.TAM103,status:window.TAM103?.status?.(),tab:!!document.querySelector('#tour103Tab'),root:!!document.querySelector('#td5Director'),host:!!document.querySelector('#tdAcademyView'),sources:[...document.scripts].map(x=>x.src).filter(x=>x.includes('tam-'))}));
console.log('TOUR103_DIAG',JSON.stringify({info,moduleHttp:response.status(),moduleLength:(await response.text()).length,errors,logs,net}).slice(0,18000));
expect(response.status()).toBe(200);
expect(info.exists,'window.TAM103 undefined, see TOUR103_DIAG').toBe(true);
expect(info.tab,'Tournois internationaux tab missing').toBe(true);
});
