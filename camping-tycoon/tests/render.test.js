/* Camping Tycoon — smoke tests Canvas 2,5D.
 * Les dessins sont exécutés sans navigateur physique pour détecter les exceptions
 * des fonctions de rendu et des nouveaux sprites. */
const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../src/data.js');
const S=require('../src/sim.js');

const counters={calls:0,images:0,shapes:0};
function fakeContext(){
  const gradient={addColorStop(){}};
  return new Proxy({}, {
    get(obj,name){
      if(name==='measureText')return value=>({width:String(value).length*7});
      if(name==='createRadialGradient'||name==='createLinearGradient')return()=>gradient;
      if(name==='drawImage')return()=>{counters.images++};
      if(name==='fill'||name==='stroke')return()=>{counters.shapes++};
      if(name in obj)return obj[name];
      return()=>{counters.calls++};
    },
    set(obj,name,value){obj[name]=value;return true}
  });
}
function fakeCanvas(){
  const el={width:832,height:384,style:{},getBoundingClientRect(){
    return{width:832,height:384,top:0,left:0}
  }};
  el.getContext=()=>el._context||(el._context=fakeContext());
  return el;
}
const oldDocument=globalThis.document;
const oldCT=globalThis.CT;
globalThis.document={createElement:tag=>tag==='canvas'?fakeCanvas():{}};
globalThis.CT={data:D,sim:S};
require('../src/render.js');
const CT=globalThis.CT;
test('V1.8 — les 18 types de bâtiments ont une vignette Canvas valide',()=>{
  const types=Object.keys(D.BUILDINGS);
  assert.equal(types.length,18);
  for(const type of types){
    const icon=CT.drawSpriteIcon(type);
    assert.ok(icon.width>0&&icon.height>0,type);
  }
  assert.ok(counters.shapes>100);
});
test('V1.8 — tous les équipements du domaine passent dans le moteur de rendu',()=>{
  const s=S.newGame({seed:818,mode:'discovery'});
  const renderer=new CT.Renderer(fakeCanvas());
  renderer.resize();renderer.fit(s);
  assert.doesNotThrow(()=>renderer.draw(s,0,1000));
  assert.ok(counters.images>0);
  for(const type of ['cinema','bakery','petanque','spa']){
    assert.equal(S.ofType(s,type).length,1);
  }
});
test('V1.8 — scène nocturne avec projecteur et animations de loisirs',()=>{
  const s=S.newGame({seed:819,mode:'discovery'});
  const renderer=new CT.Renderer(fakeCanvas());
  renderer.resize();renderer.fit(s);
  s.minute=21*60;s.weather={type:'sun',temp:20};
  assert.doesNotThrow(()=>renderer.draw(s,.5,12000));
  assert.ok(counters.shapes>200);
});
test('V1.8 — pluie et orage sans plantage du Canvas',()=>{
  const s=S.newGame({seed:820,mode:'discovery'});
  const renderer=new CT.Renderer(fakeCanvas());renderer.resize();renderer.fit(s);
  for(const type of ['rain','storm','heat']){
    s.weather={type,temp:type==='heat'?38:16};
    assert.doesNotThrow(()=>renderer.draw(s,.2,4800));
  }
});
// Chaque test Node s'exécute dans son propre processus du fichier.
// Les doubles DOM sont un environnement de test, pas une mesure de FPS réelle.
