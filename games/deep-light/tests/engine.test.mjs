import test from 'node:test';
import assert from 'node:assert/strict';
import {W,H,ORES,BOSSES,QUESTS} from '../data.mjs?v=cloud-1';
import {createGame,step,idx,tile,harvest,capacity,weight,value,sell,upgrade,buy,use,interact,warp,attack,snapshot,restore,drillable} from '../engine.mjs?v=cloud-1';
const tick=(s,input={},seconds=1)=>{for(let t=0;t<seconds;t+=.02)step(s,input,.02);};
test('map generation is deterministic with intact boundaries and all campaign content',()=>{
 for(const seed of [1,2,19,4399,2009]){const s=createGame(seed);assert.deepEqual(s.world,createGame(seed).world);assert.equal(s.world.length,W*H);for(let y=7;y<H;y++){assert.equal(tile(s,0,y),5);assert.equal(tile(s,W-1,y),5);}for(const id of Object.keys(ORES))assert.ok(s.world.includes(Number(id)));assert.equal(s.relays.length,4);assert.equal(s.bosses.length,3);assert.equal(s.chests.filter(c=>c.letter).length,5);for(const b of s.bosses)assert.equal(tile(s,b.x,b.y),0);assert.equal(tile(s,32,7),10);}
});
test('held digging and repeated short taps both collect minerals; hard rock and bag capacity gate mining',()=>{
 const s=createGame(1);tick(s,{down:true},.65);assert.equal(s.bag[10],1);assert.ok(s.p.y>=7);const taps=createGame(1);for(let i=0;i<5;i++){tick(taps,{down:true},.18);tick(taps,{},.08);}assert.ok(taps.bag[10]>=1);
 assert.equal(drillable(s,3),false);s.gear.drill=1;assert.equal(drillable(s,3),true);assert.equal(drillable(s,4),false);s.gear.drill=2;assert.equal(drillable(s,4),true);assert.equal(drillable(s,5),false);
 s.bag[10]=capacity(s);s.world[idx(35,8)]=17;assert.equal(harvest(s,35,8),false);assert.equal(tile(s,35,8),17);assert.equal(harvest(s,35,8,true),true);assert.equal(s.drops.length,1);assert.equal(weight(s),capacity(s));
});
test('selling grants correct gold, completes a commission once, and upgrades require safe locations and money',()=>{
 const s=createGame(2);s.bag[10]=6;assert.equal(value(s),108);assert.equal(sell(s),108);assert.equal(s.coins,308);assert.ok(s.quests.includes('copper'));assert.equal(s.bag[10],0);assert.equal(sell(s),0);assert.equal(s.coins,308);assert.equal(upgrade(s,'drill'),true);assert.equal(s.gear.drill,1);assert.equal(s.coins,128);assert.equal(upgrade(s,'tank'),false);assert.equal(buy(s,'bomb'),true);assert.equal(s.coins,73);s.p.y=20;assert.equal(upgrade(s,'bag'),false);assert.equal(sell(s),0);
});
test('relay activation, free station travel, rescue and supplies preserve progression',()=>{
 const s=createGame(3),a=s.relays[0];s.p.x=a.x;s.p.y=a.y;interact(s);assert.equal(a.active,true);assert.equal(s.p.air,120);assert.ok(s.quests.includes('relay'));assert.equal(warp(s,'camp'),true);s.p.y=20;assert.equal(warp(s,a.id),false);assert.equal(use(s,'beacon'),true);assert.equal(s.p.y,6);s.p.y=40;s.p.air=0;s.p.hp=1;s.coins=100;s.bag[10]=10;s.gear.drill=2;s.p.inv=0;tick(s,{},.1);assert.equal(s.stats.rescues,1);assert.ok(Math.abs(s.p.y-a.y)<3);assert.equal(s.coins,90);assert.equal(s.bag[10],6);assert.equal(s.gear.drill,2);
});
test('bombs mine hard rock, respect foundations and produce overflow drops',()=>{
 const s=createGame(4);s.p.x=20;s.p.y=20;s.p.px=20;s.p.py=20;s.p.face=1;s.p.inv=4;for(let y=18;y<=23;y++)for(let x=18;x<=24;x++)s.world[idx(x,y)]=4;s.world[idx(21,20)]=17;s.world[idx(22,20)]=5;s.world[idx(20,20)]=0;s.bag[10]=24;use(s,'bomb');tick(s,{},1.4);assert.equal(tile(s,21,20),0);assert.equal(tile(s,22,20),5);assert.ok(s.drops.some(d=>d.tile===17));assert.equal(s.supplies.bomb,1);
});
test('all three bosses can be defeated and final guardian requires two seals',()=>{
 const s=createGame(5);s.gear.drill=4;s.gear.armor=4;s.p.inv=999;s.p.x=s.bosses[2].x;s.p.y=s.bosses[2].y+3;tick(s,{},.05);assert.equal(s.bosses[2].awake,false);attack(s);assert.equal(s.bosses[2].hp,BOSSES[2].hp);
 for(const b of s.bosses){s.p.x=b.x;s.p.y=b.y+3;s.p.px=s.p.x;s.p.py=s.p.y;tick(s,{},.05);assert.equal(b.awake,true);for(let i=0;i<20&&!b.dead;i++){s.attackTimer=0;attack(s);}assert.equal(b.dead,true);assert.equal(tile(s,b.x+7,b.y+4),0);}
 assert.equal(s.won,true);assert.ok(s.events.some(e=>e.kind==='win'));
});
test('boss windups produce attacks and oxygen/flight remain limited',()=>{
 const s=createGame(6),b=s.bosses[0];s.p.x=b.x+3;s.p.y=b.y+3;s.p.px=s.p.x;s.p.py=s.p.y;s.p.inv=99;tick(s,{},5);assert.ok(s.shots.some(p=>p.kind==='wave'));assert.ok(s.p.air<120);
 s.p.x=32;s.p.y=10;s.world[idx(32,10)]=0;s.world[idx(32,9)]=1;s.world[idx(32,11)]=0;const fuel=s.p.fuel;tick(s,{up:true},1);assert.ok(s.p.fuel<fuel); // Holding against a ceiling is not free hovering.
});
test('save snapshots round trip progress and reject malformed files',()=>{
 const s=createGame(7);s.bag[10]=3;s.gear.drill=2;s.relays[0].active=true;s.bosses[0].dead=true;s.bosses[0].hp=0;s.events.push({kind:'win'});const copy=restore(JSON.parse(JSON.stringify(snapshot(s))));assert.equal(copy.bag[10],3);assert.equal(copy.gear.drill,2);assert.equal(copy.relays[0].active,true);assert.equal(copy.bosses[0].dead,true);assert.deepEqual(copy.events,[]);assert.notEqual(copy.world,s.world);
 const invalid=[{...snapshot(s),version:0},{...snapshot(s),world:[]},{...snapshot(s),gear:{...s.gear,drill:99}},{...snapshot(s),coins:-1},{...snapshot(s),p:{...s.p,x:Infinity}},{...snapshot(s),world:s.world.map((v,i)=>i===8?99:v)}];for(const data of invalid)assert.throws(()=>restore(data));
});
