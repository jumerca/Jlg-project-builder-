'use strict';
const E=require('./editorial'),A=require('./agenda');
const {DOSSIERS}=require('./dossiers');
const fmt=d=>{try{return new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00Z'))}catch{return d}};
function dossierCard(d,featured=false){
 const h=featured?'h2':'h3',cls=featured?'feature':'article-card';
 return '<article class="'+cls+'"><span class="badge">Dossier original · '+E.esc(d.section)+'</span><'+h+'><a href="/dossier/'+E.esc(d.slug)+'">'+E.esc(d.title)+'</a></'+h+'><p>'+E.esc(d.subtitle)+'</p><div class="meta">'+d.sources.length+' références documentaires · '+fmt(d.date)+'</div></article>';
}
function dossiersPage(){
 return '<section class="intro"><span class="eyebrow">JLG Média · Lecture de fond</span><h1>Nos dossiers originaux</h1><p>Des synthèses rédigées à partir de documents identifiés, où les faits, les analyses et les questions encore ouvertes sont séparés. Ces articles ne sont pas des reprises intégrales de leurs sources.</p></section><div class="notice"><b>'+DOSSIERS.length+' dossiers disponibles.</b> Chaque article possède ses références. Les actualités trop courtes restent des brèves.</div><section class="section-head"><h2>Analyses et reportages documentaires</h2></section><div class="grid">'+DOSSIERS.map(d=>dossierCard(d,false)).join('')+'</div>';
}
function officialCards(date,sport){
 if(sport!=='Handball'&&sport!=='Tous')return '';
 const found=A.dailyOfficial(date);if(!found.length)return '';
 return '<section class="score-card"><div class="badge">Calendrier fédéral · Handball féminin</div><h3>Rencontres annoncées</h3>'+found.map(f=>'<div class="match"><div class="match-head"><strong>'+E.esc(f.home)+' — '+E.esc(f.away)+'</strong><b>— : —</b></div><small>'+E.esc(f.competition)+' · '+E.esc(f.time)+' · '+E.esc(f.venue)+'</small><small>Horaire annoncé, aucun score publié dans cette fiche · <a target="_blank" rel="noopener noreferrer" href="'+E.esc(f.url)+'">Source '+E.esc(f.source)+'</a></small></div>').join('')+'<p class="meta">Calendrier relevé le 22 novembre 2026. Les heures peuvent changer : vérifiez les liens officiels.</p></section>';
}
function calendarPage(data){
 const days=data.days.map(day=>{
  const date=day.date,fromFederation=data.official.filter(x=>x.date===date);
  const official=fromFederation.map(x=>'<div class="match"><strong>'+E.esc(x.home)+' — '+E.esc(x.away)+'</strong><small>'+E.esc(x.competition)+' · '+E.esc(x.time)+' · '+E.esc(x.venue)+'</small><small>Programme officiel au 22/11/2026 · <a href="'+E.esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+E.esc(x.source)+'</a></small></div>').join('');
  const remote=day.events.map(x=>'<div class="match"><strong>'+E.esc(x.home)+' — '+E.esc(x.away)+'</strong><small>'+E.esc(x.league||'Handball')+' · '+E.esc(x.status)+'</small><small><a href="'+E.esc(x.url||day.sourceUrl)+'" target="_blank" rel="noopener noreferrer">TheSportsDB : fiche de la rencontre</a></small></div>').join('');
  return '<section class="score-card"><div class="badge">'+fmt(date)+'</div><h3>'+E.esc(date)+'</h3>'+(official||remote?official+remote:'<p class="feed-errors">Aucune rencontre retournée dans ce flux incomplet.</p>')+(day.ok?'':'<p class="feed-errors">Flux communautaire indisponible ce jour.</p>')+'<p class="meta"><a href="/scores?sport=Handball&jour='+date+'">Consulter les résultats de cette journée</a></p></section>';
 }).join('');
 return '<section class="intro"><span class="eyebrow">Sport · L’agenda des prochains jours</span><h1>Calendrier du handball</h1><p>Sept journées avec les rencontres officielles des sélections françaises connues et les autres événements réellement retournés par TheSportsDB. Cette liste est partielle : elle ne remplace pas le calendrier EHF.</p></section><div class="notice">'+E.esc(data.sourceNote)+'</div><div class="filters"><a href="/calendrier?debut='+A.offset(data.start,-7)+'">← Semaine précédente</a><a href="/calendrier?debut='+A.offset(data.start,7)+'">Semaine suivante →</a><a href="/scores?sport=Handball">Scores de handball du jour</a></div><form class="filters" action="/calendrier" method="get"><label for="debut">Date de début</label><input id="debut" name="debut" type="date" required value="'+E.esc(data.start)+'"><button>Afficher</button></form><div class="score-grid">'+days+'</div>';
}
module.exports={dossierCard,dossiersPage,officialCards,calendarPage};