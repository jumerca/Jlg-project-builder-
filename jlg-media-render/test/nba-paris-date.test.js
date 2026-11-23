'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../lib/sports');
function game(id,time,scoreA='0',scoreB='0'){
 return {id,date:time,status:{type:{state:'post',completed:true}},competitions:[{competitors:[{homeAway:'home',team:{displayName:'Dom.'},score:scoreA},{homeAway:'away',team:{displayName:'Ext.'},score:scoreB}]}]};
}
test('NBA matches played after midnight in Paris remain visible even when ESPN indexes the prior US date',async()=>{
 const urls=[];
 const fetcher=async url=>{
  urls.push(url);
  const day=new URL(url).searchParams.get('dates');
  return {ok:true,json:async()=>({events:day==='20261122'?[game('nba-early','2026-11-23T01:20:00Z','103','99'),game('nba-before','2026-11-22T15:00:00Z')]:[game('nba-early','2026-11-23T01:20:00Z','103','99'),game('nba-late','2026-11-23T20:00:00Z')]})};
 };
 const league=S.SOURCE.find(x=>x.sport==='Basket');
 const result=await S.espn(league,'2026-11-23',fetcher);
 assert.equal(result.ok,true);
 assert.equal(urls.length,2);
 assert.ok(urls.some(u=>u.includes('20261122')));
 assert.deepEqual(result.events.map(e=>e.id).sort(),['nba-early','nba-late']);
 assert.equal(result.events[0].homeScore,103);
 assert.equal(result.events[0].awayScore,99);
});
test('European football score queries continue to use only the selected local day',async()=>{
 const urls=[];
 const fetcher=async url=>{urls.push(url);return {ok:true,json:async()=>({events:[]})}};
 const result=await S.espn(S.SOURCE[0],'2026-11-23',fetcher);
 assert.equal(result.ok,true);
 assert.equal(urls.length,1);
});
