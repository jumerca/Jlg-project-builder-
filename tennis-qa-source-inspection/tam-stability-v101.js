(()=>{'use strict';
const ROOT='#td5Director',PORTAL='#tamRecruit10',KEY='tennis_academy_recruit_v10',CAREER='tennis_dynasty_v05_career';
const $=s=>document.querySelector(s);
let originalButton=null,linked=null,observer=null,busy=false;
function data(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
function findButton(){const x=$('#tamRecruit10Tab');if(x)originalButton=x;return originalButton}
function openMarket(type='staff'){const x=findButton();if(!x)return false;const p=$(PORTAL);if(!p||p.hidden)x.click();if(type==='junior'||type==='pro')$(PORTAL+' [data-screen="'+type+'"]')?.click();return !!$(PORTAL)&&!$(PORTAL).hidden}
function repairNavigation(){const root=$(ROOT);if(!root)return;
const tabs=root.querySelector('.td5-tabs');if(tabs&&!tabs.querySelector('#tam101Recruit')){const button=document.createElement('button');button.id='tam101Recruit';button.type='button';button.textContent='Recrutements';button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openMarket('staff')});tabs.append(button)}
const old=findButton();if(old)old.classList.add('tam101-hidden');
for(const b of root.querySelectorAll('.td5-tabs [data-tab="recruit"]'))b.classList.add('tam101-hidden');
if($(PORTAL)&&!$(PORTAL).hidden)root.style.display='none';
}
function installPayroll(){const c=window.__TennisDynastyCore?.getCareer?.();if(!c||c===linked||typeof c.advance!=='function')return;linked=c;const orig=c.advance;
c.advance=function(...args){const before=(c.year-1)*52+c.week,ret=orig.apply(this,args),after=(c.year-1)*52+c.week,elapsed=Math.max(0,Math.min(52,after-before));if(!elapsed)return ret;
const db=data(),players=(db?.players||[]).filter(p=>p&&p.id&&Number(p.monthly||p.salary||0)>0);if(!players.length)return ret;
let due=0;for(let week=before+1;week<=before+elapsed;week++)for(const p of players){const start=Number(p.starts??before),end=Number(p.expires??999999);if(week>=start&&week<=end)due+=Number(p.monthly||p.salary||0)*12/52}
const amount=Math.round(due);if(amount>0){c.funds-=amount;db.payroll101=Array.isArray(db.payroll101)?db.payroll101:[];db.payroll101.unshift({year:c.year,week:c.week,weeks:elapsed,amount});db.payroll101=db.payroll101.slice(0,80);
try{localStorage.setItem(KEY,JSON.stringify(db));const saved=JSON.parse(localStorage.getItem(CAREER)||'null');if(saved?.format===2&&saved.career&&typeof c.snapshot==='function'){saved.career=c.snapshot();localStorage.setItem(CAREER,JSON.stringify(saved))}window.__TennisDynastyCore?.saveCareer?.()}catch(e){console.warn('V10.1 payroll persistence error',e)}
}
return ret};c.advance.__tam101=true}
function finance(){const root=$(ROOT);if(!root)return;const players=data()?.players||[],visible=players.filter(x=>x&&x.name);let pane=root.querySelector('#tam101Payroll');if(!pane){pane=document.createElement('div');pane.id='tam101Payroll';pane.setAttribute('role','status');root.append(pane)}pane.hidden=!visible.length;if(!visible.length)return;
const week=visible.reduce((n,p)=>n+Number(p.monthly||p.salary||0)*12/52,0),last=data()?.payroll101?.[0];pane.textContent='Contrats sportifs : '+visible.length+' joueur(s) · '+Math.round(week).toLocaleString('fr-FR')+' €/semaine'+(last?' · dernier prélèvement '+Math.round(last.amount).toLocaleString('fr-FR')+' €':'');}
function refresh(){if(busy)return;busy=true;try{repairNavigation();installPayroll();finance()}finally{busy=false}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!b.closest(ROOT)||!$(PORTAL)||!$(PORTAL).hidden)return;if(b.id==='tam101Recruit'||b.id==='tamRecruit10Tab')return;const label=(b.textContent||'').trim().toLowerCase();
const navigate=b.dataset.tab==='recruit';const hiring=b.dataset.findstaff||b.dataset.candidate||b.dataset.find||b.dataset.recruit||b.dataset.hire||b.dataset.job;
const newCandidate=/^(recruter|voir les candidats|recrutement|chercher un candidat)/i.test(label)&&!/réunion|renégocier|entretien|licenci|résilier/i.test(label);
if(!navigate&&!hiring&&!newCandidate)return;e.preventDefault();e.stopImmediatePropagation();const kind=/junior|jeune|parents/.test(label)?'junior':/professionnel|senior|joueur/.test(label)?'pro':'staff';queueMicrotask(()=>openMarket(kind))},true);
const style=document.createElement('style');style.id='tam101-css';style.textContent='#td5Director .td5-tabs .tam101-hidden{display:none!important}#tam101Recruit{background:#22C7C9!important;color:#082a35!important;border:1px solid #22C7C9!important;font-weight:850!important}#tam101Payroll{margin:10px 0;padding:12px;border:1px solid #3d6572;background:#253e4a;border-radius:10px;color:#dce9ee;font-size:12px}#tam101Payroll[hidden]{display:none!important}';document.head.append(style);
function attach(){const root=$(ROOT);if(root&&!observer){observer=new MutationObserver(()=>queueMicrotask(refresh));observer.observe(root,{childList:true,subtree:false})}refresh()}
let attempts=0;const interval=setInterval(()=>{attach();if(++attempts>=45)clearInterval(interval)},300);attach();
window.TAM101={open:openMarket,status:()=>({ready:!!$(ROOT)&&!!$(PORTAL),recruitmentEntrypoints:document.querySelectorAll('#tam101Recruit').length,nativeDuplicateHidden:!!findButton()?.classList.contains('tam101-hidden'),payrollHooked:!!linked?.advance?.__tam101,playerContracts:data()?.players?.length||0,payrollRecords:data()?.payroll101?.length||0})};
})();