'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {standings}=require('../lib/sports');
function entry(name,wins,losses,seed){return {team:{displayName:name},stats:[{name:'wins',value:wins},{name:'losses',value:losses},{name:'playoffSeed',value:seed}]}}
test('NBA ranks come from ESPN playoffSeed for each conference, not array order',async()=>{
 const mock={ok:true,json:async()=>({children:[{name:'Eastern Conference',standings:{entries:[entry('Bucks',1,16,15),entry('76ers',14,3,1)]}},{name:'Western Conference',standings:{entries:[entry('Kings',2,14,15),entry('Lakers',14,3,2)]}}]})};
 const r=await standings('basketball','nba',async()=>mock);
 assert.equal(r.ok,true);assert.deepEqual(r.records.map(x=>[x.conference,x.rank,x.team,x.points]),[['Est',1,'76ers','14–3'],['Est',15,'Bucks','1–16'],['Ouest',2,'Lakers','14–3'],['Ouest',15,'Kings','2–14']]);
});
test('NBA does not invent a rank when ESPN playoffSeed is absent',async()=>{
 const mock={ok:true,json:async()=>({children:[{name:'Eastern Conference',standings:{entries:[entry('Test',3,4,null)]}}]})};
 const r=await standings('basketball','nba',async()=>mock);
 assert.equal(r.records[0].rank,null);
});
