'use strict';
const {hash}=require('./editorial');
const FEEDS=[
 {name:'franceinfo',url:'https://www.francetvinfo.fr/titres.rss'},
 {name:'France 24',url:'https://www.france24.com/fr/rss'},
 {name:'Le Monde',url:'https://www.lemonde.fr/rss/une.xml'},
 {name:'RFI',url:'https://www.rfi.fr/fr/rss'},
 {name:'Le Figaro',url:'https://www.lefigaro.fr/rss/figaro_actualites.xml'},
 {name:'Google Actualités · Corrèze',url:'https://news.google.com/rss/search?q=Corr%C3%A8ze%20OR%20Brive%20OR%20Tulle%20OR%20Pompadour&hl=fr&gl=FR&ceid=FR%3Afr'}
];
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{try{return String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10))}catch{return ''}}).replace(/&(amp|lt|gt|quot|apos|nbsp|eacute|egrave|ecirc|agrave|ccedil|rsquo|ldquo|rdquo);/gi,(_,x)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',eacute:'é',egrave:'è',ecirc:'ê',agrave:'à',ccedil:'ç',rsquo:'’',ldquo:'“',rdquo:'”'}[x.toLowerCase()]||''));
const clean=s=>decode(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
function field(block,tag){
 const pattern=new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i');
 return (block.match(pattern)||[])[1]||'';
}
const validUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'&&Boolean(u.hostname.includes('.'))?u.href:null}catch{return null}};
function parse(xml,origin,now=Date.now()){
 const items=[...String(xml||'').matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>m[1]);
 const atoms=[...String(xml||'').matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map(m=>m[1]);
 return [...items,...atoms].slice(0,60).map(block=>{
  const title=clean(field(block,'title'));
  let url=clean(field(block,'link'));
  if(!url){url=(block.match(/<link\s+[^>]*href=["']([^"']+)["']/i)||[])[1]||''}
  url=validUrl(url);
  const summary=clean(field(block,'description')||field(block,'content:encoded')||field(block,'summary')||'');
  const date=clean(field(block,'pubDate')||field(block,'published')||field(block,'updated'));
  const epoch=Number.isFinite(Date.parse(date))?Date.parse(date):0;
  const source=clean(field(block,'source'));
  return {id:hash(url||title),title:title.slice(0,250),url,publisher:source||origin.name,feed:origin.name,summary:summary.slice(0,450),epoch,date:epoch?new Date(epoch).toISOString():null};
 }).filter(x=>x.title.length>=10&&x.url&&(!x.epoch||x.epoch<now+86400000));
}
let cached={at:0,items:[],sources:[]},inflight=null;
async function retrieve(feed,fetcher=fetch){
 try{
  const r=await fetcher(feed.url,{headers:{Accept:'application/rss+xml,application/xml,text/xml;q=.8,*/*;q=.6','User-Agent':'JLG-Media/0.9.9 (+https://github.com/jumerca)'},signal:AbortSignal.timeout(6500)});
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.text();if(!/<(rss|feed|rdf:RDF|item)\b/i.test(data))throw Error('not RSS');
  return {name:feed.name,ok:true,items:parse(data,feed)};
 }catch(e){return{name:feed.name,ok:false,items:[],error:String(e.message||e).slice(0,90)}}
}
async function load(force=false){
 if(!force&&cached.at&&Date.now()-cached.at<420000)return cached;
 if(inflight)return inflight;
 inflight=Promise.all(FEEDS.map(f=>retrieve(f))).then(results=>{
  const u=new Set();
  const items=results.flatMap(r=>r.items).filter(i=>{if(u.has(i.url))return false;u.add(i.url);return true}).sort((a,b)=>b.epoch-a.epoch);
  cached={at:Date.now(),items:items.slice(0,230),sources:results.map(({name,ok,items,error})=>({name,ok,count:items.length,error}))};return cached;
 }).catch(e=>({at:Date.now(),items:cached.items,sources:cached.sources})).finally(()=>{inflight=null});
 return inflight;
}
module.exports={FEEDS,clean,decode,field,validUrl,parse,retrieve,load};