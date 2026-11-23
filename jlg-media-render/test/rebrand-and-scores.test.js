'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {png}=require('../lib/brand-icon');
const {layout,matchPresentation,matchCard,scorePage}=require('../server');
const {DOSSIERS}=require('../lib/dossiers');
const {cover}=require('../lib/frontpage');
const {espnMatch,handballEvent}=require('../lib/sports');
const publicDir=path.join(__dirname,'..','public');
test('PWA logo is not a placeholder; generates real PNGs with required dimensions',()=>{
 for(const size of [180,192,512]){const b=png(size);assert.ok(b.length>250);assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);}
 const m=JSON.parse(fs.readFileSync(path.join(publicDir,'manifest.webmanifest'),'utf8'));
 for(const v of ['192x192','512x512'])assert.ok(m.icons.some(x=>x.sizes===v&&x.type==='image/png'));
 for(const file of ['icon.svg','site-rebrand.css','sw.js','install.js'])assert.ok(fs.statSync(path.join(publicDir,file)).size>70);
});
test('clean header shows one masthead and new icon, not multiple ribbons',()=>{
 const s=layout('<p>Hello</p>','Article');
 assert.match(s,/class="brand-logo"/);
 assert.match(s,/site-rebrand\.css/);
 assert.match(s,/apple-touch-icon\.png/);
 assert.match(s,/install\.js/);
 assert.doesNotMatch(s,/class="topbar"/);
 assert.doesNotMatch(s,/COMPRENDRE, VÉRIFIER, TRANSMETTRE/);
 assert.equal((s.match(/<header class="mast">/g)||[]).length,1);
});
test('front page has one concise headline and a real lead news photo',()=>{
 const s=cover([]);
 assert.match(s,/class="ed-compact-head"/);
 assert.match(s,/À la une/);
 assert.doesNotMatch(s,/class="ed-issue-line"/);
 assert.doesNotMatch(s,/class="ed-front-title"/);
 assert.doesNotMatch(s,/NOTRE MÉTHODE/);
 assert.match(s,/<img /);
});
test('score status does not confuse upcoming, missing and completed games',()=>{
 assert.deepEqual(matchPresentation({state:'scheduled',kickoff:'2099-11-23T19:45:00Z',time:'23/11 20:45'},Date.parse('2099-11-23T07:00:00Z')),{kind:'scheduled',label:'À venir',score:'20 h 45'});
 assert.equal(matchPresentation({state:'scheduled',kickoff:'2026-11-22T09:00:00Z',time:'22/11 10:00'},Date.parse('2026-11-23T07:00:00Z')).kind,'pending');
 assert.equal(matchPresentation({state:'final',homeScore:null,awayScore:null}).score,'Résultat indisponible');
 assert.deepEqual(matchPresentation({state:'final',homeScore:0,awayScore:0}),{kind:'final',label:'Terminé',score:'0 – 0'});
 assert.equal(matchPresentation({state:'live',homeScore:1,awayScore:2}).kind,'live');
});
test('match rendering displays actual kickoff when future and no score',()=>{
 const l={sport:'Football',name:'Ligue 2',group:'France',url:'https://example.com/',events:[{home:'A',away:'B',homeScore:null,awayScore:null,state:'scheduled',time:'23/11 20:45',kickoff:'2099-11-23T19:45:00Z',url:null}]};
 const s=matchCard(l);
 assert.match(s,/À venir/);assert.match(s,/20 h 45/);
 assert.doesNotMatch(s,/— : —/);
});
test('scoreboard hides empty leagues while providing the full missing list',()=>{
 const l=[{sport:'Football',name:'Ligue 1',group:'France',ok:true,events:[],url:'https://example.com/1'},
 {sport:'Football',name:'Ligue 2',group:'France',ok:true,events:[{home:'A',away:'B',state:'scheduled',kickoff:'2099-11-23T19:45:00Z',time:'23/11 20:45',homeScore:null,awayScore:null,url:null}],url:'https://example.com/2'}];
 const s=scorePage({sport:'Football',date:'2099-11-23',fetchedAt:'2099-11-23T06:00:00Z',leagues:l});
 assert.match(s,/Compétitions sans rencontre ou source indisponible/);
 assert.match(s,/Ligue 2/);assert.match(s,/Ligue 1 : aucune rencontre retournée/);
});
test('published editorial articles do not masquer an excerpt as journalism',()=>{
 const all=DOSSIERS.flatMap(d=>d.sections.flatMap(x=>x.paragraphs));
 assert.ok(all.length>25);
 assert.ok(all.every(x=>x.length>70));
 const front=cover([]);
 assert.match(front,/Le fil des brèves/);
 assert.match(front,/Les articles de la rédaction/);
 assert.ok(DOSSIERS.some(d=>d.section==='Sport'));
 assert.ok(DOSSIERS.some(d=>d.section==='Corrèze'));
});
