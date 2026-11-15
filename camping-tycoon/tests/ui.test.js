/* Camping Tycoon — tests des écrans et boutons de version/direction.
 * Le code source de l'interface est exécuté en VM avec DOM simulé.
 * Le démarrage graphique est neutralisé ; les vraies fonctions de panneaux
 * et de navigation restent inchangées. */
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../src/data.js');
const S=require('../src/sim.js');

function testUI(){
  const nodes={};
  function el(){return {
    innerHTML:'',textContent:'',value:'',scrollTop:0,tagName:'DIV',style:{},dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false}},
    contains(){return false},querySelector(){return null},querySelectorAll(){return[]},
    addEventListener(){},appendChild(){}
  }}
  const doc={
    activeElement:{tagName:'BODY'},
    getElementById(id){return nodes[id]||(nodes[id]=el())},
    querySelectorAll(){return[]},
    addEventListener(){}
  };
  const CT={data:D,sim:S,TS:32,save:{hasAuto:()=>true},
    drawSpriteIcon:()=>({width:128,height:128}),sfx:{play(){}},
    Renderer:class{resize(){}fit(){}}
  };
  const context={CT,document:doc,window:{addEventListener(){}},navigator:{},
    performance:{now:()=>1},setTimeout(){},requestAnimationFrame(){},
    matchMedia:()=>({matches:false}),location:{},
    fetch:async()=>({ok:true,json:async()=>({version:'1.8.0'})})};
  context.globalThis=context;
  const original=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
  const marker='  boot();\n})();';
  assert.ok(original.includes(marker),'boot marker absent');
  const script=original.replace(marker,`  globalThis.__uiTest={
    setGame(v){s=v},titleScreen,newGameDialog,pDirector,pLife,releaseHistory,
    openPanel,checkOnlineVersion
  };
})();`);
  vm.runInNewContext(script,context,{filename:'ui.js'});
  const api=context.__uiTest;
  assert.ok(api,'UI API exposée pour le test');
  api.setGame(S.newGame({seed:812,mode:'discovery'}));
  return {api,nodes};
}

test('V1.8 UI : écran accueil version visible et vraies vignettes',()=>{
  const {api,nodes}=testUI();api.titleScreen(true);
  const home=nodes.modalCard.innerHTML;
  assert.ok(home.includes('VERSION 1.8.0'));
  for(const type of ['petanque','cinema','bakery','spa'])
    assert.ok(home.includes('data-ct-preview="'+type+'"'),type);
  assert.ok(home.includes('data-act="history"'));
  assert.ok(home.includes('Continuer ma partie'));
});
test('V1.8 UI : choix du mode découverte et conservation du classique',()=>{
  const {api,nodes}=testUI();api.newGameDialog();
  const html=nodes.modalCard.innerHTML;
  assert.ok(html.includes('Démarrer normalement'));
  assert.ok(html.includes('Découvrir les nouveautés'));
  assert.ok(html.includes('8 nouveautés V1.7 et V1.8'));
  assert.ok(html.includes('remplacera la sauvegarde'));
});
test('V1.8 UI : le panneau Direction comporte 3 campagnes et 3 programmes',()=>{
  const {api,nodes}=testUI();api.openPanel('director');
  const html=nodes.pbody.innerHTML;
  assert.ok(html.includes('Bureau du directeur'));
  assert.ok(html.includes('CA contractuel /14 j'));
  for(const kind of ['local','families','summer'])
    assert.ok(html.includes('data-campaign="'+kind+'"'),kind);
  for(const kind of ['calm','family','festive'])
    assert.ok(html.includes('data-program="'+kind+'"'),kind);
});
test('V1.8 UI : panneau Vie et historique contiennent les nouveaux bâtiments',()=>{
  const {api,nodes}=testUI();
  const html=api.pLife();
  for(const type of ['minigolf','multisport','bikes','laundry','petanque','cinema','bakery','spa'])
    assert.ok(html.includes('data-ct-preview="'+type+'"'),type);
  api.releaseHistory(()=>{});
  assert.ok(nodes.modalCard.innerHTML.includes('Version 1.8.0'));
  assert.ok(nodes.modalCard.innerHTML.includes('Version 1.7.1'));
});
test('V1.8 UI : recherche de version retourne le résultat dans la fenêtre',async()=>{
  const {api,nodes}=testUI();api.titleScreen(true);
  await api.checkOnlineVersion();
  assert.ok(nodes.updateStatus.textContent.includes('1.8.0 à jour'));
});
