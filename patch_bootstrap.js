'use strict';
// Quiz Panic Live V1.1 - safe, testable UI recovery patch at boot time.
function applyLiveRecoveryPatch(input) {
  let source=input, applied=0;
  const fixes=[
    ["<title>Quiz Panic Live — Direct & Foules · V1.0</title>","<title>Quiz Panic Live — Direct & Foules · V1.1</title>"],
    ["S.ws.onopen=()=>{S.reconnectAttempt=0;S.ws.send(JSON.stringify({type:'hello',token:S.token}));};","S.ws.onopen=()=>{S.ws.send(JSON.stringify({type:'hello',token:S.token}));};"],
    ["S.screen==='lobby'||S.screen==='game'","S.screen==='lobby'||S.screen==='game'||S.screen==='result'"],
    ["if(m.type==='ready'){if(S.queued){const fn=S.queued;S.queued=null;fn();}return;}","if(m.type==='ready'){S.reconnectAttempt=0;if(S.recovering&&!S.queued){S.recovering=false;setSession('qpl-online-active','0');S.mode=null;S.screen='online';redraw();toast('Ton ancien salon est terminé. Tu peux créer une nouvelle partie.');}if(S.queued){const fn=S.queued;S.queued=null;fn();}return;}"],
    ["if(m.type==='welcome'){S.myId=m.id;S.code=m.code;S.mode='online';S.screen='lobby';redraw();if(m.reconnected)toast('Reconnexion réussie !');return;}","if(m.type==='welcome'){S.reconnectAttempt=0;S.recovering=false;S.queued=null;setSession('qpl-online-active','1');S.myId=m.id;S.code=m.code;S.mode='online';S.screen='lobby';redraw();if(m.reconnected)toast('Reconnexion réussie !');return;}"],
    ["if(m.type==='left'){S.code=null;S.room=null;S.myId=null;S.players=[];S.mode=null;S.screen='home';redraw();return;}","if(m.type==='left'){setSession('qpl-online-active','0');S.code=null;S.room=null;S.myId=null;S.players=[];S.mode=null;S.screen='home';redraw();return;}"],
    ["function leave(){clearAI();clearInterval(tickTimer);clearTimeout(soloAdvanceTimer);","function leave(){setSession('qpl-online-active','0');clearAI();clearInterval(tickTimer);clearTimeout(soloAdvanceTimer);"],
    ["if(roomInURL&&/^[a-f0-9]{6}$/i.test(roomInURL)){S.screen='online';}\nredraw();","if(roomInURL&&/^[a-f0-9]{6}$/i.test(roomInURL)){S.screen='online';}\nconst resumeLiveRoom=location.protocol!=='file:'&&getSession('qpl-online-active')==='1'&&!!getSession('qpl-token');\nif(resumeLiveRoom){S.mode='online';S.screen='online';S.token=getSession('qpl-token');S.recovering=true;}\nredraw();\nif(resumeLiveRoom)connect();"]
  ];
  for(const [before,after] of fixes){
    const first=source.indexOf(before);
    if(first<0||first!==source.lastIndexOf(before)){
      console.warn('Quiz Panic V1.1: patch source non concordant',before.slice(0,55));
      continue;
    }
    source=source.replace(before,after);applied++;
  }
  console.log('Quiz Panic V1.1: '+applied+'/'+fixes.length+' correctifs interface intégrés');
  return source;
}
module.exports={applyLiveRecoveryPatch};
