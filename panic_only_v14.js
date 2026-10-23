'use strict';
// Quiz Panic Live V1.4: replace dual-show home with Panic-only experience.
// No mutation of the rest of the game engine; WebSocket rooms remain compatible.
function applyPanicOnly(html){
  let source=html;
  function unique(before,after,what){
    const n=source.split(before).length-1;
    if(n!==1)throw Error('Panic-only '+what+' matches: '+n);
    source=source.replace(before,after);
  }
  source=source.replace(/<title>Quiz Panic Live[^<]*<\/title>/,'<title>Quiz Panic Live — Panic Arena · V1.4</title>');
  unique('✨ 2 émissions, 1 grand délire','⚡ UN SEUL JEU, UN MAXIMUM DE PANIKOS','show label');
  unique('Un plateau. Deux jeux. Zéro répit.','32 concurrents. Quatre cases. Un seul champion.','tagline');
  unique('Dans l’arène, affronte 31 Panikos qui courent, hésitent et tombent dans des trappes en cas d’erreur. Côté public, trouve les réponses qui mettent la foule en délire !','Affronte 31 Panikos, cours vers la bonne réponse et marque des points de rapidité. Entre les trappes et les cases collantes, personne n’est à l’abri !','intro');
  unique('CHOISIS TON ÉMISSION','PANIC ARENA','section title');
  unique('Deux mécaniques différentes, un même présentateur déjanté.','Un jeu télé complètement fou, en solo ou entre amis.','section description');
  unique('ÉMISSION 01 · RÉFLEXES & BLUFF','RÉFLEXES · RAPIDITÉ · CATASTROPHES','overline');
  unique('Ton personnage te suit dans les deux émissions et dans les salons en ligne.','Ton Paniko te suit en solo et dans les salons en ligne.','workshop');
  const start=source.indexOf('<div class="show-card crowd-card">');
  const avatar=source.indexOf('avatarWorkshop()',start);
  const ending=source.lastIndexOf('</div></div>',avatar);
  if(start<0||avatar<0||ending<start||ending>avatar)throw Error('Panic-only missing second show card');
  source=source.slice(0,start)+'</div>'+source.slice(ending+12);
  const stat=/<div class="mini-stat"><strong>[^<]+<\/strong>défis foule<\/div>/;
  if(!stat.test(source))throw Error('Panic-only crowd stat missing');
  source=source.replace(stat,'<div class="mini-stat"><strong>20</strong>points au plus rapide</div>');
  source=source.replace(/\$\('bankCount'\)\.textContent=[^\n]+;/,"$('bankCount').textContent='· '+BANK.length.toLocaleString('fr-FR')+' questions · Panic Arena';");
  unique("if(S.screen==='game')return S.gameStyle==='guess'?renderGuessGame():renderGame();","if(S.screen==='game')return renderGame();",'game route');
  unique("const isGuess=S.gameStyle==='guess', cats=isGuess?guessCategories:categories;","const isGuess=false, cats=categories;",'single solo setup');
  unique("if(['soloPanic','soloGuess','onlinePanic','onlineGuess'].includes(act)){S.gameStyle=act.endsWith('Guess')?'guess':'panic';","if(['soloPanic','onlinePanic'].includes(act)){S.gameStyle='panic';",'mode routing');
  unique("const pool=GUESS_BANK.filter(q=>S.category==='Toutes'||q.category===S.category);","",'unused guess pool');
  unique("const deck=S.gameStyle==='guess'?sampleGuessDeck(S.category,S.total):sampleDeck(S.category,S.total);","const deck=sampleDeck(S.category,S.total);",'panic deck');
  unique("if(S.gameStyle==='guess'){startGuessSoloRound();return;}","",'guess branch');
  unique("if(act==='customize'){","if(act==='soloGuess'||act==='onlineGuess'||act==='guessHint'){toast('Seul Panic Arena est disponible.');return;}if(act==='customize'){",'old route');
  source=source.replace('function renderHome(){',"function renderHome(){S.gameStyle='panic';");
  source=source.replace('function renderOnline(){',"function renderOnline(){S.gameStyle='panic';");
  source=source.replace('function renderSoloSetup(){',"function renderSoloSetup(){S.gameStyle='panic';");
  const rule=source.indexOf('<b>Le Public Décide :</b>');
  if(rule!==-1){const end=source.indexOf('</p>',rule);if(end<0)throw Error('Help markup malformed');source=source.slice(0,rule)+source.slice(end);}
  if(!/^window\.GUESS_BANK=.+;$/m.test(source))throw Error('Guess bank not found');
  source=source.replace(/^window\.GUESS_BANK=.+;$/m,'window.GUESS_BANK=[];');
  source=source.replace('</head>','<style id="panic-only-v14">.show-mode-grid{grid-template-columns:minmax(0,1fr);max-width:970px;margin-inline:auto}.panic-card{max-width:970px}.panic-card .show-actions .btn{flex:1;min-width:150px}.refreshed-hero .subtitle{color:#8fffea}@media(max-width:800px){.show-mode-grid{grid-template-columns:1fr}}</style></head>');
  console.log('Quiz Panic V1.4: solo, multijoueur et PWA = Panic Arena uniquement');
  return source;
}
module.exports={applyPanicOnly};
