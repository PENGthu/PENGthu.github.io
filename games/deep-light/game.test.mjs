import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,update,at,index,W,H,SURFACE,CORES,ORES,cargoValue,cargoWeight,capacity,buy,sell,useSupply,attack,maxHP,maxAir,encode,decode} from './engine.mjs';
function run(s,seconds,input={}){for(let t=0;t<seconds;t+=.02)update(s,.02,input);}
test('world generation is deterministic, bounded, and contains all objective tiles',()=>{
  for(let seed=1;seed<=40;seed++){
    const s=createGame(seed);assert.deepEqual(s.world,createGame(seed).world);assert.equal(s.world.length,W*H);
    for(const core of CORES)assert.equal(at(s,core.x,core.y),core.tile);
    assert.equal(at(s,24,116),14);assert.equal(at(s,0,80),9);assert.equal(at(s,24,119),9);
    for(const [x,y] of [[24,6],[24,7],[25,7],[23,8],[24,9],[25,10]])assert.equal(at(s,x,y),3);
    // Flood-fill all terrain that a fully upgraded drill can open, avoiding lava.
    const visited=new Set([index(24,SURFACE)]),stack=[[24,SURFACE]];
    while(stack.length){const [x,y]=stack.pop();for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,i=index(nx,ny);if(nx<=0||nx>=W-1||ny<1||ny>=H-1||visited.has(i)||at(s,nx,ny)===10)continue;visited.add(i);stack.push([nx,ny]);}}
    CORES.forEach(c=>assert.ok(visited.has(index(c.x,c.y))));assert.ok(visited.has(index(24,116)));
  }
});
test('mining gives ore exactly once and a complete first trip can be sold',()=>{
  const s=createGame(9);run(s,.7,{down:true});assert.ok(s.p.y>SURFACE);assert.ok(s.bag[3]>=1);assert.equal(at(s,24,6),0);
  const mined=s.stats.mined,value=cargoValue(s);assert.ok(value>0);assert.ok(useSupply(s,'recalls'));assert.equal(s.p.y,SURFACE);assert.equal(s.p.hp,maxHP(s));assert.equal(s.p.air,maxAir(s));
  assert.equal(sell(s),value);assert.equal(cargoWeight(s),0);assert.equal(s.coins,60+value);assert.equal(s.stats.mined,mined);assert.equal(sell(s),0);
});
test('full bag preserves ore instead of silently deleting it',()=>{
  const s=createGame(3);s.bag[3]=capacity(s);run(s,1,{down:true});assert.equal(s.p.y,SURFACE);assert.equal(at(s,24,6),3);assert.equal(s.bag[3],18);
});
test('shop cannot overspend or work underground; upgrades change stats and unlock rock',()=>{
  const s=createGame(1);assert.equal(buy(s,'equipment','drill'),false);assert.equal(s.coins,60);s.coins=3000;
  assert.ok(buy(s,'equipment','tank'));assert.equal(maxAir(s),180);assert.equal(s.p.air,180);
  assert.ok(buy(s,'equipment','bag'));assert.equal(capacity(s),32);assert.ok(buy(s,'equipment','armor'));assert.equal(maxHP(s),125);
  s.world[index(24,6)]=8;run(s,3,{down:true});assert.equal(s.p.y,SURFACE);assert.ok(buy(s,'equipment','drill'));run(s,1.5,{down:true});assert.ok(s.p.y>SURFACE);assert.equal(buy(s,'equipment','bag'),false);
  useSupply(s,'recalls');const cost=s.coins;assert.ok(buy(s,'supply','bombs'));assert.equal(s.coins,cost-45);
  s.upgrades.drill=3;assert.equal(buy(s,'equipment','drill'),false);
});
test('oxygen tank and recall consume exactly one supply and preserve cargo',()=>{
  const s=createGame(4);s.p.y=10;s.surface=false;s.p.air=20;s.bag[5]=4;const initial=s.supplies.tanks;assert.ok(useSupply(s,'tanks'));assert.equal(s.p.air,95);assert.equal(s.supplies.tanks,initial-1);
  s.p.air=maxAir(s);assert.equal(useSupply(s,'tanks'),false);assert.equal(s.supplies.tanks,initial-1);
  const recalls=s.supplies.recalls;assert.ok(useSupply(s,'recalls'));assert.equal(s.supplies.recalls,recalls-1);assert.equal(s.bag[5],4);assert.equal(useSupply(s,'recalls'),false);
});
test('bombs break hard terrain, respect borders and do not hurt the miner',()=>{
  const s=createGame(5);s.surface=false;s.p.y=s.p.py=20;s.p.x=s.p.px=24;
  for(let y=18;y<23;y++)for(let x=22;x<28;x++)s.world[index(x,y)]=9;
  s.world[index(24,20)]=0;s.enemies=[];assert.ok(useSupply(s,'bombs'));run(s,1.2,{up:true});assert.equal(at(s,25,20),0);assert.equal(at(s,0,20),9);assert.equal(s.p.hp,100);assert.equal(s.supplies.bombs,2);
});
test('rescue retains upgrades and cores, clears cargo and avoids a supply softlock',()=>{
  const s=createGame(2);s.p.y=9;s.surface=false;s.p.air=0;s.p.hp=1;s.bag[7]=1;s.cores[0]=true;s.upgrades.tank=2;s.supplies.recalls=0;s.coins=200;run(s,.1);
  assert.equal(s.p.y,SURFACE);assert.equal(s.p.hp,100);assert.equal(s.p.air,240);assert.equal(s.cores[0],true);assert.equal(s.bag[7],0);assert.equal(s.coins,180);assert.equal(s.stats.rescues,1);assert.equal(s.supplies.recalls,1);
});
test('core collection, shield gating, boss defeat and final rescue are completable',()=>{
  const s=createGame(7);s.enemies=[];s.upgrades.drill=3;s.p.invincible=10000;
  for(const [i,c] of CORES.entries()){
    s.p.x=s.p.px=c.x-1;s.p.y=s.p.py=c.y;s.surface=false;s.world[index(c.x-1,c.y)]=0;s.world[index(c.x-1,c.y+1)]=1;s.moveTimer=0;
    run(s,.5,{right:true});assert.equal(s.cores[i],true);assert.equal(at(s,c.x,c.y),0);
  }
  s.p.x=s.p.px=23;s.p.y=s.p.py=115;s.p.face=1;s.boss.x=24;s.surface=false;s.attackTimer=0;s.cores[0]=false;attack(s);assert.equal(s.boss.hp,220);
  s.cores[0]=true;for(let i=0;i<9;i++){s.attackTimer=0;attack(s);}assert.equal(s.boss.dead,true);assert.equal(s.boss.hp,0);
  s.p.x=s.p.px=24;s.p.y=s.p.py=115;s.moveTimer=0;run(s,.08,{down:true});assert.equal(s.won,true);
  // Supplies remain usable if the player chooses to keep exploring after winning.
  assert.ok(useSupply(s,'recalls'));
});
test('save roundtrip retains terrain, progress, equipment and inventory; malformed data is rejected',()=>{
  const s=createGame(31);run(s,2,{down:true});s.cores[1]=true;const restored=decode(encode(s));assert.ok(restored);assert.deepEqual(restored.world,s.world);assert.deepEqual(restored.bag,s.bag);assert.deepEqual(restored.cores,s.cores);assert.equal(restored.p.x,s.p.x);assert.equal(restored.p.y,s.p.y);assert.equal(restored.events.length,0);
  assert.equal(decode(null),null);assert.equal(decode('{bad json'),null);assert.equal(decode('{}'),null);
  const bad=JSON.parse(encode(s));bad.world.pop();assert.equal(decode(JSON.stringify(bad)),null);
  const bad2=JSON.parse(encode(s));bad2.bag[3]=-1;assert.equal(decode(JSON.stringify(bad2)),null);
});
