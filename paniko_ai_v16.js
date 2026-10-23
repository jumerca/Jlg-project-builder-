'use strict';
// V1.6 Intelligence Arena — differential patch on top of V1.5, no change to other games.
const BRAIN=String.raw\`
const V16_THOUGHTS={
sprinter:['⚡ Je fonce !','🏁 Je confirme !'],strategist:['🧠 Je calcule…','🎯 Je confirme !'],
follower:['👀 J’observe !','👥 Je suis le groupe !'],waver:['🤔 A… ou C ?','↩️ Je change !'],
lastminute:['⏳ J’attends…','💨 C’est parti !'],daredevil:['🔥 Même pas peur !','💥 À l’aventure !'],
professor:['📚 Je réfléchis…','💡 Je sais !'],clown:['🤹 Et hop !','🎭 Surprise !'],
skeptic:['🧐 Pas convaincu…','🔍 Je vérifie !'],contrarian:['🙅 Pas comme eux !','↪️ À contre-courant !'],
nervous:['😰 Ouh là !','😵 Je panique !'],showoff:['✨ Regardez-moi !','🏆 Facile !']};
function createMind(profile,id){return{id,style:profile.id,confidence:.58,correct:0,wrong:0,copied:0,round:0,initial:null,known:false,preferred:null,last:null,source:'instinct'};}
function prepareMind(mind,{profile,correct,difficulty=1,round=1,total=10,skill=.65,random=Math.random}){
 const shift=Math.max(-.055,Math.min(.055,(mind.confidence-.58)*.22));
 mind.known=random()<Math.max(.20,Math.min(.94,accuracy(profile,difficulty,round,total,skill)+shift));
 const wrong=[0,1,2,3].filter(x=>x!==correct);
 mind.initial=mind.known?correct:wrong[Math.floor(random()*wrong.length)];mind.preferred=mind.initial;mind.source='instinct';mind.round=round;return mind;
}
function crowdDistribution(peers){const counts=[0,0,0,0];for(const p of peers){if(Number.isInteger(p.option)&&p.option>=0&&p.option<4)counts[p.option]++;}return counts;}
function decide({profile,mind,peers=[],step=0,random=Math.random}){
 const votes=crowdDistribution(peers),total=votes.reduce((a,b)=>a+b,0),most=votes.indexOf(Math.max(...votes)),least=votes.indexOf(Math.min(...votes));
 let option=mind.preferred,source='instinct';
 const following=profile.id==='follower'?.90:profile.id==='nervous'?.46:profile.id==='waver'?.38:profile.id==='clown'?.34:profile.id==='lastminute'?.20:profile.copy;
 if(total>=2&&random()<following){option=most;source='crowd';}
 else if(total>=3&&profile.id==='contrarian'){const low=[0,1,2,3].filter(i=>votes[i]===votes[least]);option=low[Math.floor(random()*low.length)];source='contrarian';}
 else if(step>0){
  if(profile.id==='waver'&&random()<.48){option=(mind.last+1+Math.floor(random()*3))%4;source='hesitation';}
  else if(profile.id==='skeptic'&&total>=2&&votes[mind.last]===0&&random()<.6){option=most;source='doubt';}
  else if(profile.id==='nervous'&&random()<.3){option=Math.floor(random()*4);source='panic';}
  else if(profile.id==='strategist'||profile.id==='professor'){option=mind.preferred;source='analysis';}
  else if(mind.last!==null)option=mind.last;
 }
 if(!Number.isInteger(option)||option<0||option>3)option=mind.preferred;
 mind.last=option;mind.source=source;if(source==='crowd')mind.copied++;
 return{option,source,mood:step>0?(source==='crowd'?'copy':source==='hesitation'?'waver':source==='panic'?'panic':source==='analysis'?'think':'turn'):profile.id==='lastminute'?'sprint':profile.id==='strategist'||profile.id==='professor'?'think':'run',thought:V16_THOUGHTS[profile.id][step>0?1:0]};
}
function plan({profile,duration=18,effect=null,random=Math.random}){
 const ms=duration*1000,start=Math.max(280,Math.min(ms-900,500+duration*880*durationFraction(profile,random())));
 if(effect==='commit'||effect==='glue')return[{time:Math.round(start),step:0}];
 let count=profile.id==='waver'||profile.id==='nervous'||profile.id==='clown'||profile.id==='follower'?2:profile.id==='skeptic'||profile.id==='contrarian'||profile.id==='strategist'?1:0;
 if(profile.id==='sprinter')count=random()<.18?1:0;if(profile.id==='professor')count=random()<.12?1:0;
 if(profile.id==='daredevil')count=random()<.25?1:0;if(profile.id==='showoff')count=random()<.35?1:0;
 if(start>ms-2050)count=0;
 const events=[{time:Math.round(start),step:0}];
 for(let i=1;i<=count;i++){const time=start+(ms-600-start)*i/(count+1);if(time>start+350&&time<ms-450)events.push({time:Math.round(time),step:i});}
 return events;
}
function learn(mind,ok){if(!mind)return;if(ok){mind.correct++;mind.confidence=Math.min(.81,mind.confidence+.018)}else{mind.wrong++;mind.confidence=Math.max(.30,mind.confidence-.022)}}
\`;
const SOLO=String.raw\`
function aiMood(bot,mood,thought,ttl=1000){
 const node=document.querySelector?.('[data-actor="'+bot.id+'"]');if(!node||S.reveal)return;
 node.dataset.intent=mood;node.querySelector('.ai-speech')?.remove();
 if(thought&&S.effect?.id!=='secret'&&SHOW.botNumber(bot.id)%7===0){
 const label=document.createElement('span');label.className='ai-speech';label.setAttribute('aria-hidden','true');label.textContent=thought;
 node.append(label);aiTimers.push(setTimeout(()=>{document.querySelector?.('[data-actor="'+bot.id+'"]')?.querySelector('.ai-speech')?.remove();},ttl));}
 const note=$('broadcastNote');if(note&&Math.random()<.15&&mood==='waver')note.textContent='LES PANIKOS HÉSITENT !';
}
function scheduleSoloPanicBots(){
 const q=S.q,round=S.round,deadline=S.deadline,rivals=S.players.filter(p=>p.bot&&p.alive!==false);
 const valid=()=>S.mode==='solo'&&S.gameStyle==='panic'&&S.round===round&&!S.reveal&&Date.now()<deadline;
 rivals.forEach(bot=>{
 const profile=showActorProfile(bot.id),mind=bot.mind||(bot.mind=SHOW.createMind(profile,bot.id));
 SHOW.prepareMind(mind,{profile,correct:q.answer,difficulty:q.difficulty,round,total:S.total,skill:bot.skill});
 for(const step of SHOW.plan({profile,duration:S.duration,effect:S.effect?.id})){
 aiTimers.push(setTimeout(()=>{
 if(!valid())return;
 const peers=S.positions.filter(x=>x.id!==bot.id&&Number.isInteger(x.option));
 const decision=SHOW.decide({profile,mind,peers,step:step.step});
 const current=S.positions.find(x=>x.id===bot.id);
 if(current?.option===decision.option)return;
 const choice=PANIC_RULES.applyChoice(current?.state,decision.option,S.effect?.id,q.answer,Date.now());
 if(!choice.accepted)return;
 const old=current?.option;
 S.positions=S.positions.map(x=>x.id===bot.id?{id:bot.id,option:decision.option,locked:choice.choice.locked,state:choice.choice}:x);
 updateArenaPositions();aiMood(bot,decision.mood,decision.thought);
 if(step.step>0&&old!==null&&old!==decision.option)showComedy(bot,'reverse');
 else if(choice.choice.locked&&S.effect?.id==='glue')showComedy(bot,'glue');
 else if(Math.random()<.13)showComedy(bot,profile.id==='clown'?'slip':profile.id==='follower'?'copy':profile.id==='showoff'?'dance':'highfive');
 },step.time));}
 });
}
\`;
const CSS=String.raw\`.arena-actor{isolation:isolate}.arena-actor .ai-speech{position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);padding:3px 7px;max-width:104px;min-width:48px;white-space:normal;text-align:center;border-radius:10px 10px 10px 2px;background:#f7fcff;color:#13375c;box-shadow:0 4px 18px #00122d88;border:1px solid #7bceea;font:800 9px/1.2 system-ui;pointer-events:none;z-index:8;animation:aiSpeechPop .22s ease-out both}.arena-actor[data-intent="think"] .monster{filter:drop-shadow(0 0 8px #b0deff);animation:aiThinkV16 .66s ease-in-out infinite alternate}.arena-actor[data-intent="copy"] .monster{filter:drop-shadow(0 0 7px #a6f4c4)}.arena-actor[data-intent="waver"] .monster{animation:aiWaverV16 .52s ease-in-out infinite alternate}.arena-actor[data-intent="panic"] .monster{animation:aiPanicV16 .19s ease-in-out infinite alternate}@keyframes aiSpeechPop{from{opacity:0;transform:translate(-50%,8px) scale(.6)}to{opacity:1;transform:translate(-50%,0) scale(1)}}@keyframes aiThinkV16{to{transform:rotate(-5deg) translateY(-2px)}}@keyframes aiWaverV16{to{transform:rotate(9deg) translateX(3px)}}@keyframes aiPanicV16{to{transform:translateX(2px) rotate(4deg)}}@media(max-width:480px){.arena-actor .ai-speech{font-size:8px;padding:2px 4px;max-width:75px}}@media(prefers-reduced-motion:reduce){.arena-actor .ai-speech,.arena-actor[data-intent] .monster{animation:none!important}}\`;
function applyAI(html){
 const replace=(a,b,n)=>{const c=html.split(a).length-1;if(c!==1)throw Error('V1.6 missing anchor '+n+' '+c);html=html.replace(a,b);};
 const api='const api={profiles,gags,profileFor,botNumber,durationFraction,accuracy,choose,shouldFlip};';
 replace(api,BRAIN+'\nconst api={profiles,gags,profileFor,botNumber,durationFraction,accuracy,choose,shouldFlip,createMind,prepareMind,crowdDistribution,decide,plan,learn,V16_THOUGHTS};','director');
 const a=html.indexOf('function scheduleSoloPanicBots(){'),b=html.indexOf('\nfunction clearAI(){',a);
 if(a<0||b<0)throw Error('V1.6 solo runner absent');html=html.slice(0,a)+SOLO+html.slice(b);
 replace("PANIC_BOTS.slice(0,PANIC_CAST_SIZE-1).forEach((name,i)=>cast.push({id:'bot-'+(i+1),name,avatar:(i*37+8)%576,score:0,streak:0,correct:0,alive:true,bot:true,connected:true,skill:.55+(i%6)*.036}));",
 "PANIC_BOTS.slice(0,PANIC_CAST_SIZE-1).forEach((name,i)=>cast.push({id:'bot-'+(i+1),name,avatar:(i*37+8)%576,score:0,streak:0,correct:0,alive:true,bot:true,connected:true,skill:.55+(i%6)*.036,mind:SHOW.createMind(SHOW.profileFor('bot-'+(i+1)),'bot-'+(i+1))}));",'mind');
 replace("  results.push({id:p.id,ok,points,place:awards.get(p.id)?.rank,choice:option,eliminated:!ok&&S.panicFormat==='survival'});",
 "  if(p.bot)SHOW.learn(p.mind,ok);\n  results.push({id:p.id,ok,points,place:awards.get(p.id)?.rank,choice:option,eliminated:!ok&&S.panicFormat==='survival'});",'learning');
 replace(" if(m.type==='positions'){", " if(m.type==='aiMood'){if(S.mode==='online'&&S.screen==='game'&&m.id){aiMood({id:m.id},m.mood,m.thought,1200);}return;}\n if(m.type==='positions'){",'online');
 html=html.replace(/<title>Quiz Panic Live[^<]*<\/title>/,'<title>Quiz Panic Live — Intelligence Arena · V1.6</title>');
 replace('</head>','<style id="paniko-ai-v16">'+CSS+'</style></head>','style');
 console.log('Quiz Panic V1.6: strategies et memoire activees');
 return html;
}
module.exports={applyAI};
