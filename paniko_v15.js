'use strict';
const fs=require('node:fs'),path=require('node:path');
const replacements=
[
 [
  "function monster(i){\n const c=unpackAvatar(i);\n return `<span class=\"monster m${c.palette} shape-${c.shape} gear-${c.accessory} face-${c.face}\" role=\"img\" aria-label=\"Paniko personnalisé\"><i class=\"m-horn h1\"></i><i class=\"m-horn h2\"></i><span class=\"m-body\"><i class=\"m-eye e1\"></i><i class=\"m-eye e2\"></i><i class=\"m-mouth\"></i><i class=\"m-cheek\"></i></span>${c.accessory?`<span class=\"m-gear\" aria-hidden=\"true\">${PANIKO_GEAR[c.accessory]}</span>`:''}<i class=\"m-arm a1\"><i class=\"m-hand\"></i></i><i class=\"m-arm a2\"><i class=\"m-hand\"></i></i><i class=\"m-foot f1\"></i><i class=\"m-foot f2\"></i></span>`;\n}\n",
  "function monster(i){\n const c=unpackAvatar(i);\n return `<span class=\"monster m${c.palette} shape-${c.shape} gear-${c.accessory} face-${c.face}\" role=\"img\" aria-label=\"Paniko personnalisé\"><span class=\"m-shadow\"></span><i class=\"m-horn h1\"></i><i class=\"m-horn h2\"></i><span class=\"m-body\"><span class=\"m-belly\"></span><i class=\"m-brow b1\"></i><i class=\"m-brow b2\"></i><i class=\"m-eye e1\"></i><i class=\"m-eye e2\"></i><i class=\"m-mouth\"></i><i class=\"m-cheek\"></i></span>${c.accessory?`<span class=\"m-gear\" aria-hidden=\"true\">${PANIKO_GEAR[c.accessory]}</span>`:''}<i class=\"m-arm a1\"><i class=\"m-forearm\"></i><i class=\"m-hand\"></i></i><i class=\"m-arm a2\"><i class=\"m-forearm\"></i><i class=\"m-hand\"></i></i><span class=\"m-leg l1\"><i class=\"m-foot f1\"></i></span><span class=\"m-leg l2\"><i class=\"m-foot f2\"></i></span></span>`;\n}\n",
  "monster markup"
 ],
 [
  "576 combinaisons possibles. Ton Paniko te suit en solo et dans les salons entre amis.",
  "576 combinaisons de Panikos, maintenant avec des bras, des jambes et des visages animés. Ton personnage te suit en solo et en ligne.",
  "workshop text"
 ],
 [
  "return `<div class=\"arena-actor ${mine?'my-actor':'actor-'+profile.id}\" data-actor=\"${escape(p.id)}\" data-persona=\"${escape(profile.id)}\" style=\"--sway:${i%2?-1:1}\" title=\"${escape(p.name)} · ${mine?'La star du plateau':profile.label}\" aria-label=\"${escape(p.name)}, en attente\"><div class=\"actor-body\">${monster(p.avatar)}</div><small>${escape(p.name).slice(0,8)}</small></div>`;",
  "const res=S.reveal?.results?.find(row=>row.id===p.id);\n  const pose=S.reveal?(res?.ok?'champion':'oops'):profile.id==='nervous'?'panic':profile.id==='waver'?'waver':profile.id==='professor'?'think':'idle';\n  return `<div class=\"arena-actor ${mine?'my-actor':'actor-'+profile.id}\" data-actor=\"${escape(p.id)}\" data-pose=\"${pose}\" data-persona=\"${escape(profile.id)}\" style=\"--sway:${i%2?-1:1}\" title=\"${escape(p.name)} · ${mine?'La star du plateau':profile.label}\" aria-label=\"${escape(p.name)}, en attente\"><div class=\"actor-body\">${monster(p.avatar)}</div><small>${escape(p.name).slice(0,8)}</small></div>`;",
  "actors pose"
 ],
 [
  "function updateArenaPositions(){",
  "function panikoCamera(){\n const meId=S.mode==='solo'?'self':S.myId;\n const me=S.players.find(p=>p.id===meId)||{name:S.name,avatar:S.avatar};\n const guests=(S.players||[]).filter(p=>p.id!==meId&&p.alive!==false).slice(0,2);\n return `<div class=\"paniko-cam\" id=\"panikoCam\" data-state=\"idle\"><div class=\"cam-hero\">${monster(me.avatar)}</div><div><div class=\"cam-header\"><span>● PANIKO CAM</span><b>★ ${escape(me.name)}</b></div><div class=\"cam-status\" id=\"panikoCamStatus\">Prêt à bondir !</div><div class=\"cam-caption\" id=\"panikoCamCaption\">Observe la foule et choisis ta case</div><div class=\"cam-rivals\">${guests.map(p=>`<span class=\"cam-rival\">${monster(p.avatar)} ${escape(p.name).slice(0,8)}</span>`).join('')}</div></div></div>`;\n}\nfunction updatePanikoCamera(){\n const camera=$('panikoCam'),status=$('panikoCamStatus'),caption=$('panikoCamCaption');if(!camera||!status||!caption)return;\n const meId=S.mode==='solo'?'self':S.myId;\n const me=S.players.find(p=>p.id===meId);\n const answer=S.positions.find(p=>p.id===meId);\n const result=S.reveal?.results?.find(p=>p.id===meId);\n const pos=Number.isInteger(answer?.option)?stageLetter(answer.option):null;\n const actor=document.querySelector?.('.arena-actor.my-actor');\n const isMoving=!!actor?.classList?.contains('is-running');\n camera.dataset.state=S.reveal?(result?.ok?'win':'oops'):isMoving?'running':'idle';\n if(me?.alive===false){status.textContent='En tribune — observe les survivants';caption.textContent='Ton classement est conservé';return;}\n if(S.reveal){status.textContent=result?.ok?'YES ! +'+(result.points||0)+' points !':'Aïe ! Le gong est tombé';caption.textContent=result?.ok?'Ton Paniko fête sa bonne réponse':'Revanche à la prochaine manche';return;}\n status.textContent=pos?'CASE '+pos+' · '+(answer?.locked?'CHOIX VERROUILLÉ':'EN POSITION'):'Prêt à bondir !';\n caption.textContent=isMoving?'En pleine course vers sa case':pos?'Le chrono tourne — reste concentré':'Observe les concurrents avant de choisir';\n}\nfunction updateArenaPositions(){",
  "insert camera"
 ],
 [
  "  node.style.setProperty('--motion-duration',Math.round(pace)+'ms');",
  "  node.style.setProperty('--motion-duration',Math.round(pace)+'ms');\n  node.style.setProperty('--v15-cycle',Math.round(Math.max(270,Math.min(520,380/profile.move)))+'ms');\n  if(distance>6)node.style.setProperty('--gaze-x',place.x>Number(node.dataset.x||0)?'2px':'-2px');",
  "motion properties"
 ],
 [
  "  node.classList.toggle('is-running',!!moved&&prev!==next);node.classList.toggle('is-glued',!!S.positions.find(pos=>pos.id===node.dataset.actor)?.locked);node.title=",
  "  const isRunning=!!moved&&prev!==next;\n  node.classList.toggle('is-running',isRunning);\n  const glued=!!S.positions.find(pos=>pos.id===node.dataset.actor)?.locked;\n  node.classList.toggle('is-glued',glued);\n  if(!S.reveal){\n   node.dataset.pose=glued?'glued':isRunning?(prev==='wait'?'run':prev!==next?'turn':'run'):prev!==next?'brake':profile.id==='nervous'?'panic':profile.id==='waver'?'waver':profile.id==='professor'?'think':'idle';\n  }\n  node.title=",
  "live pose states"
 ],
 [
  "clearTimeout(actorMoveTimers.get(node.dataset.actor));actorMoveTimers.set(node.dataset.actor,setTimeout(()=>node.classList.remove('is-running','waapi-moving'),Math.round(pace)+80));",
  "clearTimeout(actorMoveTimers.get(node.dataset.actor));actorMoveTimers.set(node.dataset.actor,setTimeout(()=>{node.classList.remove('is-running','waapi-moving');if(!S.reveal&&node.dataset.pose!=='glued')node.dataset.pose=profile.id==='nervous'?'panic':profile.id==='waver'?'waver':profile.id==='professor'?'think':'idle';updatePanikoCamera();},Math.round(pace)+80));",
  "movement finish"
 ],
 [
  " const answers=document.querySelectorAll?.('[data-answer]')||[];",
  " updatePanikoCamera();\n const answers=document.querySelectorAll?.('[data-answer]')||[];",
  "camera tick"
 ],
 [
  "${arenaHeatmap()}<div class=\"arena-legend\">",
  "${arenaHeatmap()}${panikoCamera()}<div class=\"arena-legend\">",
  "camera in live game"
 ],
 [
  "<title>Quiz Panic Live — Panic Arena · V1.4</title>",
  "<title>Quiz Panic Live — Paniko Motion · V1.5</title>",
  "game title"
 ]
];
function applyMotionV15(source){
 for(const [before,after,label] of replacements){
  let i=source.indexOf(before);
  if(i<0&&label==='workshop text'){
   const legacy='576 combinaisons possibles. Ton personnage te suit dans les deux émissions et dans les salons en ligne.';
   i=source.indexOf(legacy);if(i>=0){source=source.slice(0,i)+after+source.slice(i+legacy.length);continue;}
  }
  if(i<0&&label==='game title'){
   const oldTitle=source.match(/<title>Quiz Panic Live[^<]*<\/title>/);
   if(oldTitle){source=source.replace(oldTitle[0],after);continue;}
  }
  if(i<0&&label==='workshop text'){const next=source.replace(/576 combinaisons[^<]{0,240}<\/p>/,'576 combinaisons de Panikos, avec des jambes, des bras et des visages animés. Ton personnage te suit en solo et en ligne.</p>');if(next!==source){source=next;continue;}console.warn('V1.5: libellé atelier ancien conservé');continue;}
  if(i<0&&label==='game title'){console.warn('V1.5: titre ancien conservé');continue;}
  if(i<0||source.indexOf(before,i+1)!==-1)throw Error('V1.5 patch anchor mismatch: '+label);
  source=source.slice(0,i)+after+source.slice(i+before.length);
 }
 const css=fs.readFileSync(path.join(__dirname,'paniko_v15.css'),'utf8');
 if(!source.includes('</head>'))throw Error('V1.5 missing head');
 source=source.replace('</head>','<style id=\"qpl-paniko-motion-v15\">'+css+'</style></head>');
 console.log('Quiz Panic V1.5: 32 Panikos articulés, 10 poses, Paniko Cam');
 return source;
}
module.exports={applyMotionV15};
