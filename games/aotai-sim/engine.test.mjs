import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,getActions,cartSummary,weightOf,weatherAt,validateSave,PRESETS,ITEMS,EVENTS,SCENARIOS} from './engine.mjs';

const run=(s,id)=>{const r=step(s,id);assert.equal(r.error,undefined,`${id}: ${r.error}`);assert.ok(validateSave(r.state),`invalid state after ${id}`);return r.state;};
function at(node,event=null,extra={}){
  const s=createGame();s.node=node;s.path=node==='foot'?['foot']:['foot',node];s.visited=[...s.path];s.event=event;return Object.assign(s,extra);
}
const available=(s,id)=>getActions(s).some(a=>a.id===id&&!a.disabled);
const policy={notice:'record',briefing:'record',stream:'filter',takin:'wait',fruit:'ignore',companion:'share',ridge:'low',fog:'map',memorial:'silence',cache:'fuel',rip:'repair',blister:'med',scramble:'gloves',companionCamp:'treat',saddle:'follow',hiker:'satellite',storm:'camp',hallucination:'check',ford:'poles',litter:'collect',dusk:'camp',cloud:'valley',bird:'watch',altitude:'med',hut:'report'};
function sensibleRun(config={}){
  let s=createGame(config);const actions=[];
  for(let i=0;i<180&&!s.outcome;i++){
    const ok=id=>available(s,id);let id;
    if(s.conditions.some(c=>c.id!=='leak')&&ok('use:med'))id='use:med';
    else if(s.hydration<40&&ok('use:water'))id='use:water';
    else if(s.satiety<40&&ok('use:ration'))id='use:ration';
    else if(s.warmth<40&&ok('heat'))id='heat';
    else if(s.energy<45&&ok('camp'))id='camp';
    else if(s.inventory.water<4&&ok('refill'))id='refill';
    else if(s.rescue)id='wait';
    else if(s.event)id=ok('choice:'+policy[s.event])?'choice:'+policy[s.event]:getActions(s).find(a=>a.kind==='choice'&&!a.disabled)?.id;
    else id='move:steady';
    s=run(s,id);actions.push(id);
  }
  return {state:s,actions};
}

test('recommended loadouts meet budget and capacity; the cart is not mutated',()=>{
  for(const p of Object.values(PRESETS)){
    const copy=structuredClone(p),sum=cartSummary(p);
    assert.ok(sum.price<=16000&&sum.weight<=sum.capacity);assert.equal(sum.error,'');
    assert.deepEqual(p,copy);assert.ok(validateSave(createGame(p)));
  }
});
test('invalid quantities, unknown gear, excess budget and capacity cannot start a run',()=>{
  for(const items of [{ration:-1},{ration:1.5},{ration:NaN},{unknown:1},{satellite:2}])assert.throws(()=>createGame({items}));
  assert.throws(()=>createGame({items:{ration:24,meal:12,water:8,snack:12},backpack:'light'}));
  assert.throws(()=>createGame({items:{...PRESETS.balanced.items,gps:1,med:8}}));
  assert.throws(()=>createGame({seed:-1}));assert.throws(()=>createGame({seed:1.5}));
});
test('every decision is immutable, seeded and reproducible from a snapshot',()=>{
  const s=at('stone','fog'),before=structuredClone(s);
  assert.deepEqual(step(s,'choice:guess'),step(s,'choice:guess'));assert.deepEqual(s,before);
  const copy=JSON.parse(JSON.stringify(s));assert.deepEqual(step(s,'choice:guess'),step(copy,'choice:guess'));
});
test('missing equipment locks a choice; illegal choices do not consume time or inventory',()=>{
  const s=at('stone','fog');delete s.inventory.map;delete s.inventory.gps;
  assert.match(getActions(s).find(a=>a.id==='choice:map').disabled,/地图/);
  const r=step(s,'choice:map');assert.ok(r.error);assert.deepEqual(r.state,s);assert.equal(r.report,null);
  assert.ok(!getActions(s).some(a=>a.kind==='travel'));
});
test('hot food requires and consumes fuel, water and one meal',()=>{
  const s=at('camp',null,{warmth:40,energy:40,satiety:20}),n=run(s,'use:meal');
  assert.equal(n.inventory.meal,s.inventory.meal-1);assert.equal(n.inventory.fuel,s.inventory.fuel-1);assert.equal(n.inventory.water,s.inventory.water-1);
  assert.ok(n.warmth>s.warmth&&n.energy>s.energy&&n.satiety>s.satiety);
  const empty=structuredClone(s);empty.inventory.fuel=0;assert.ok(step(empty,'use:meal').error);
});
test('stored food is separate from satiety, and empty water prevents drinking',()=>{
  const s=at('camp',null,{satiety:12,hydration:12}),rest=run(s,'rest');
  assert.ok(rest.satiety<s.satiety);assert.equal(rest.inventory.ration,s.inventory.ration);
  const fed=run(s,'use:ration');assert.ok(fed.satiety>50);s.inventory.water=0;assert.ok(step(s,'use:water').error);
});
test('a spent power bank still weighs the same, and dropping gear changes available choices',()=>{
  const s=at('camp',null,{battery:15}),charged=run(s,'use:battery');
  assert.ok(charged.battery>50);assert.equal(weightOf(charged),weightOf(s));assert.equal(charged.emptyBatteries,1);
  const dropped=run(s,'drop:tent');assert.ok(weightOf(dropped)<weightOf(s));assert.ok(!available(dropped,'camp'));
});
test('unprocessed water causes a delayed condition, not an instant scripted injury',()=>{
  let s=at('forest','stream',{seed:1});s=run(s,'choice:raw');
  assert.equal(s.conditions.length,0);assert.equal(s.delayed.length,1);
  const atTime=s.delayed[0].at;s.clock=atTime-.1;s=run(s,'rest');
  assert.ok(s.conditions.some(c=>c.id==='gastro'));assert.equal(s.delayed.length,0);
  const healed=run(s,'use:med');assert.ok(!healed.conditions.some(c=>c.id==='gastro'));
});
test('unrepaired damage has a later consequence and repair clears it',()=>{
  let s=at('stone','rip');s=run(s,'choice:ignore');assert.equal(s.conditions.length,0);
  s.clock=s.delayed[0].at-.1;s=run(s,'rest');assert.ok(s.conditions.some(c=>c.id==='leak'));
  assert.ok(!run(s,'repair').conditions.some(c=>c.id==='leak'));
});
test('more carried weight costs more energy on the same segment',()=>{
  const light=at('forest'),heavy=structuredClone(light);heavy.inventory.ration=24;
  const a=run(light,'move:steady'),b=run(heavy,'move:steady');assert.ok(b.energy<a.energy);assert.equal(a.node,b.node);
});
test('storm, altitude and night alter weather, and winter is colder',()=>{
  const s=at('ridge');assert.ok(weatherAt(s,17).inStorm);assert.ok(!weatherAt(s,30).inStorm);
  assert.ok(weatherAt(s,30,'ridge').temp<weatherAt(s,30,'foot').temp);
  assert.ok(weatherAt(s,14).night);const winter={...s,scenario:'snow'};assert.ok(weatherAt(winter,30).temp<weatherAt(s,30).temp);
});
test('a tent and sleep system recover more than exposed rest',()=>{
  const s=at('camp',null,{energy:30,warmth:35,clock:15}),bare=structuredClone(s);
  for(const key of ['tent','bag','mat'])delete bare.inventory[key];
  const a=run(s,'rest'),b=run(bare,'rest');assert.ok(a.energy>b.energy&&a.warmth>b.warmth);
});
test('route decisions change the actual next node and retreat retraces the chosen branch',()=>{
  let s=at('saddle','saddle');s=run(s,'choice:follow');s=run(s,'move:steady');
  assert.equal(s.node,'hollow');assert.equal(s.event,'hiker');assert.equal(s.quest.status,'found');
  s=run(s,'retreat');s=run(s,'move:steady');assert.equal(s.node,'saddle');s=run(s,'move:steady');
  assert.equal(s.node,'foot');assert.equal(s.outcome.kind,'retreated');
  const valley=run(run(at('cloud','cloud'),'choice:valley'),'move:steady');assert.equal(valley.node,'valley');
});
test('ridge choices change the subsequent travel time and exposure',()=>{
  const s=at('ridge','ridge'),low=run(s,'choice:low'),high=run(s,'choice:high');
  assert.ok(getActions(low).find(a=>a.id==='move:steady').minutes>getActions(high).find(a=>a.id==='move:steady').minutes);
  assert.ok(low.route.cover>high.route.cover);
});
test('sharing creates trust that changes a later farewell',()=>{
  const friend=run(at('bonsai','companion'),'choice:share'),stranger=run(at('bonsai','companion'),'choice:join');
  friend.event='companionCamp';stranger.event='companionCamp';
  const a=run(friend,'choice:part'),b=run(stranger,'choice:part');
  assert.equal(a.inventory.med,b.inventory.med+1);assert.equal(a.flags.helpedCompanion,true);assert.equal(a.companion,null);
});
test('escorting a companion starts a real retreat and grants an ending achievement',()=>{
  const s=at('camp','companionCamp',{companion:{name:'鹿宁'}}),n=run(run(s,'choice:escort'),'move:steady');
  assert.equal(n.outcome.kind,'retreated');assert.ok(n.outcome.achievements.includes('escort'));
});
test('provisioning a hiker consumes real inventory; it is not the same as reporting',()=>{
  const s=at('hollow','hiker'),n=run(s,'choice:provision');
  assert.equal(n.inventory.ration,s.inventory.ration-3);assert.equal(n.inventory.blanket,s.inventory.blanket-1);
  assert.equal(n.quest.status,'waiting');assert.equal(n.quest.remaining,null);assert.ok(n.quest.deadline>n.clock);
});
test('reporting starts a rescue countdown and time can still run out before arrival',()=>{
  const s=at('hut',null,{quest:{status:'waiting',deadline:5,remaining:null,mode:'basic'}}),n=run(s,'report');
  assert.equal(n.quest.status,'reported');assert.ok(n.quest.remaining>0);const expired=run(n,'camp');assert.equal(expired.quest.status,'failed');
});
test('a failed hiker mission cannot be resurrected by reopening the same event',()=>{
  const s=at('hollow','hiker',{quest:{status:'found',deadline:.1,remaining:null,mode:'found'}}),expired=run(s,'rest');
  assert.equal(expired.quest.status,'failed');assert.ok(!available(expired,'choice:satellite'));
  const n=run(expired,'choice:report');assert.equal(n.quest.status,'failed');
});
test('satellite aid can save the hiker while the player continues; storms slow rescue',()=>{
  const s=at('hollow','hiker'),n=run(s,'choice:satellite');assert.equal(n.quest.status,'reported');
  let t=n;for(let i=0;i<9&&t.quest.status!=='rescued';i++)t=run(t,'rest');assert.equal(t.quest.status,'rescued');assert.equal(t.outcome,null);
  const calm=at('camp',null,{clock:30,quest:{status:'reported',deadline:80,remaining:8,mode:'direct'}}),storm=structuredClone(calm);storm.clock=16;
  assert.ok(run(storm,'rest').quest.remaining>run(calm,'rest').quest.remaining);
});
test('own rescue fixes position, blocks travel and produces a safe ending after waiting',()=>{
  let s=run(createGame(),'sos');assert.ok(s.rescue);assert.ok(!getActions(s).some(a=>a.kind==='travel'));assert.equal(s.event,null);
  for(let i=0;i<8&&!s.outcome;i++)s=run(s,'wait');assert.equal(s.outcome.kind,'rescued');assert.ok(s.outcome.achievements.includes('home'));
});
test('low sanity triggers a decision event, and low resources harm health gradually',()=>{
  let s=at('stone',null,{san:20});s=run(s,'rest');assert.equal(s.event,'hallucination');
  const starving=at('forest',null,{satiety:0,hydration:0,health:50}),n=run(starving,'rest');assert.ok(n.health<50&&n.health>0);
  assert.equal(n.outcome,null);
});
test('hut supplies can be bought only once and water remains bounded',()=>{
  const s=at('hut',null,{money:500}),n=run(s,'resupply');assert.equal(n.money,200);assert.ok(!available(n,'resupply'));assert.ok(n.inventory.water<=ITEMS.water.max);
  const noWater=at('stone');assert.ok(step(noWater,'refill').error);
});
test('all authored event choices preserve valid finite states and input snapshots',()=>{
  for(const [event,e] of Object.entries(EVENTS))for(const c of e.choices){
    const s=at(event==='hut'?'hut':event==='hiker'?'hollow':'camp',event,{health:75,energy:75,warmth:60,satiety:80,hydration:80,san:60});
    for(const [id,n] of Object.entries(c.requires.items||{}))s.inventory[id]=Math.max(s.inventory[id]||0,n);
    if(event==='hiker')s.quest={status:'found',deadline:12,remaining:null,mode:'found'};
    if(event==='companionCamp')s.companion={name:'鹿宁'};
    const before=structuredClone(s),r=step(s,`choice:${c.id}`);
    assert.equal(r.error,undefined,`${event}/${c.id}`);assert.ok(validateSave(r.state),`${event}/${c.id}`);assert.deepEqual(s,before);
  }
});
test('corrupt saves and old model versions are rejected',()=>{
  const s=createGame();assert.ok(validateSave(JSON.parse(JSON.stringify(s))));
  for(const change of [{version:1},{inventory:{ration:-1}},{path:['unknown']},{event:'unknown'},{health:NaN},{conditions:[{id:'unknown'}]},{quest:{status:'reported',deadline:50,remaining:NaN}}])assert.ok(!validateSave({...s,...change}));
});
test('all three stories can be completed with bounded supplies and a rescued hiker',()=>{
  for(const scenario of Object.keys(SCENARIOS)){
    const {state:s}=sensibleRun({scenario,seed:261006});assert.equal(s.outcome?.kind,'completed',scenario);assert.equal(s.quest?.status,'rescued',scenario);
    assert.ok(s.clock<96&&s.health>0);assert.ok(s.outcome.achievements.includes('rescuer'));
  }
});
test('varied seeds produce complete valid runs rather than stalled decisions',()=>{
  const events=new Set();
  for(let seed=1;seed<=12;seed++){
    const {state:s}=sensibleRun({seed});assert.ok(s.outcome,`seed ${seed}`);s.seen.forEach(e=>events.add(e));
  }
  assert.ok(events.size>=15);
});
test('an unprepared player cannot win by repeatedly walking through every situation',()=>{
  let s=createGame({items:{},backpack:'light',scenario:'snow'});
  for(let i=0;i<150&&!s.outcome;i++){
    const a=getActions(s).find(a=>a.kind==='choice'&&!a.disabled)||getActions(s).find(a=>a.kind==='travel'&&!a.disabled)||getActions(s).find(a=>a.id==='rest');
    s=run(s,a.id);
  }
  assert.equal(s.outcome?.kind,'critical');
});
