'use strict';
// Dependency-free HTTP + WebSocket server. Node 20+.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PANIC_RULES = require('./public/panic-rules.js');
const SHOW = require('./public/show-director.js');
const questions = [...JSON.parse(fs.readFileSync(path.join(__dirname,'public/questions.json'),'utf8')),...JSON.parse(fs.readFileSync(path.join(__dirname,'public/knockout-questions.json'),'utf8'))];
const guessQuestions = []; // V1.4: Le Public Décide is no longer offered.
const normalizeGuess = str => String(str||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/^(?:(?:le|la|les|un|une|des|du|de|d|l) )+/,'').split(' ').map(w=>w.length>4&&w.endsWith('s')&&!w.endsWith('ss')?w.slice(0,-1):w).join(' ');
function guessIndex(question, value){ const key=normalizeGuess(value);if(key.length<2)return -1;return question.answers.findIndex(ans=>ans.aliases.some(x=>normalizeGuess(x)===key)); }
function pickGuessQuestions(r){
 const available=guessQuestions.filter(q=>r.category==='Toutes'||q.category===r.category);
 if(available.length<r.total)throw Error('Pas assez de questions pour ce thème');
 const groups=new Map();for(const q of available){if(!groups.has(q.category))groups.set(q.category,[]);groups.get(q.category).push(q);}
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
 const cats=shuffle([...groups.keys()]);for(const items of groups.values())shuffle(items);
 const deck=[];while(deck.length<r.total){let progress=false;
  for(const cat of cats){const next=groups.get(cat).pop();if(next){deck.push(next);progress=true;if(deck.length===r.total)break;}}
  if(!progress)break;
 }return deck;
}

const root = path.join(__dirname,'public');
const rooms = new Map();
const PORT = Number(process.env.PORT || 3000);
const MAX_PLAYERS=12; // Real humans per room; the elimination show fills to 32 with server-authoritative Paniko bots.
const CAST_SIZE=32;
const BOT_NAMES=['Biscotte','Turbo','Mimo','Paillette','Gizmo','Choupette','Pixel','Ninja','Fripouille','Boum-Boum','Cactus','Gribouille','Nougat','Bambou','Kiki','Zigzag','Pistache','Praline','Zouzou','Patapouf','Kiwi','Dynamo','Cornichon','Churros','Doudou','Moustache','Flamèche','Popcorn','Boulette','Sirène','Cosmos','Gribouillis','Tornado','Dragibus','Skippy','Bip-Bip','Toupie','Chocolat','Sushi'];
const publicTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};

const server=http.createServer((req,res)=>{
  if(req.url==='/api/health'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(JSON.stringify({ok:true,version:'1.4',mode:'panic',rooms:rooms.size,questions:questions.length}));}
  let target;
  try { const route=decodeURIComponent((req.url||'/').split('?')[0]);target=path.resolve(root,'.'+(route==='/'?'/index.html':route)); }
  catch {res.writeHead(400);return res.end('Bad request');}
  if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
  fs.stat(target,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found');}
    const headers={'content-type':publicTypes[path.extname(target)]||'application/octet-stream','x-content-type-options':'nosniff','cache-control':target.endsWith('questions.json')?'public, max-age=600':'no-cache'};
    res.writeHead(200,headers);
    fs.createReadStream(target).pipe(res);
  });
});
const randomCode=()=>{let s;do{s=crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(s));return s};
const clip=(s,max)=>String(s??'').normalize('NFKC').replace(/[\x00-\x1f<>]/g,'').trim().slice(0,max);
const jsonSend=(conn,obj)=>{if(!conn||conn.closed)return;try{const data=Buffer.from(JSON.stringify(obj));let head;if(data.length<126){head=Buffer.from([0x81,data.length]);}else if(data.length<65536){head=Buffer.alloc(4);head[0]=0x81;head[1]=126;head.writeUInt16BE(data.length,2);}else{head=Buffer.alloc(10);head[0]=0x81;head[1]=127;head.writeBigUInt64BE(BigInt(data.length),2);}conn.socket.write(Buffer.concat([head,data]));}catch(e){conn.closed=true;}};
const sendRaw=(conn,op,data=Buffer.alloc(0))=>{if(conn.closed)return;const h=data.length<126?Buffer.from([0x80|op,data.length]):Buffer.from([0x80|op,126,data.length>>8,data.length&255]);try{conn.socket.write(Buffer.concat([h,data]));}catch{}};
const fail=(conn,msg)=>jsonSend(conn,{type:'error',message:msg});
const pubPlayer=p=>({id:p.id,name:p.name,avatar:p.avatar,score:p.score,correct:p.correct,streak:p.streak,connected:!!p.conn||!!p.bot,host:p.host,alive:p.alive!==false,bot:!!p.bot});
const pubRoom=r=>({format:r.format||'chaos',type:'room',code:r.code,phase:r.phase,round:r.round,total:r.total,category:r.category,style:r.style,players:r.players.map(pubPlayer),hostId:r.players.find(p=>p.host)?.id||null});
function broadcast(r,obj){for(const p of r.players)if(p.conn)jsonSend(p.conn,obj)}
function lobby(r){broadcast(r,pubRoom(r))}
function participant(conn){if(!conn.room||!conn.player)return null;return rooms.get(conn.room)?.players.find(p=>p.id===conn.player)||null}
function detach(conn){const r=rooms.get(conn.room);if(!r)return;const p=r.players.find(p=>p.id===conn.player);if(p && p.conn===conn){p.conn=null;if(r.phase==='lobby'){r.players=r.players.filter(x=>x!==p);if(p.host && r.players.length)r.players[0].host=true;}if(!r.players.length){clearTimeout(r.timer);clearBotTimers(r);rooms.delete(r.code);}else {lobby(r);/* Un joueur qui quitte ne force pas la fin prématurée du compte à rebours. */}}}
function pickQuestions(r){
 const chosen=[],used=new Set();const available=questions.filter(q=>r.category==='Toutes'||q.category===r.category);
 if(available.length<r.total)throw Error('Pas assez de questions pour ce thème');
 const topics=[...new Set(available.filter(q=>q.category!=='Calcul & logique').map(q=>q.category))];
 for(let i=topics.length-1;i>0;i--){const j=crypto.randomInt(i+1);[topics[i],topics[j]]=[topics[j],topics[i]];}
 for(let i=0;i<r.total;i++){
  const ratio=i/Math.max(1,r.total-1),tier=ratio<.27?1:ratio<.63?2:3;
  const topic=r.category==='Toutes'?(tier===3?topics[i%topics.length]:(i%11===10?'Calcul & logique':topics[i%topics.length])):r.category;
  const fresh=available.filter(q=>!used.has(q.id));
  const exact=fresh.filter(q=>q.difficulty===tier&&q.category===topic);
  const level=fresh.filter(q=>q.difficulty===tier&&q.category!=='Calcul & logique');
  const topicPool=fresh.filter(q=>q.category===topic);
  const nonMath=fresh.filter(q=>q.category!=='Calcul & logique');
  const pool=exact.length?exact:tier===3&&level.length?level:topicPool.length?topicPool:level.length?level:nonMath.length?nonMath:fresh;
  const q=pool[crypto.randomInt(pool.length)];chosen.push(q);used.add(q.id);
 }
 return chosen;
}
function clearBotTimers(r){for(const t of r.botTimers||[])clearTimeout(t);r.botTimers=[];}
function fillPanicCast(r){
 const remaining=Math.max(0,CAST_SIZE-r.players.length);
 for(let i=0;i<remaining;i++)r.players.push({id:'bot-'+(i+1),token:null,name:BOT_NAMES[i],avatar:(i*37+8)%576,score:0,correct:0,streak:0,host:false,conn:null,bot:true,alive:true,skill:.55+(i%6)*.036});
}
function positionsOf(r,viewer){const hiding=r.effect?.id==='secret'&&r.phase==='question';return r.players.filter(p=>p.alive!==false||r.phase==='reveal').map(p=>({id:p.id,option:hiding&&p.id!==viewer?.id?null:(r.answers.get(p.id)?.option??null),locked:!!r.answers.get(p.id)?.locked}));}
function broadcastPositions(r){for(const p of r.players)if(p.conn)jsonSend(p.conn,{type:'positions',positions:positionsOf(r,p)});}
function schedulePanicBots(r){
 clearBotTimers(r);
 const rivals=r.players.filter(p=>p.bot&&p.alive!==false);
 const round=r.round,deadline=r.deadline;
 const valid=()=>r.phase==='question'&&r.round===round&&Date.now()<deadline;
 const chooseFor=(bot,profile)=>SHOW.choose({
  profile,correct:r.question.answer,difficulty:r.question.difficulty,round:round+1,total:r.total,skill:bot.skill,
  peers:[...r.answers.entries()].filter(([id,a])=>id!==bot.id&&a.option!==null).map(([,a])=>a),random:Math.random
 });
 const commit=(bot,option)=>{
  if(!valid())return false;
  const outcome=PANIC_RULES.applyChoice(r.answers.get(bot.id),option,r.effect?.id,r.question.answer,Date.now());
  if(!outcome.accepted)return false;
  r.answers.set(bot.id,outcome.choice);broadcastPositions(r);return true;
 };
 rivals.forEach(bot=>{
  const profile=SHOW.profileFor(bot.id);
  const delay=Math.max(100,Math.min(r.duration*1000-850,500+r.duration*880*SHOW.durationFraction(profile,Math.random())));
  r.botTimers.push(setTimeout(()=>{
   if(!valid())return;
   let option=chooseFor(bot,profile);if(!commit(bot,option))return;
   if(r.effect?.id==='glue'||r.effect?.id==='commit'||!SHOW.shouldFlip(profile))return;
   const remaining=deadline-Date.now()-700;if(remaining<500)return;
   const flipDelay=Math.min(remaining,850+Math.random()*Math.min(3200,remaining));
   r.botTimers.push(setTimeout(()=>{
    if(!valid())return;
    const next=chooseFor(bot,profile);
    if(next!==option&&commit(bot,next))option=next;
   },flipDelay));
  },delay));
 });
}

const effects=[{id:'double',title:'POINTS DOUBLÉS',detail:'Chaque bonne réponse rapporte le double !',icon:'⚡'}, {id:'reverse',title:'LE PLATEAU DÉRAILLE',detail:'Les réponses changent d’ordre à l’écran !',icon:'🔄'}, {id:'rush',title:'CHRONO FOU',detail:'10 secondes seulement !',icon:'⏱️'}, {id:'confetti',title:'TEMPÊTE DE CONFETTIS',detail:'Le public est incontrôlable !',icon:'🎊'}, {id:'blackout',title:'PANNE DE PROJECTEURS',detail:'Le studio vacille… mais on continue !',icon:'💡'}, {id:'jackpot',title:'SUPER JACKPOT',detail:'Trois fois plus de points pour les justes !',icon:'💎'},{id:'secret',title:'PANNE DES RADARS',detail:'Les choix de tes rivaux sont cachés jusqu’au gong !',icon:'🕵️'}, {id:'glue',title:'GLUE GÉANTE',detail:'Attention : pose un pied sur une mauvaise case et tu restes collé jusqu’au gong !',icon:'🧪'}, {id:'commit',title:'UN SEUL TIR',detail:'Première case choisie = case verrouillée jusqu’au gong !',icon:'🔒'}];
function nextQuestion(r){
 clearTimeout(r.timer);clearBotTimers(r);if(!rooms.has(r.code))return;
 if(r.round>=r.total||(r.style==='panic'&&r.round>0&&r.players.filter(p=>p.alive!==false).length<=1)){r.phase='finished';const rank=[...r.players].sort((a,b)=>(b.alive!==false?1:0)-(a.alive!==false?1:0)||b.score-a.score||b.correct-a.correct);broadcast(r,{type:'finished',ranking:rank.map(pubPlayer)});lobby(r);return;}
 r.phase='question';r.lastReveal=null;r.answers=new Map();r.guesses=new Map();r.hints=new Map();r.question=r.deck[r.round];if(r.style==='guess')r.players.forEach(p=>{p.guessCombo=0;});
 const possible=r.style==='guess'?effects.filter(e=>['double','rush','confetti','jackpot'].includes(e.id)):effects;
 r.effect=r.style==='panic'&&r.round>0&&r.round%4===1?effects.find(e=>e.id==='glue'):r.style==='panic'&&r.round>0&&r.round%4===2?effects.find(e=>e.id==='commit'):r.style==='panic'&&r.round>0&&r.round%4===3?effects.find(e=>e.id==='secret'):(r.round>0&&r.round%3===0?possible.filter(e=>!['glue','commit','secret'].includes(e.id))[crypto.randomInt(possible.filter(e=>!['glue','commit','secret'].includes(e.id)).length)]:null);
 r.duration=r.style==='guess'?(r.effect?.id==='rush'?17:28):(r.effect?.id==='rush'?10:18);
 r.deadline=Date.now()+r.duration*1000;
 const question=r.style==='guess'?{id:r.question.id,question:r.question.question,category:r.question.category}:{id:r.question.id,question:r.question.question,category:r.question.category,difficulty:r.question.difficulty,options:r.question.options};
 broadcast(r,{type:'question',style:r.style,round:r.round+1,total:r.total,question,effect:r.effect,deadline:r.deadline,duration:r.duration,players:r.players.map(pubPlayer)});
 if(r.style==='panic'){broadcastPositions(r);schedulePanicBots(r);}
 r.timer=setTimeout(()=>settle(r),r.duration*1000+120);
}
function settle(r){
 if(r.phase!=='question')return;clearTimeout(r.timer);clearBotTimers(r);r.phase='reveal';const q=r.question;const results=[];
 if(r.style==='guess'){
  for(const p of r.players){const gs=r.guesses.get(p.id)||[];if(gs.some(g=>g.points>0))p.correct++;results.push({id:p.id,ok:gs.some(g=>g.points>0),points:gs.reduce((t,g)=>t+g.points,0),found:gs.filter(g=>g.index>=0).map(g=>g.index)});}
  r.lastReveal={type:'reveal',style:'guess',answers:q.answers.map(a=>({label:a.label,score:a.score})),results,players:r.players.map(pubPlayer),nextIn:4800};broadcast(r,r.lastReveal);
 }else{
  const eliminated=[];
  const awards=PANIC_RULES.scoreRound(r.players.filter(p=>p.alive!==false).map(p=>({id:p.id,ok:r.answers.get(p.id)?.option===q.answer,time:r.answers.get(p.id)?.time,streak:(p.streak||0)+1})),r.deadline,r.duration,r.effect?.id,{round:r.round+1,total:r.total,alive:r.players.filter(p=>p.alive!==false).length});
  for(const p of r.players){
   if(p.alive===false)continue;
   const a=r.answers.get(p.id),ok=!!a&&a.option===q.answer;
   if(ok){
    p.correct++;p.streak++;
    const award=awards.get(p.id);let pts=award?.points??0;
    p.score+=pts;results.push({id:p.id,ok:true,points:pts,place:award?.rank,choice:a.option,eliminated:false});
   }else{
    p.streak=0;
    const out={id:p.id,avatar:p.avatar,name:p.name,choice:a?.option??null};
    if(r.format==='survival'){p.alive=false;eliminated.push(out);}
    results.push({id:p.id,ok:false,points:0,choice:out.choice,eliminated:r.format==='survival'});
   }
  }
  if(r.format!=='survival'){const wave=PANIC_RULES.eliminateWave(r.players,r.round+1,r.total);for(const id of wave){const p=r.players.find(x=>x.id===id);p.alive=false;eliminated.push({id:p.id,name:p.name,avatar:p.avatar,choice:r.answers.get(id)?.option??null});const item=results.find(x=>x.id===id);if(item)item.eliminated=true;}}
  broadcastPositions(r);
  r.lastReveal={type:'reveal',style:'panic',round:r.round+1,correct:q.answer,explanation:q.explanation,results,eliminated,players:r.players.map(pubPlayer),nextIn:4600};broadcast(r,r.lastReveal);

 }
 lobby(r);r.round++;
 r.timer=setTimeout(()=>nextQuestion(r),r.style==='guess'?4800:4600);
}
function receive(conn,data){let m;try{m=JSON.parse(data.toString('utf8'));}catch{return fail(conn,'Message illisible.');}if(!m||typeof m!=='object')return;
 if(m.type==='hello'){
   const token=clip(m.token,120);conn.token=token;
   // A disconnection can recover a live player with the same secret token.
   if(token){for(const r of rooms.values()){const p=r.players.find(p=>p.token===token);if(p){if(p.conn&&p.conn!==conn){const old=p.conn;old.room=null;old.player=null;old.socket.end();}p.conn=conn;conn.room=r.code;conn.player=p.id;jsonSend(conn,{type:'welcome',id:p.id,code:r.code,reconnected:true});lobby(r);if(r.phase==='question'||r.phase==='reveal'){const q=r.question;jsonSend(conn,{type:'question',style:r.style,round:r.phase==='reveal'?r.round:r.round+1,total:r.total,question:r.style==='guess'?{id:q.id,question:q.question,category:q.category}:{id:q.id,question:q.question,category:q.category,difficulty:q.difficulty,options:q.options},effect:r.effect,deadline:r.deadline,duration:r.duration,players:r.players.map(pubPlayer),answered:r.answers.get(p.id)?.option??null,guesses:(r.guesses.get(p.id)||[]).map(g=>({text:g.text,index:g.index,points:g.points})),hintUsed:!!r.hints?.has(p.id)});if(r.style==='panic')jsonSend(conn,{type:'positions',positions:positionsOf(r,p)});if(r.phase==='reveal'&&r.lastReveal)jsonSend(conn,r.lastReveal);}if(r.phase==='finished')jsonSend(conn,{type:'finished',ranking:[...r.players].sort((a,b)=>b.score-a.score).map(pubPlayer)});return;}}}
   return jsonSend(conn,{type:'ready'});
 }
 if(m.type==='create'||m.type==='join'){
   if(!conn.token || conn.token.length<12)return fail(conn,'Identifiant de session manquant, actualise la page.');
   if(conn.room)return fail(conn,'Tu es déjà dans une partie.');
   const name=clip(m.name,18)||'Joueur';const avatar=Math.max(0,Math.min(575,Math.floor(Number(m.avatar)||0)));const code=m.type==='create'?randomCode():clip(m.code,8).toUpperCase().replace(/[^A-Z0-9]/g,'');
   let r=rooms.get(code);
   if(m.type==='join'&&(!r||r.phase!=='lobby'))return fail(conn,'Salon introuvable ou partie déjà lancée.');
   if(r&&r.players.length>=MAX_PLAYERS)return fail(conn,'Salon complet (12 joueurs maximum).');
   if(!r){r={code,phase:'lobby',round:0,total:10,format:'chaos',category:'Toutes',style:'panic',players:[],deck:[],timer:null,answers:new Map(),guesses:new Map(),created:Date.now()};rooms.set(code,r);}
   const p={id:crypto.randomUUID(),token:conn.token,name,avatar,score:0,correct:0,streak:0,host:r.players.length===0,conn};r.players.push(p);conn.room=r.code;conn.player=p.id;
   jsonSend(conn,{type:'welcome',id:p.id,code:r.code,reconnected:false});lobby(r);return;
 }
 if(m.type==='leave'){detach(conn);conn.room=null;conn.player=null;return jsonSend(conn,{type:'left'});}
 const p=participant(conn);if(!p)return fail(conn,'Rejoins ou crée un salon.');const r=rooms.get(conn.room);
 if(m.type==='config'){
   if(!p.host||r.phase!=='lobby')return fail(conn,'Seul le présentateur du salon peut modifier les règles.');
   const ct=Number(m.total);r.total=[8,10,12,16].includes(ct)?ct:r.total;if(['chaos','survival'].includes(m.format))r.format=m.format;
   if(m.category==='Toutes'||(r.style==='guess'?guessQuestions:questions).some(q=>q.category===m.category)){r.category=m.category;}
   lobby(r);return;
 }
 if(m.type==='start'){
   if(!p.host||r.phase!=='lobby')return fail(conn,'Seul le créateur peut lancer la partie.');
   r.round=0;r.players.forEach(x=>{x.score=0;x.correct=0;x.streak=0;x.alive=true});if(r.style==='panic')fillPanicCast(r);r.deck=r.style==='guess'?pickGuessQuestions(r):pickQuestions(r);
   r.phase='starting';lobby(r);broadcast(r,{type:'intro',text:'Mesdames et messieurs, attachez vos ceintures !'});r.timer=setTimeout(()=>nextQuestion(r),1600);return;
 }
 if(m.type==='answer'){
   if(r.style!=='panic'||r.phase!=='question'||Date.now()>r.deadline+100||p.alive===false)return;
   if(!Number.isInteger(m.option)||m.option<0||m.option>3)return;
   const choice=PANIC_RULES.applyChoice(r.answers.get(p.id),m.option,r.effect?.id,r.question.answer,Date.now());
   if(!choice.accepted){jsonSend(conn,{type:'accepted',option:r.answers.get(p.id)?.option??null,locked:true,message:choice.reason});return;}
   r.answers.set(p.id,choice.choice);
   jsonSend(conn,{type:'accepted',option:m.option,locked:choice.choice.locked,message:choice.choice.locked?(choice.choice.reason==='glue'?'🧪 Collé à cette case !':'🔒 Choix verrouillé !'):null});
   broadcastPositions(r);
   broadcast(r,{type:'progress',answered:r.players.filter(x=>x.conn&&r.answers.has(x.id)).length,total:r.players.filter(x=>x.conn).length});
   return;
 }
 if(m.type==='hint'){
   if(r.style!=='guess'||r.phase!=='question'||Date.now()>r.deadline||r.hints?.has(p.id))return;
   const found=new Set((r.guesses.get(p.id)||[]).filter(g=>g.index>=0).map(g=>g.index));
   const missing=r.question.answers.findIndex((a,i)=>!found.has(i));if(missing<0)return;
   const a=r.question.answers[missing];const text='💡 Une réponse commence par « '+a.label[0].toUpperCase()+' » et contient '+a.label.length+' caractères.';
   p.score-=15;r.hints.set(p.id,text);jsonSend(conn,{type:'hint',text,score:p.score});
   broadcast(r,{type:'guessProgress',players:r.players.map(pubPlayer),counts:r.players.map(x=>({id:x.id,count:(r.guesses.get(x.id)||[]).length}))});return;
 }
 if(m.type==='guess'){
   if(r.style!=='guess'||r.phase!=='question'||Date.now()>r.deadline+100)return;
   const text=clip(m.text,65);if(text.length<2)return;
   const seen=r.guesses.get(p.id)||[];if(seen.length>=6){jsonSend(conn,{type:'guessAccepted',error:'Tu as utilisé tes six propositions.'});return;}
   const norm=normalizeGuess(text);
   if(seen.some(g=>normalizeGuess(g.text)===norm)){jsonSend(conn,{type:'guessAccepted',error:'Tu as déjà essayé cette réponse.'});return;}
   const idx=guessIndex(r.question,text);
   if(idx>=0&&seen.some(g=>g.index===idx)){jsonSend(conn,{type:'guessAccepted',error:'Cette idée est déjà trouvée !'});return;}
   p.guessCombo=idx<0?0:(p.guessCombo||0)+1;
   let points=idx<0?0:r.question.answers[idx].score;
   if(r.effect?.id==='double')points*=2;if(r.effect?.id==='jackpot')points*=3;
   const combo=idx<0?0:PANIC_RULES.guessComboBonus(p.guessCombo);points+=combo;
   const entry={text,index:idx,points,combo};seen.push(entry);r.guesses.set(p.id,seen);p.score+=points;
   jsonSend(conn,{type:'guessAccepted',entry,remaining:6-seen.length,score:p.score});
   broadcast(r,{type:'guessProgress',players:r.players.map(pubPlayer),counts:r.players.map(x=>({id:x.id,count:(r.guesses.get(x.id)||[]).length}))});
   if(r.players.filter(x=>x.conn).every(x=>(r.guesses.get(x.id)||[]).length>=6)){clearTimeout(r.timer);r.timer=setTimeout(()=>settle(r),650);}
   return;
 }
 if(m.type==='reaction'){
   const allowed=['👏','😂','😱','🔥','❤️'];if(!allowed.includes(m.emoji))return;
   if(Date.now()-(p.lastReact||0)<850)return;p.lastReact=Date.now();broadcast(r,{type:'reaction',id:p.id,name:p.name,emoji:m.emoji});return;
 }
}
server.on('upgrade',(req,socket)=>{
  if(req.url!=='/ws' || req.headers.upgrade?.toLowerCase()!=='websocket' || !/^[A-Za-z0-9+/]{22}==$/.test(req.headers['sec-websocket-key']||'')){socket.destroy();return;}
  // Same origin defense protects rooms against unsolicited cross-site WebSockets.
  const origin=req.headers.origin;if(origin){try{const host=new URL(origin).host;if(host!==req.headers.host){socket.destroy();return;}}catch{socket.destroy();return;}}
  const key=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+key+'\r\n\r\n');
  const conn={socket,buf:Buffer.alloc(0),closed:false,room:null,player:null,lastSeen:Date.now(),token:null,fragment:null};
  socket.on('data',bytes=>{
    if(conn.closed)return;conn.buf=Buffer.concat([conn.buf,bytes]);if(conn.buf.length>64000){socket.destroy();return;}
    while(conn.buf.length>=2){const b0=conn.buf[0],b1=conn.buf[1];const fin=!!(b0&0x80),opcode=b0&15,masked=!!(b1&128);let size=b1&127,offset=2;
      if(size===126){if(conn.buf.length<4)break;size=conn.buf.readUInt16BE(2);offset=4;}else if(size===127){if(conn.buf.length<10)break;const big=conn.buf.readBigUInt64BE(2);if(big>16000n){socket.destroy();return;}size=Number(big);offset=10;}
      if(size>16000||!masked){socket.destroy();return;}if(conn.buf.length<offset+4+size)break;
      const mask=conn.buf.subarray(offset,offset+4);offset+=4;const body=Buffer.from(conn.buf.subarray(offset,offset+size));conn.buf=conn.buf.subarray(offset+size);for(let i=0;i<size;i++)body[i]^=mask[i%4];
      if(opcode===8){socket.end();return;}if(opcode===9){sendRaw(conn,10,body);continue;}if(opcode===10)continue;
      if(opcode===1&&fin){receive(conn,body);}else if(opcode===1&&!fin){conn.fragment=body;}else if(opcode===0&&conn.fragment){conn.fragment=Buffer.concat([conn.fragment,body]);if(conn.fragment.length>16000){socket.destroy();return;}if(fin){receive(conn,conn.fragment);conn.fragment=null;}}else{socket.destroy();return;}
    }
  });
  socket.on('close',()=>{conn.closed=true;detach(conn);});socket.on('error',()=>{conn.closed=true;detach(conn);});
});
const cleaner=setInterval(()=>{for(const r of rooms.values()){if(Date.now()-r.created>3*60*60*1000){clearTimeout(r.timer);rooms.delete(r.code);broadcast(r,{type:'error',message:'Le salon a expiré.'});r.players.forEach(p=>{if(p.conn){p.conn.room=null;p.conn.player=null;}})}}},60000);cleaner.unref();
if(require.main===module)server.listen(PORT,'0.0.0.0',()=>console.log('🎤 Quiz Panic Live prêt : http://localhost:'+PORT+' ('+questions.length+' questions)'));
module.exports={server,rooms,pickQuestions,pickGuessQuestions,guessIndex,guessQuestions,questions,settle,fillPanicCast,positionsOf};