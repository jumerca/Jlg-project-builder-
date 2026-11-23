'use strict';
const {DOSSIERS}=require('./dossiers');
const {ROLLING,UPDATED_AT}=require('./edition-rolling');
const E=require('./editorial');
const I=require('./photos');
const PRINT_DATE='Dimanche 22 novembre 2026';
const href=d=>'/dossier/'+encodeURIComponent(d.slug);
const category=s=>s==='Corrèze'?'corr':'';
const headline=d=>'<a href="'+href(d)+'">'+E.esc(d.title)+'</a>';
const sourceCount=d=>Array.isArray(d.sources)?d.sources.length:0;
const label=d=>'<span class="ed-kicker">'+E.esc(d.eyebrow||(d.section+' · DOSSIER'))+'</span>';
function newsroomCard(d,variant='normal'){
 const cls=variant==='side'?'ed-story ed-story-side':variant==='wide'?'ed-story ed-story-wide':'ed-story';
 return '<article class="'+cls+'">'+I.picture(d,'card')+'<div class="ed-story-kicker">'+E.esc(d.section)+' <span>· ANALYSE</span></div><h3>'+headline(d)+'</h3><p>'+E.esc(d.subtitle)+'</p><div class="ed-story-bottom"><span>'+sourceCount(d)+' sources · JLG Média</span><a href="'+href(d)+'">Lire l’article <span aria-hidden="true">↗</span></a></div></article>';
}
function homeEligible(d){
 if(!d||!d.slug||!d.title)return false;
 if(d.section==='Corrèze'||d.scope==='local'||d.scope==='regional')return false;
 if(d.scope&&d.scope!=='national'&&d.scope!=='international')return false;
 if(d.section==='France'||d.section==='International')return true;
 if(d.section!=='Sport')return false;
 if(d.scope==='national'||d.scope==='international')return true;
 const t=E.norm([d.slug,d.eyebrow||'',d.title||''].join(' '));
 return /ligue 1|champions league|equipe de france|euro feminin|mondial|coupe du monde|nba/.test(t);
}
function publishedArticles(){
 return DOSSIERS.filter(d=>d&&d.slug&&d.title&&Array.isArray(d.sections)&&d.sections.some(s=>Array.isArray(s.paragraphs)&&s.paragraphs.length)&&Array.isArray(d.sources)&&d.sources.length);
}
function cover(news=[]){
 // The homepage displays exclusively authored JLG Média national / world reports.
 // RSS titles are research leads, NEVER editorial articles or homepage headlines.
 const eligible=publishedArticles().filter(homeEligible).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const rolling=eligible.filter(d=>ROLLING.some(r=>r.slug===d.slug));
 const lead=rolling.find(d=>d.priority==='une')||eligible.find(d=>d.priority==='une')||eligible[0];
 if(!lead)return '<section class="ed-archive-intro"><span class="ed-kicker">JLG MÉDIA · LA UNE</span><h1>À la une</h1><p>Les prochains articles nationaux et internationaux paraîtront après vérification et rédaction par JLG Média.</p></section>';
 const rest=eligible.filter(d=>d.slug!==lead.slug);
 const aside=rest.slice(0,2),more=rest.slice(2,9);
 const editionDay=lead.date;
 const displayedDate=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Paris'}).format(new Date(editionDay+'T12:00:00Z'));
 const latest=rolling.length>0?rolling[0]:lead;
 const leadFooter='<div class="ed-lead-footer"><span>JLG MÉDIA · '+E.esc(lead.section)+' · '+sourceCount(lead)+' RÉFÉRENCES</span><a href="'+href(lead)+'">Lire l’article <span aria-hidden="true">↗</span></a></div>';
 return '<div class="ed-cover">'
  +'<header class="ed-compact-head"><div><span class="ed-front-number">FRANCE · INTERNATIONAL · SPORT</span><h1>À la une</h1></div><time class="ed-compact-date" datetime="'+E.esc(editionDay)+'">Édition du '+E.esc(displayedDate)+'</time></header>'
  +'<section class="ed-lead-grid"><article class="ed-lead">'
  +I.picture(lead,'lead')
  +'<div class="ed-lead-text">'+label(lead)+'<h2>'+headline(lead)+'</h2><p>'+E.esc(lead.subtitle||'')+'</p>'+leadFooter+'</div></article>'
  +'<div class="ed-lead-side">'+aside.map(d=>newsroomCard(d,'side')).join('')+'</div></section>'
  +(more.length?'<div class="ed-divider"><span>01</span><h2>Les autres titres</h2><a href="/dossiers">Tous les articles ↗</a></div><section class="ed-archive-grid">'+more.map(d=>newsroomCard(d)).join('')+'</section>':'')
  +'<div class="ed-divider"><span>02</span><h2>Les rubriques du journal</h2></div>'
  +'<nav class="ed-archive-filter" aria-label="Choisir une rubrique"><a href="/?section=France">France</a><a href="/?section=International">International</a><a href="/?section=Sport">Sport</a><a href="/?section=Corr%C3%A8ze">Corrèze</a><a href="/breves">En bref</a></nav>'
  +'<p class="ed-edition-note">Dernière publication rédactionnelle : '+E.esc(latest.date)+'. La Une ne présente que des articles rédigés pour JLG Média ; les informations régionales sont dans leur rubrique dédiée.</p></div>';
}
function dossierIndex(){
 return '<section class="ed-archive-intro"><span class="ed-kicker">LES ARTICLES DE LA RÉDACTION</span><h1>Le journal, <em>sans raccourcis.</em></h1><p>Une bibliothèque de '+DOSSIERS.length+' articles rédigés pour JLG Média : faits documentés, contexte, explications originales et liens vers les sources. Les sujets ne sont pas générés automatiquement à partir des titres RSS.</p></section><div class="ed-archive-filter"><a href="/journal">Tous</a><a href="/?section=International">International</a><a href="/?section=France">France</a><a href="/?section=Corr%C3%A8ze">Corrèze</a><a href="/?section=Sport">Sport</a><a href="/breves">Brèves →</a></div><section class="ed-archive-grid">'+DOSSIERS.map(d=>newsroomCard(d)).join('')+'</section>';
}
function sectionPage(section){
 const chosen=publishedArticles().filter(d=>d.section===section).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 return '<section class="ed-archive-intro"><span class="ed-kicker">LE JOURNAL · RUBRIQUE</span><h1>'+E.esc(section)+'</h1><p>Articles, analyses et informations courtes écrits par la rédaction de JLG Média.</p></section>'
  +(chosen.length?'<div class="ed-archive-grid">'+chosen.map(d=>newsroomCard(d)).join('')+'</div>':'<div class="empty">Aucun article de la rédaction actuellement publié dans cette rubrique.</div>');
}
function shortPage(){
 const shorts=publishedArticles().filter(d=>d.format==='breve').sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const picks=(shorts.length?shorts:publishedArticles().slice(0,8)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const cards=picks.map(d=>'<article class="article-card"><span class="badge">'+E.esc(d.section)+' · '+(d.format==='breve'?'Brève de la rédaction':'À retenir')+'</span><h3><a href="'+href(d)+'">'+E.esc(d.title)+'</a></h3><p>'+E.esc(d.subtitle||d.sections[0]?.paragraphs?.[0]||'')+'</p><div class="meta"><span>JLG Média · '+E.esc(d.date)+'</span><a href="'+href(d)+'">Lire →</a></div></article>').join('');
 return '<section class="ed-archive-intro"><span class="ed-kicker">LA RÉDACTION · EN BREF</span><h1>En bref</h1><p>Informations rédigées pour JLG Média. Les titres et extraits des autres éditeurs ne sont pas publiés comme nos propres articles.</p></section>'
  +(cards?'<div class="grid">'+cards+'</div>':'<div class="empty">Les prochaines brèves paraîtront après rédaction.</div>');
}

module.exports={cover,dossierIndex,sectionPage,shortPage,homeEligible,publishedArticles,newsroomCard,PRINT_DATE};
