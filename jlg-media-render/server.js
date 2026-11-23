'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('./lib/sources');
const E=require('./lib/editorial');
const S=require('./lib/sports');
const A=require('./lib/agenda');
const V=require('./lib/agenda-view');
const P=require('./lib/frontpage');
const I=require('./lib/photos');
const BRAND=require('./lib/brand-icon');
const {DOSSIERS}=require('./lib/dossiers');
const ROOT=path.join(__dirname,'public');
const pathSafe=p=>path.normalize(p).replace(/^(\.\.(\/|\\|$))+/,'');
const C={title:'JLG Média',desc:'Actualités françaises, dossiers originaux et scores sportifs sourcés'};
const NAV=[['/','À la une'],['/?section=France','France'],['/?section=Corrèze','Corrèze'],['/?section=International','International'],['/?section=Sport','Sport'],['/journal','Journal'],['/dossiers','Dossiers'],['/breves','Brèves'],['/scores','Scores & Direct'],['/calendrier','Calendrier'],['/classements','Classements']];
function fmt(iso,clock=false){
 if(!iso)return 'Date non communiquée';
 try{return new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'numeric',month:'short',year:'numeric',...(clock?{hour:'2-digit',minute:'2-digit'}:{})}).format(new Date(iso))}catch{return 'Date inconnue'}
}
function nav(current){
 return '<nav class="navouter"><div class="container nav" aria-label="Rubriques">'+NAV.map(([href,label])=>'<a href="'+href+'" class="'+(href===current?'active':'')+'">'+E.esc(label)+'</a>').join('')+'</div></nav>';
}
function layout(body,title=C.title,current='/',desc=C.desc){
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#06192b"><meta name="description" content="'+E.esc(desc)+'"><link rel="icon" type="image/svg+xml" href="/icon.svg"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/style.css?v=012"><link rel="stylesheet" href="/frontpage.css?v=012"><link rel="stylesheet" href="/site-rebrand.css?v=012"><title>'+E.esc(title)+' · JLG Média</title><script defer src="/install.js"></script></head><body><header class="mast"><div class="container mast-inner"><a class="brand" href="/"><img class="brand-logo" src="/icon.svg" alt="" width="44" height="44"><span class="brand-name">JLG <em>Média</em></span></a><a class="mast-edition" href="/dossiers">Le journal <span aria-hidden="true">↗</span></a></div></header>'+nav(current)+'<main class="container">'+body+'</main><footer class="footer"><div class="container"><div><b>JLG Média · JLG Creative</b><p>Articles originaux de la rédaction et actualités sourcées. Les résultats sportifs sont indiqués lorsqu’ils sont confirmés.</p></div><p>Édition indépendante de l’ancienne version Vercel. Hébergée sur Render. <a href="/api/health">État technique</a> · <a href="/journal">La rédaction</a></p></div></footer></body></html>';
}
function card(g,large=false){
 const url='/article?id='+encodeURIComponent(g.id);
 const tag=g.kind==='revue'?'Revue multi-sources':'Brève sourcée';
 return '<article class="'+(large?'feature':'article-card')+'"><div class="badge">'+E.esc(g.category)+' · '+tag+'</div><h'+(large?'2':'3')+'><a href="'+url+'">'+E.esc(g.title)+'</a></h'+(large?'2':'3')+'><p>'+E.esc(E.brief(g.summary)||'Sujet couvert par '+g.sourceNames.join(', ')+'.')+'</p><div class="meta"><span>'+E.esc(g.sourceNames.slice(0,3).join(' · '))+'</span><span>·</span><span>'+fmt(g.items[0].date)+'</span>'+(g.count>1?'<span class="pill">'+g.count+' publications</span>':'')+'</div></article>';
}
function dossierCard(){return V.dossierCard(DOSSIERS[0],true)}
function journalPage(groups,src,section=''){
 const all=section||'À la une',page=section==='Brèves'?groups.filter(x=>x.kind!=='revue'):section&&section!=='À la une'?groups.filter(x=>x.category===section):groups;
 const cards=page.slice(0,64);
 const intro='<section class="intro"><span class="eyebrow">La rédaction · Actualité vérifiable</span><h1>'+E.esc(all)+'</h1><p>Une actualité consultable ici, avec chaque média clairement identifié. Les dépêches brèves ne sont pas présentées comme des enquêtes et les informations non confirmées ne sont pas inventées.</p></section>';
 const sources=src.sources||[],good=sources.filter(x=>x.ok).length;
 const status='<div class="notice"><b>État des flux :</b> '+good+'/'+sources.length+' sources accessibles. '+cards.length+' sujets affichés. '+(src.at?'Dernière collecte : '+fmt(new Date(src.at).toISOString(),true)+'.':'')+' Les flux RSS sont des métadonnées publiques, pas des reportages complets.</div>';
 const search='<form class="search" method="get" action="/"><input type="search" name="q" placeholder="Rechercher une actualité…" aria-label="Recherche"><button>Rechercher</button></form>';
 const main=cards.length?'<div class="grid">'+(section==='Brèves'||section?cards.map(g=>card(g)).join(''):dossierCard()+DOSSIERS.slice(1).map(d=>V.dossierCard(d,false)).join('')+cards.map(g=>card(g)).join(''))+'</div>':'<div class="empty">Aucune actualité confirmée dans cette rubrique au moment de la collecte. Les informations ne sont pas fabriquées pour remplir cette page. <a href="/journal">Consulter le journal complet</a>.</div>';
 const more='<section class="section-head"><h2>Journal et provenance</h2><small>Rédaction originale uniquement pour les dossiers vérifiés manuellement</small></section><div class="aside-panel"><p>Une « revue multi-sources » indique qu’au moins deux médias distincts publient sur le même sujet. Cela ne confirme pas automatiquement tous les faits rapportés. Une brève ne prétend pas fournir une analyse complète.</p><details><summary>État détaillé des fournisseurs</summary><ul>'+sources.map(s=>'<li>'+E.esc(s.name)+' : '+(s.ok?'<b>flux reçu</b> ('+s.count+' nouvelles)':'<b>indisponible</b>')+'</li>').join('')+'</ul></details></div>';
 return intro+'<div class="bar">'+search+'<span class="pill">'+new Date().toLocaleDateString('fr-FR',{timeZone:'Europe/Paris',day:'numeric',month:'long',year:'numeric'})+'</span></div>'+status+'<section class="section-head"><h2>'+E.esc(section==='Brèves'?'Le fil des brèves':'Dernières publications')+'</h2><small>Lecture dans JLG Média, sources consultables</small></section>'+main+more;
}
function article(g){
 const header='<div class="breadcrumbs"><a href="/journal">Journal</a> / '+E.esc(g.category)+'</div><article class="reader"><span class="badge">'+(g.kind==='revue'?'Revue de presse, pas enquête indépendante':'Brève sourcée')+'</span><h1>'+E.esc(g.title)+'</h1><div class="meta">'+E.esc(g.sourceNames.join(' · '))+' · '+fmt(g.items[0].date,true)+'</div>';
 const intros=g.kind==='revue'?'<p class="lead">Plusieurs médias ont publié des informations sur ce sujet. JLG Média les réunit pour permettre une lecture croisée, sans attribuer aux sources des faits qu’elles ne présentent pas.</p>':'<p class="lead">Cette information est publiée sous forme de brève, faute de matière suffisante pour écrire un article de fond recoupé.</p>';
 const blocks=g.items.map(i=>'<div class="source"><b>Selon '+E.esc(i.publisher)+'</b><p>'+E.esc(E.brief(i.summary)||'Pas de résumé exploitable dans le flux RSS.')+'</p><a href="'+E.esc(i.url)+'" target="_blank" rel="noopener noreferrer">Consulter le document du média</a><small class="meta">'+fmt(i.date,true)+'</small></div>').join('');
 const guard='<section class="notice warning"><b>Transparence :</b> cette page repose uniquement sur les titres et extraits publics fournis par '+(g.publishers>1?'plusieurs rédactions':'la source indiquée')+'. Elle ne prétend ni avoir consulté les articles complets ni vérifier indépendamment chaque déclaration. Les extraits sont volontairement limités.</section>';
 return header+intros+'<h2>Ce que rapportent les publications</h2>'+blocks+'<h2>Ce qui demande une vérification complémentaire</h2><p>Le contexte intégral, les éventuelles divergences entre sources et les conséquences précises ne sont pas connus à partir des seules métadonnées RSS. JLG Média ne les reconstitue pas par supposition.</p>'+guard+'<p><a class="back" href="/journal">← Retour au journal</a></p></article>';
}
function dossier(d){
 const links=d.sources.map(s=>'<li><a class="ed-source-anchor" target="_blank" rel="noopener noreferrer" href="'+E.esc(s.url)+'">'+E.esc(s.title)+'</a></li>').join('');
 const sections=d.sections.map(s=>'<section><h2>'+E.esc(s.title)+'</h2>'+s.paragraphs.map(p=>'<p>'+E.esc(p)+'</p>').join('')+'</section>').join('');
 const related=DOSSIERS.filter(x=>x.slug!==d.slug).filter(x=>x.section===d.section).slice(0,2);
 const end=related.length?'<div class="ed-related">'+related.map(x=>'<a href="/dossier/'+E.esc(x.slug)+'">'+E.esc(x.title)+' →</a>').join('')+'</div>':'';
 return '<div class="breadcrumbs"><a href="/">La Une</a> / <a href="/journal">Journal</a> / '+E.esc(d.section)+'</div><article class="reader"><span class="ed-kicker">'+E.esc(d.eyebrow||d.section+' · ARTICLE DE FOND')+'</span><h1>'+E.esc(d.title)+'</h1><p class="lead">'+E.esc(d.subtitle)+'</p><div class="ed-byline"><span><strong>Rédaction · JLG Média</strong></span><time datetime="'+E.esc(d.date)+'">'+fmt(d.date)+'</time><span>'+E.esc(d.readTime||'Lecture 5 min')+'</span></div>'+I.picture(d,'article')+sections+'<section class="source"><h2 class="ed-source-header">Sources et documents consultés</h2><p>Documents et articles de référence utilisés pour établir les faits.</p><ol>'+links+'</ol></section>'+end+'<p><a class="back" href="/journal">← Retour aux articles</a></p></article>';
}
function matchPresentation(m,now=Date.now()){
 const ready=Number.isInteger(m.homeScore)&&Number.isInteger(m.awayScore);
 const state=m.state||(m.status?.includes('Terminé')?'final':m.status?.includes('En cours')?'live':'scheduled');
 const stamp=Date.parse(m.kickoff||'');
 const alreadyPlayed=Number.isFinite(stamp)&&now>stamp+3*60*60*1000;
 if(state==='cancelled')return {kind:'pending',label:m.status||'Rencontre reportée',score:'Reporté'};
 if(state==='final')return ready?{kind:'final',label:'Terminé',score:m.homeScore+' – '+m.awayScore}:{kind:'pending',label:'Terminé · score non communiqué',score:'Résultat indisponible'};
 if(state==='live')return ready?{kind:'live',label:'EN DIRECT · source fournisseur',score:m.homeScore+' – '+m.awayScore}:{kind:'live',label:'En cours · score non communiqué',score:'Score indisponible'};
 if(alreadyPlayed)return {kind:'pending',label:'Résultat non confirmé par le fournisseur',score:'Résultat attendu'};
 const time=m.time?.match(/(\d{2}):(\d{2})/)||null;
 const clock=time?time[1]+' h '+time[2]:'Heure à confirmer';
 return {kind:'scheduled',label:'À venir',score:clock};
}
function matchCard(l){
 const rows=l.events.map(m=>{
  const display=matchPresentation(m);
  const link=m.url?'<a class="source-link" href="'+E.esc(m.url)+'" target="_blank" rel="noopener noreferrer">Fiche du match</a>':'';
  return '<div class="match"><div class="match-head"><strong>'+E.esc(m.home)+'<br>'+E.esc(m.away)+'</strong><span class="match-score '+display.kind+'">'+E.esc(display.score)+'</span></div><small><span class="match-status '+display.kind+'">'+E.esc(display.label)+'</span> · '+E.esc(m.time||'Heure non confirmée')+(link?' · '+link:'')+'</small></div>';
 }).join('');
 return '<section class="score-card"><div class="badge">'+E.esc(l.group||'International')+' · '+E.esc(l.sport)+'</div><h3>'+E.esc(l.name)+'</h3>'+rows+'<p class="meta">Source : <a href="'+E.esc(l.url)+'" target="_blank" rel="noopener noreferrer">'+E.esc(l.sport==='Handball'?'TheSportsDB · couverture partielle':'ESPN')+'</a></p></section>';
}
function scoreNav(sport,date,mode='scores'){
 const types=['Tous','Football','Basket','Rugby','Handball'];
 const route=mode==='standings'?'/classements':'/scores';
 const tabs='<div class="filters">'+types.map(s=>'<a class="'+(s===sport?'on':'')+'" href="'+route+'?sport='+encodeURIComponent(s)+'&jour='+date+'">'+E.esc(s)+'</a>').join('')+'</div>';
 const form='<form class="filters" method="get" action="'+route+'"><input type="hidden" name="sport" value="'+E.esc(sport)+'"><label for="jour">Journée</label><input type="date" name="jour" id="jour" required value="'+date+'"><button>Afficher</button></form>';
 return tabs+'<div class="filters"><a href="'+route+'?sport='+encodeURIComponent(sport)+'&jour='+A.offset(date,-1)+'">← Veille</a><a href="'+route+'?sport='+encodeURIComponent(sport)+'&jour='+A.offset(date,1)+'">Lendemain →</a></div>'+form;
}
function scorePage(data){
 const {sport,date,leagues}=data;
 const good=leagues.filter(l=>l.ok),withMatches=good.filter(l=>l.events.length),without=good.filter(l=>!l.events.length),failed=leagues.filter(l=>!l.ok);
 const total=withMatches.reduce((n,l)=>n+l.events.length,0);
 const scheduled=withMatches.flatMap(l=>l.events).filter(m=>matchPresentation(m).kind==='scheduled').length;
 const final=withMatches.flatMap(l=>l.events).filter(m=>matchPresentation(m).kind==='final').length;
 const matchList=withMatches.map(matchCard).join('');
 const empty='<div class="empty"><strong>Aucun match confirmé dans les flux interrogés pour cette journée.</strong><p>Il peut y avoir des rencontres non couvertes, notamment en rugby et en handball. Consulte les calendriers officiels ci-dessous.</p></div>';
 const secondary=without.length||failed.length?'<details class="aside-panel" style="margin-top:16px"><summary>Compétitions sans rencontre ou source indisponible ('+(without.length+failed.length)+')</summary><p class="scores-summary">L’absence de résultat dans un flux ne prouve pas l’absence d’un match.</p><ul>'+without.map(l=>'<li>'+E.esc(l.name)+' : aucune rencontre retournée</li>').join('')+failed.map(l=>'<li>'+E.esc(l.name)+' : fournisseur indisponible</li>').join('')+'</ul></details>':'';
 return '<section class="intro"><span class="eyebrow">Sport · Calendrier et résultats</span><h1>Matchs &amp; résultats</h1><p>Le coup d’envoi, le direct et le résultat sont présentés séparément. L’heure est celle de Paris, les scores proviennent des fournisseurs indiqués.</p></section>'
 +'<div class="scores-highlight"><span>'+total+' rencontres affichées</span><span>'+scheduled+' à venir</span><span>'+final+' résultats confirmés</span><span>'+good.length+'/'+leagues.length+' sources accessibles</span></div>'
 +scoreNav(sport,date)
 +'<div class="bar"><span class="pill">Journée du '+E.esc(date)+'</span><a class="pill" href="/calendrier">Agenda handball sur 7 jours</a><a class="pill" href="/classements">Classements</a></div>'
 +'<div class="score-grid">'+V.officialCards(date,sport)+(matchList||empty)+'</div>'+secondary
 +'<p class="scores-summary">Mise à jour : '+fmt(data.fetchedAt,true)+'. Un match programmé aujourd’hui peut ne pas avoir encore de score. Pour le rugby et le handball, les données gratuites ne couvrent pas toutes les compétitions.</p>'
 +'<section class="aside-panel" style="margin-top:16px"><h3>Résultats officiels complémentaires</h3><a href="https://www.lnh.fr/daikin-starligue/calendrier" target="_blank" rel="noopener noreferrer">LNH · Starligue</a><a href="https://www.eurohandball.com/en/" target="_blank" rel="noopener noreferrer">EHF · Handball européen</a><a href="https://www.ihf.info/" target="_blank" rel="noopener noreferrer">IHF · Handball international</a><a href="https://www.lnr.fr/" target="_blank" rel="noopener noreferrer">LNR · Top 14 et Pro D2</a><a href="https://www.world.rugby/matches" target="_blank" rel="noopener noreferrer">World Rugby · Sélections</a></section>';
}
function tableCard(name,res){
 return '<section class="score-card"><h3>'+E.esc(name)+'</h3>'+(res.records.length?'<table class="standings"><thead><tr><th>'+E.esc(name==='NBA'?'Conf. / rang':'#')+'</th><th>Équipe</th><th>J</th><th>'+E.esc(name==='NBA'?'Bilan':'Pts')+'</th></tr></thead><tbody>'+res.records.map(r=>'<tr><td>'+E.esc(name==='NBA'?(r.conference+' '+(r.rank??'—')):r.rank)+'</td><td>'+E.esc(r.team)+'</td><td>'+E.esc(r.played??'—')+'</td><td>'+E.esc(r.points??'—')+'</td></tr>').join('')+'</tbody></table>':'<p class="feed-errors">Classement indisponible. Aucune valeur reconstituée.</p>')+'<div class="meta"><a target="_blank" rel="noopener noreferrer" href="'+E.esc(res.url)+'">Données ESPN</a></div></section>';
}
async function standingsPage(sport,date){
 if(sport==='Rugby'||sport==='Handball'){
  return '<section class="intro"><span class="eyebrow">Transparence sportive</span><h1>Classements '+E.esc(sport)+'</h1><p>Aucune source automatisée disponible pour un classement suffisamment vérifié de cette discipline. Nous ne remplaçons jamais le tableau manquant par le classement d’un autre sport.</p></section>'+scoreNav(sport,date,'standings')+'<div class="notice warning">Classement indisponible dans cette édition. Consultez les matchs et les références officielles ci-dessous.</div><section class="aside-panel"><h3>Sources sportives</h3><a href="/scores?sport='+encodeURIComponent(sport)+'">Scores et rencontres de '+E.esc(sport)+'</a>'+(sport==='Handball'?'<a href="https://www.eurohandball.com/en/" target="_blank" rel="noopener noreferrer">EHF : compétitions et classements</a><a href="https://www.ihf.info/" target="_blank" rel="noopener noreferrer">IHF : équipes nationales</a>':'<a href="https://www.world.rugby/" target="_blank" rel="noopener noreferrer">World Rugby</a><a href="https://top14.lnr.fr/" target="_blank" rel="noopener noreferrer">LNR : rugby français</a>')+'</section>';
 }
 const competitions=(sport==='Basket'?[['NBA','basketball','nba']]:[['Ligue 1','soccer','fra.1'],['Premier League','soccer','eng.1'],['Liga','soccer','esp.1'],['Serie A','soccer','ita.1']]);
 const out=await Promise.all(competitions.map(async ([n,k,c])=>[n,await S.standings(k,c)]));
 return '<section class="intro"><span class="eyebrow">Données sportives</span><h1>Classements</h1><p>Classements transmis par ESPN. Pour la NBA, les rangs sont ceux de chaque conférence (playoffSeed), et les bilans correspondent aux victoires-défaites.</p></section>'+scoreNav(sport,date,'standings')+'<div class="score-grid">'+out.map(([n,r])=>tableCard(n,r)).join('')+'</div><p class="notice warning">Pour le rugby et le handball, les classements ne sont pas encore disponibles dans une source structurée fiable. Consulte les calendriers et résultats officiels depuis la rubrique Scores.</p>';
}
function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function html(res,body,status=200){res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=0,must-revalidate','X-Content-Type-Options':'nosniff'});res.end(body)}
async function handler(req,res){
 const url=new URL(req.url||'/','https://jlg-media.render.local'),p=url.pathname;
 try{
  if(p==='/api/health')return json(res,{ok:true,product:'JLG Média · édition Render',version:'0.12.0',independent:true,timestamp:new Date().toISOString()});
  if(p==='/icon-192.png'||p==='/icon-512.png'||p==='/apple-touch-icon.png'){
    const size=p==='/icon-512.png'?512:p==='/apple-touch-icon.png'?180:192;
    res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'});return res.end(BRAND.png(size));
   }
   if(['/style.css','/frontpage.css','/site-rebrand.css','/icon.svg','/manifest.webmanifest','/sw.js','/install.js'].includes(p)){
   const fn=path.join(ROOT,pathSafe(p.slice(1))),type=p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.js')?'application/javascript':'application/manifest+json';
   res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':p==='/sw.js'?'no-cache':'public,max-age=3600'});return fs.createReadStream(fn).pipe(res);
  }
  if(p==='/dossiers'||p==='/dossier')return html(res,layout(P.dossierIndex(),'Nos articles · La rédaction','/dossiers'));
  if(p.startsWith('/dossier/')||(p==='/journal'&&url.searchParams.get('dossier'))){
   const slug=p.startsWith('/dossier/')?p.split('/').pop():url.searchParams.get('dossier');
   const d=DOSSIERS.find(x=>x.slug===slug);
   return d?html(res,layout(dossier(d),d.title,'/journal')):html(res,layout('<div class="empty">Dossier introuvable.</div>','Dossier','/journal'),404);
  }
  if(p==='/calendrier'){
    const start=url.searchParams.get('debut')||S.today();
    if(!S.dateValid(start))return html(res,layout('<div class="empty">Date invalide.</div>','Date invalide'),400);
    return html(res,layout(V.calendarPage(await A.week(start)),'Calendrier de handball','/calendrier'));
   }
  if(p==='/scores'||p==='/classements'||p==='/api/scores'){
   const sport=url.searchParams.get('sport')||'Tous',day=url.searchParams.get('jour')||S.today();
   if(!S.dateValid(day))return p==='/api/scores'?json(res,{error:'Date invalide'},400):html(res,layout('<div class="empty">Date invalide.</div>','Date invalide'),400);
   if(!['Tous','Football','Basket','Rugby','Handball'].includes(sport))return html(res,layout('<div class="empty">Sport invalide.</div>','Sport invalide'),400);
   if(p==='/classements')return html(res,layout(await standingsPage(sport,day),'Classements','/classements'));
   const data=await S.scores(sport,day);
   return p==='/api/scores'?json(res,data):html(res,layout(scorePage(data),'Scores & Direct','/scores'));
  }
  if(['/', '/journal','/article','/api/actualites','/breves'].includes(p)){
   // The curated edition and RSS briefing are distinct editorial products.
   if(p==='/journal')return html(res,layout(P.dossierIndex(),'Les articles de la rédaction','/journal'));
   const section=url.searchParams.get('section')||'';
   if(p==='/'&&!section&&!url.searchParams.has('q')){
    const feed=await load();
    return html(res,layout(P.cover(E.combine(feed.items)),'La Une · Édition du 22 novembre','/'));
   }
   const feed=await load();
   let groups=E.combine(feed.items);
   if(p==='/api/actualites')return json(res,{fetchedAt:feed.at,sources:feed.sources,groups:groups.slice(0,100).map(x=>({id:x.id,title:x.title,category:x.category,kind:x.kind,sourceCount:x.count}))});
   if(p==='/article'){
    const g=groups.find(x=>x.id===url.searchParams.get('id'));
    return g?html(res,layout(article(g),g.title,'/breves')):html(res,layout('<div class="empty">Cette brève ne figure plus dans le fil récent. <a href="/breves">Consulter les dernières brèves</a>.</div>','Brève archivée','/breves'),404);
   }
   const q=E.norm(url.searchParams.get('q')||'');
   if(q)groups=groups.filter(g=>E.norm(g.title+' '+g.summary+' '+g.sourceNames.join(' ')).includes(q));
   if(p==='/breves'||section==='Brèves'||q)return html(res,layout(journalPage(groups,feed,'Brèves'),'Les brèves des médias','/breves'));
   if(section)return html(res,layout(P.sectionPage(section,feed,groups),'Actualités '+section,'/?section='+encodeURIComponent(section)));
   return html(res,layout(P.cover(groups),'La Une · Édition du 22 novembre','/'));
  }
  return html(res,layout('<section class="intro"><h1>Page introuvable</h1><p>Cette adresse n’existe pas dans l’édition indépendante.</p></section>','404'),404);
 }catch(e){console.error('JLG Media request error',e);return html(res,layout('<div class="empty">Le service connaît un problème temporaire. Aucune information non vérifiée n’a été affichée. <a href="/">Réessayer</a>.</div>','Indisponible'),503)}
}
if(require.main===module){
 const port=Number(process.env.PORT)||3000;
 http.createServer((req,res)=>{Promise.resolve(handler(req,res)).catch(e=>{console.error(e);res.writeHead(500);res.end('Erreur serveur')})}).listen(port,'0.0.0.0',()=>console.log('JLG Media listening on '+port));
}
module.exports={handler,layout,card,article,dossier,matchCard,matchPresentation,scorePage};
