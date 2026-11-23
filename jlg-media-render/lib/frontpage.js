'use strict';
const {DOSSIERS}=require('./dossiers');
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
function cover(news=[]){
 const lead=DOSSIERS.find(d=>d.slug==='cop31-antalya-pas-accord-final')||DOSSIERS[0];
 const economy=DOSSIERS.find(d=>d.slug==='choose-france-42-milliards-decryptage');
 const local=DOSSIERS.find(d=>d.slug==='souvigne-correze-barrage-riviere');
 const drought=DOSSIERS.find(d=>d.slug==='correze-restrictions-eau-fin-novembre');
 const sport=DOSSIERS.find(d=>d.slug==='oyonnax-brive-32-22-2026');
 const handball=DOSSIERS.find(d=>d.slug==='euro-feminin-2026-bleues');
 const cup=DOSSIERS.find(d=>d.slug==='mondial-handball-2027-france');
 const used=new Set([lead,economy,local,drought,sport,handball,cup].filter(Boolean).map(d=>d.slug));
 const rest=DOSSIERS.filter(d=>!used.has(d.slug));
 const aside=[economy,local].filter(Boolean);
 const briefs=news.slice(0,7).map((g,i)=>'<li><span class="ed-brief-number">'+String(i+1).padStart(2,'0')+'</span><div><span class="ed-brief-tag">'+E.esc(g.category||'Actualité')+'</span><a href="/article?id='+encodeURIComponent(g.id)+'">'+E.esc(g.title)+'</a><small>'+E.esc(g.sourceNames?.slice(0,2).join(' · ')||'Flux de presse')+' · BRÈVE</small></div></li>').join('');
 return '<div class="ed-cover">'
  +'<header class="ed-compact-head"><div><span class="ed-front-number">JLG MÉDIA · LE JOURNAL</span><h1>À la une</h1></div><time class="ed-compact-date" datetime="2026-11-22">Édition du '+PRINT_DATE+'</time></header>'
  +'<section class="ed-lead-grid"><article class="ed-lead">'
  +I.picture(lead,'lead')
  +'<div class="ed-lead-text">'+label(lead)+'<h2>'+headline(lead)+'</h2><p>'+E.esc(lead.subtitle)+'</p><div class="ed-lead-footer"><span>LE GRAND DOSSIER · '+sourceCount(lead)+' DOCUMENTS SOURCES</span><a href="'+href(lead)+'">Lire notre analyse <span aria-hidden="true">↗</span></a></div></div></article>'
  +'<div class="ed-lead-side">'+aside.map(d=>newsroomCard(d,'side')).join('')+'</div></section>'
  +'<div class="ed-divider"><span>01</span><h2>Les articles de la rédaction</h2><a href="/dossiers">Voir tous les dossiers ↗</a></div>'
  +'<section class="ed-front-grid"><div class="ed-front-main">'
  +'<div class="ed-section-intro"><span>EN CORRÈZE</span><h2>Au plus près du territoire</h2><p>Environnement, vie locale et enjeux qui comptent réellement pour les habitants.</p></div>'
  +'<div class="ed-local-grid">'+[drought,local].filter(Boolean).map(d=>newsroomCard(d)).join('')+'</div>'
  +'<div class="ed-section-intro ed-sport-intro"><span>SPORT</span><h2>Les matchs, au-delà du score</h2><p>Lire le déroulé, replacer les chiffres et expliquer les enjeux.</p></div>'
  +'<div class="ed-local-grid">'+[sport,handball,cup].filter(Boolean).map(d=>newsroomCard(d)).join('')+'</div>'
  +(rest.length?'<div class="ed-local-grid">'+rest.map(d=>newsroomCard(d)).join('')+'</div>':'')
  +'</div><aside class="ed-front-aside"><div class="ed-brief-header"><div><span>EN CONTINU</span><h2>Le fil des brèves</h2></div><span class="ed-mini-dot"></span></div><p class="ed-brief-disclaimer">Informations courtes issues de flux identifiés. Ce sont des dépêches, pas des articles de la rédaction.</p><ol class="ed-brief-list">'+(briefs||'<li>Le fil est momentanément indisponible.</li>')+'</ol><a class="ed-brief-more" href="/breves">Toute l’actualité en brèves ↗</a></aside></section>'
  +'<p class="ed-edition-note">Une datée du 22 novembre 2026 · Sélection et articles rédactionnels non actualisés automatiquement. Pour les derniers événements reçus des fournisseurs, consulter les <a href="/breves">brèves</a> et les <a href="/scores">scores datés</a>.</p></div>';
}
function dossierIndex(){
 return '<section class="ed-archive-intro"><span class="ed-kicker">LES ARTICLES DE LA RÉDACTION</span><h1>Le journal, <em>sans raccourcis.</em></h1><p>Une bibliothèque de '+DOSSIERS.length+' articles rédigés pour JLG Média : faits documentés, contexte, explications originales et liens vers les sources. Les sujets ne sont pas générés automatiquement à partir des titres RSS.</p></section><div class="ed-archive-filter"><a href="/journal">Tous</a><a href="/?section=International">International</a><a href="/?section=France">France</a><a href="/?section=Corr%C3%A8ze">Corrèze</a><a href="/?section=Sport">Sport</a><a href="/breves">Brèves →</a></div><section class="ed-archive-grid">'+DOSSIERS.map(d=>newsroomCard(d)).join('')+'</section>';
}
function sectionPage(section,feed,groups=[]){
 const chosen=DOSSIERS.filter(d=>d.section===section);
 const briefs=groups.filter(g=>g.category===section).slice(0,12);
 const stories=chosen.map(d=>newsroomCard(d)).join('');
 const short=briefs.map(g=>'<li><a href="/article?id='+encodeURIComponent(g.id)+'">'+E.esc(g.title)+'</a><small>'+E.esc(g.sourceNames.slice(0,2).join(' · '))+'</small></li>').join('');
 return '<section class="ed-archive-intro"><span class="ed-kicker">LE JOURNAL · RUBRIQUE</span><h1>'+E.esc(section)+'</h1><p>Les dossiers sont rédigés à partir de documents identifiés ; le fil des brèves est présenté séparément avec ses médias d’origine.</p></section><div class="ed-divider"><span>01</span><h2>Nos articles de fond</h2><a href="/dossiers">Toutes les analyses ↗</a></div>'+(chosen.length?'<div class="ed-archive-grid">'+stories+'</div>':'<div class="empty">Aucun nouvel article de fond vérifié dans cette rubrique pour cette édition. Des brèves sont éventuellement accessibles ci-dessous.</div>')+'<div class="ed-divider"><span>02</span><h2>Le fil des brèves de '+E.esc(section)+'</h2><a href="/breves">Toutes les brèves ↗</a></div>'+(briefs.length?'<ol class="ed-section-briefs">'+short+'</ol>':'<p class="notice">Aucune brève disponible dans ce flux pour le moment.</p>');
}
module.exports={cover,dossierIndex,sectionPage,newsroomCard,PRINT_DATE};
