'use strict';
const crypto=require('node:crypto');
const STOP=new Set('dans avec pour afin chez cette ces ceux celui cela apres avant entre alors aussi ainsi leur leurs elle elles nous vous ils sur sous dont mais donc sont était étaient être avoir lors plus moins toute tous toutes tout vers deux trois autre autres jusqu sans selon contre autour cette france francais francaise actualite nouvelles nouveau nouvelle direct video article lundi mardi mercredi jeudi vendredi samedi dimanche fait faire une des aux les est et ou de du au un en la le il se sa son ses par pas ne on d l a à y'.split(/\s+/));
const hash=s=>crypto.createHash('sha256').update(String(s)).digest('hex').slice(0,16);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const words=s=>[...new Set(norm(s).replace(/cop[\s-]*31/g,'cop31').replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(x=>x.length>=4&&!STOP.has(x)))];
function alike(a,b){
 const a1=words(a.title),b1=words(b.title),s=a1.filter(w=>b1.includes(w));
 const ratio=s.length/Math.max(1,Math.min(a1.length,b1.length));
 return s.length>=3&&ratio>=.55||s.length>=2&&ratio>=.78;
}
function eventKey(s){
 const t=norm(s);
 if(/cop[\s-]*31|antalya/.test(t))return 'cop31';
 if(/olivetti|arribage/.test(t))return 'masters-double';
 return null;
}
function combine(items){
 const rows=items.filter(x=>x.title&&x.url&&/^https:\/\//.test(x.url)).sort((a,b)=>(b.epoch||0)-(a.epoch||0));
 const clusters=[];
 for(const item of rows){
  const key=eventKey(item.title);
  const target=clusters.find(g=>{
   if(key&&eventKey(g[0].title)===key)return true;
   return alike(g[0],item);
  });
  if(target)target.push(item);else clusters.push([item]);
 }
 return clusters.map(group=>{
  const publishers=[...new Set(group.map(g=>norm(g.publisher||g.feed)).filter(Boolean))];
  const independent=publishers.length>=2;
  const kind=independent?'revue':'breve';
  return {id:hash(group[0].url),title:group[0].title,summary:group[0].summary||'',category:classify(group[0]),kind,publishers:publishers.length,items:group,epoch:group[0].epoch||0,sourceNames:[...new Set(group.map(g=>g.publisher||g.feed))],count:group.length,
    note:independent?'Revue de publications issues de médias distincts, réalisée à partir de leurs métadonnées RSS. Elle ne vaut pas vérification complète des textes originaux.':'Brève ou regroupement de dépêches. Une source unique, ou plusieurs titres du même éditeur, ne suffit pas à un recoupement indépendant.'};
 });
}
const corr=/\b(correze|brive(?:-la-gaillarde)?|tulle|ussel|pompadour|donzenac|objat|juillac|lubersac|allassac|malemort|argentat|meymac|egletons|beaulieu-sur-dordogne|saint-yrieix-le-dejalat)\b/i;
function isCorreze(a){return corr.test(norm((a.title||'')+' '+(a.summary||'')));}
function classify(a){
 if(isCorreze(a))return 'Corrèze';
 const t=norm((a.title||'')+' '+(a.summary||''));
 if(/\b(rugby|football|handball|basket|tennis|grand chelem|formule 1|ligue 1|championnat|nba|sport|champions league|premier league)\b/.test(t))return 'Sport';
 if(/\b(cinema|film|festival de cannes|acteur|actrice|box office)\b/.test(t))return 'Cinéma';
 if(/\b(voyage|tourisme|touriste|destination|aeroport|hotel)\b/.test(t))return 'Voyages';
 if(/\b(guerre|ukraine|russie|israel|gaza|chine|etats unis|otan|cop31|climat|onu)\b/.test(t))return 'International';
 return 'France';
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brief=s=>{const x=String(s||'').trim();return x.length>235?x.slice(0,233).replace(/\s+\S*$/,'')+'…':x};
module.exports={hash,norm,words,alike,eventKey,combine,isCorreze,classify,esc,brief};