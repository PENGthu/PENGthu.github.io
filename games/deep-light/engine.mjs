import {W,H,SURFACE,VERSION,biome,ORES,EQUIPMENT,SUPPLIES,MONSTERS,BOSSES,RELAYS,QUESTS,LETTERS} from './data.mjs?v=cloud-1';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const idx=(x,y)=>Math.floor(y)*W+Math.floor(x);
export const tile=(s,x,y)=>x<0||x>=W||y<0||y>=H?5:s.world[idx(x,y)];
export const maxHP=s=>100+s.gear.armor*25,maxAir=s=>120+s.gear.tank*50,maxFuel=s=>100+s.gear.jet*30,capacity=s=>24+s.gear.bag*16;
export const weight=s=>Object.entries(s.bag).reduce((n,[id,v])=>n+ORES[id].weight*v,0);
export const value=s=>Object.entries(s.bag).reduce((n,[id,v])=>n+ORES[id].value*v,0);
export const depth=s=>Math.max(0,Math.round((s.p.y-SURFACE)*6));
const random=seed=>{let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,a|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};};
const emit=(s,text,kind='info')=>s.events.push({text,kind});
function room(world,x,y,rx=5,ry=2){for(let yy=y-ry;yy<=y+ry;yy++)for(let xx=x-rx;xx<=x+rx;xx++)if(xx>1&&xx<W-2&&yy>SURFACE&&yy<H-2&&((xx-x)/rx)**2+((yy-y)/ry)**2<=1)world[idx(xx,yy)]=0;}
export function createGame(seed=Date.now()>>>0){
 const r=random(seed),world=Array(W*H).fill(0),seen=Array(W*H).fill(0),enemies=[],chests=[];
 for(let y=SURFACE+1;y<H;y++)for(let x=0;x<W;x++){
  const b=biome(y),roll=r();let t=y<34?1:y<95?2:y<126?3:4;
  if(x===0||x===W-1||y===H-1)t=5;
  else if(roll<.23)t=b.ore[Math.floor(r()*b.ore.length)];
  else if(roll<.26)t=y>99?6:y>65?18:y>34?3:2;
  else if(roll<.28&&y>65)t=7;
  world[idx(x,y)]=t;
 }
 for(let y=15;y<132;y+=9){
  const x=8+Math.floor(r()*47);room(world,x,y,6,2);
  const kinds=y<34?['grub']:y<64?['bat','snail']:y<95?['spore','orb']:['crab','sentinel'];
  for(let n=0;n<2;n++){const kind=kinds[n%kinds.length],m=MONSTERS[kind];enemies.push({id:`m${y}-${n}`,kind,x:x-2+n*4,y:y+1,px:x-2+n*4,py:y+1,hp:m.hp,face:n?1:-1,cool:.3+r(),hit:0,phase:r()*6});}
  if(y%3===0)chests.push({id:`c${y}`,x:x+3,y:y+1,opened:false,letter:chests.length%3===0});
 }
 // A broken, staggered service route gives every campaign a reliable way down.
 for(let y=10;y<131;y+=5){const cx=30+Math.round(Math.sin(y*.14)*3);room(world,cx,y,3,1);}
 for(const a of RELAYS){room(world,a.x,a.y,4,2);world[idx(a.x,a.y+2)]=5;world[idx(a.x+1,a.y+2)]=5;}
 for(const b of BOSSES){
  for(let y=b.y-4;y<=b.y+3;y++)for(let x=b.x-8;x<=b.x+8;x++)world[idx(x,y)]=0;
  for(let x=b.x-8;x<=b.x+8;x++)world[idx(x,b.y+4)]=5;
  world[idx(b.x+7,b.y+4)]=2;
 }
 for(const [x,y] of [[32,7],[32,8],[33,8],[32,9],[31,10],[34,10],[33,11],[34,11]])world[idx(x,y)]=10;
 const s={version:VERSION,seed,world,seen,p:{x:32,y:SURFACE,px:32,py:SURFACE,face:1,hp:100,air:120,fuel:100,inv:0,heat:0},gear:{drill:0,tank:0,bag:0,armor:0,jet:0},bag:Object.fromEntries(Object.keys(ORES).map(x=>[x,0])),coins:80,supplies:{med:2,air:2,bomb:2,beacon:2,sonar:1},relays:RELAYS.map(x=>({...x,active:false})),bosses:BOSSES.map(x=>({...x,maxHp:x.hp,dead:false,awake:false,timer:3.8,windup:0,hit:0,phase:0,gateWarn:false})),enemies,chests,quests:[],stats:{mined:0,soldCopper:0,earned:0,kills:0,bestDepth:0,samples:0,logs:0,time:0,rescues:0},bombs:[],shots:[],drops:[],particles:[],events:[],overheated:false,dig:null,moveTimer:0,fallTimer:0,fallDistance:0,attackTimer:0,sonar:0,shake:0,won:false};
 reveal(s,32,SURFACE,12);return s;
}
export function reveal(s,x,y,r=5){for(let yy=Math.max(0,Math.floor(y-r));yy<=Math.min(H-1,y+r);yy++)for(let xx=Math.max(0,Math.floor(x-r));xx<=Math.min(W-1,x+r);xx++)if((xx-x)**2+(yy-y)**2<=r*r)s.seen[idx(xx,yy)]=1;}
export const safe=s=>s.p.y<=SURFACE||s.relays.some(a=>a.active&&Math.hypot(a.x-s.p.x,a.y-s.p.y)<3);
export const canShop=s=>safe(s);
export function context(s){
 if(s.p.y<=SURFACE)return 'E · 老狸的矿站商店';
 const c=s.chests.find(c=>!c.opened&&Math.hypot(c.x-s.p.x,c.y-s.p.y)<2.2);if(c)return c.letter?'E · 阅读旧城信匣':'E · 打开物资箱';
 const a=s.relays.find(a=>Math.hypot(a.x-s.p.x,a.y-s.p.y)<3);if(a)return a.active?'E · 驿站补给 / 传送':`E · 点亮${a.name}`;
 return '长按方向挖掘 · 空格挥钻';
}
function burst(s,x,y,color,count=12){for(let i=0;i<count;i++){const h=Math.sin(i*44.13+s.stats.time*7);s.particles.push({x:x+.5,y:y+.5,vx:h*3,vy:-1-Math.abs(Math.cos(i*7.6))*3,life:.4+(i%5)*.08,color});}}
export function harvest(s,x,y,forced=false){
 const t=tile(s,x,y);if(!t||t===5||x<=0||x>=W-1||y>=H-1)return false;
 if(ORES[t]){
  if(weight(s)+ORES[t].weight>capacity(s)){if(!forced){emit(s,'矿袋满了：去驿站卖矿，或换一条支路。','warn');return false;}s.drops.push({x,y,tile:t,life:60});}
  else{s.bag[t]++;emit(s,`+ ${ORES[t].name}`, 'ore');}
 }
 if(t===18){s.stats.samples++;emit(s,'+ 萤光菌样本','success');}
 s.world[idx(x,y)]=0;s.stats.mined++;burst(s,x,y,ORES[t]?.color||'#d5b48b');return true;
}
export const drillable=(s,t)=>t!==5&&(!(t===3)||s.gear.drill>=1)&&(!(t===4)||s.gear.drill>=2);
const hardness=t=>ORES[t]?(t-9)*.085+.36:t===1?.28:t===2?.55:t===3?1.1:t===4?1.65:.25;
function dig(s,x,y,dt){
 const t=tile(s,x,y);if(!t)return;
 if(!drillable(s,t)){if(!s.dig||s.dig.x!==x||s.dig.y!==y)emit(s,t===5?'这是驿站基座或不可开采的边界。':'岩层太硬：升级钻头，或使用岩爆球。','warn');s.dig={x,y,progress:0,blocked:true};return;}
 if(s.overheated){s.dig=null;return;}
 if(!s.dig||s.dig.x!==x||s.dig.y!==y)s.dig={x,y,progress:0,blocked:false};
 s.dig.idle=0;s.dig.progress+=dt*(1+s.gear.drill*.5)/hardness(t);s.p.heat=Math.min(100,s.p.heat+dt*16);if(s.p.heat>=100)s.overheated=true;
 if(s.dig.progress>=1){harvest(s,x,y);s.dig=null;}
}
function hurt(s,amount,reason){
 if(s.p.inv>0||safe(s))return;
 s.p.hp-=amount*(1-s.gear.armor*.14);s.p.inv=.65;s.shake=.2;burst(s,s.p.x,s.p.y,'#ff956f',10);
 if(s.p.hp<=0)rescue(s,reason);
}
function destination(s,id){if(id==='camp')return{x:32,y:SURFACE,name:'风车矿站'};return s.relays.find(a=>a.id===id&&a.active);}
export function warp(s,id,free=false){
 const a=destination(s,id);if(!a||(!free&&!safe(s)))return false;
 s.p.x=a.x;s.p.y=a.y;s.p.px=a.x;s.p.py=a.y;s.p.hp=maxHP(s);s.p.air=maxAir(s);s.p.fuel=maxFuel(s);s.p.heat=0;s.overheated=false;s.p.inv=2;s.fallDistance=0;s.dig=null;s.shots=[];reveal(s,a.x,a.y,8);emit(s,`抵达 ${a.name} · 已补满生命与氧气`,'success');return true;
}
function rescue(s,reason){
 s.stats.rescues++;s.coins=Math.floor(s.coins*.9);for(const id of Object.keys(s.bag))s.bag[id]=Math.floor(s.bag[id]*.65);
 const a=s.relays.filter(a=>a.active&&a.y<=s.p.y).sort((a,b)=>b.y-a.y)[0];warp(s,a?.id||'camp',true);emit(s,`${reason} · 阿零带你回到驿站，损失部分矿物与 10% 金币。`,'warn');
}
export function sell(s){if(!canShop(s))return 0;const n=value(s);if(!n){emit(s,'矿袋里还没有矿物。');return 0;}s.coins+=n;s.stats.earned+=n;s.stats.soldCopper+=s.bag[10];for(const id of Object.keys(s.bag))s.bag[id]=0;emit(s,`卖出全部矿物 · + ${n} 金币`,'success');progress(s);return n;}
export function upgrade(s,id){const d=EQUIPMENT[id];if(!canShop(s)||!d||s.gear[id]>=4)return false;const cost=d.costs[s.gear[id]];if(s.coins<cost){emit(s,'金币还不够，先带回一袋矿物吧。','warn');return false;}s.coins-=cost;s.gear[id]++;s.p.hp=maxHP(s);s.p.air=maxAir(s);s.p.fuel=maxFuel(s);emit(s,`已装备 ${d.names[s.gear[id]]}`,'success');return true;}
export function buy(s,id){const d=SUPPLIES[id];if(!canShop(s)||!d||s.coins<d.price){emit(s,'金币不够，或需要先回到补给点。','warn');return false;}s.coins-=d.price;s.supplies[id]++;emit(s,`买到 ${d.name}`,'success');return true;}
export function use(s,id){
 if(!SUPPLIES[id]||s.supplies[id]<=0){emit(s,'这个道具用完了，去矿站或驿站补给。','warn');return false;}
 if(id==='med'&&s.p.hp>=maxHP(s)||id==='air'&&s.p.air>=maxAir(s)){emit(s,'目前已经补满，不用浪费道具。');return false;}
 s.supplies[id]--;
 if(id==='med')s.p.hp=Math.min(maxHP(s),s.p.hp+70);
 if(id==='air')s.p.air=Math.min(maxAir(s),s.p.air+85);
 if(id==='bomb'){const x=clamp(s.p.x+s.p.face,1,W-2);s.bombs.push({x,y:s.p.y,ttl:1.3});emit(s,'岩爆球已放置，离远一点！','warn');}
 if(id==='beacon'){const a=s.relays.filter(a=>a.active&&a.y<=s.p.y).sort((a,b)=>b.y-a.y)[0];warp(s,a?.id||'camp',true);}
 if(id==='sonar'){s.sonar=12;reveal(s,s.p.x,s.p.y,13);emit(s,'声呐响起：附近矿物与洞穴已标记。','success');}
 return true;
}
export function interact(s){
 const c=s.chests.find(c=>!c.opened&&Math.hypot(c.x-s.p.x,c.y-s.p.y)<2.2);
 if(c){c.opened=true;const coins=80+Math.floor(c.y*3);s.coins+=coins;s.supplies.air++;if(c.letter){const text=LETTERS[s.stats.logs%LETTERS.length];s.stats.logs++;s.events.push({kind:'letter',text,title:'旧城信匣'});}else emit(s,`物资箱：+ ${coins} 金币、氧气胶囊 × 1`,'success');progress(s);return;}
 const a=s.relays.find(a=>Math.hypot(a.x-s.p.x,a.y-s.p.y)<3);
 if(a&&!a.active){a.active=true;s.p.hp=maxHP(s);s.p.air=maxAir(s);s.p.fuel=maxFuel(s);emit(s,`点亮 ${a.name}`,'success');progress(s);return;}
 if(canShop(s))s.events.push({kind:'shop'});else emit(s,'走近信匣、驿站，或回到地表再交互。');
}
function bossHit(s,b,damage){if(b.dead||!b.awake)return;b.hp-=damage;b.hit=.22;burst(s,b.x,b.y,b.color,14);if(b.hp<=0){b.dead=true;b.hp=0;s.coins+=b.reward;s.shots=[];s.supplies.med+=2;s.supplies.air+=2;s.world[idx(b.x+7,b.y+4)]=0;s.events.push({kind:'story',id:b.id});emit(s,`${b.name}已停止 · 风印 +1 · 金币 +${b.reward}`,'success');if(b.id==='storm'){s.won=true;s.events.push({kind:'win'});}}}
export function attack(s){if(s.attackTimer>0)return false;s.attackTimer=.35;s.shake=.035;const damage=18+s.gear.drill*9;burst(s,s.p.x+s.p.face,s.p.y,'#ffdda1',6);
 for(const e of s.enemies)if(e.hp>0&&Math.abs(e.x-s.p.x)<2.3&&Math.abs(e.y-s.p.y)<1.8&&(e.x-s.p.x)*s.p.face>=-.5){e.hp-=damage;e.hit=.25;if(e.hp<=0){s.stats.kills++;s.coins+=15+Math.floor(e.y*.8);burst(s,e.x,e.y,MONSTERS[e.kind].color,15);}}
 for(const b of s.bosses)if(Math.abs(b.x-s.p.x)<3.4&&Math.abs(b.y-s.p.y)<3.8)bossHit(s,b,damage);return true;
}
export function questProgress(s,q){return q.kind==='relays'?s.relays.filter(a=>a.active).length:q.kind==='depth'?s.stats.bestDepth:s.stats[q.kind]||0;}
function progress(s){for(const q of QUESTS)if(!s.quests.includes(q.id)&&questProgress(s,q)>=q.need){s.quests.push(q.id);s.coins+=q.reward;emit(s,`委托完成：${q.title} · + ${q.reward} 金币`,'success');if(q.id==='copper'||q.id==='relay')s.events.push({kind:'story',id:q.id});}}
function projectile(s,x,y,vx,vy,kind='wave'){s.shots.push({x,y,vx,vy,kind,ttl:6});}
function bossStep(s,b,dt){
 b.hit=Math.max(0,b.hit-dt);if(b.dead)return;
 const near=Math.abs(s.p.x-b.x)<9&&Math.abs(s.p.y-b.y)<6;
 if(!near){b.awake=false;return;}
 if(b.id==='storm'&&!s.bosses.slice(0,2).every(x=>x.dead)){if(!b.gateWarn){b.gateWarn=true;emit(s,'织机的护罩仍在运转：先带回潮汐与生长两枚风印。','warn');}return;}
 if(!b.awake){b.awake=true;emit(s,`${b.name} · ${b.subtitle}`,'boss');}
 b.timer-=dt;
 if(b.windup>0){b.windup-=dt;if(b.windup<=0){
  b.phase++;
  if(b.id==='bell'){projectile(s,b.x,b.y+3.5,-4,0);projectile(s,b.x,b.y+3.5,4,0);}
  if(b.id==='garden')for(let i=-2;i<=2;i++)projectile(s,b.x,b.y,i*1.5,-3,'spore');
  if(b.id==='storm'){if(Math.abs(s.p.x-b.targetX)<1.3)hurt(s,30,'风暴闪电');burst(s,b.targetX,s.p.y,'#ffeeaf',24);for(let i=-1;i<=1;i+=2)projectile(s,b.x,b.y+3.5,i*4.5,0,'spark');}
  b.timer=b.hp<b.maxHp*.5?2.8:4;
 }}else if(b.timer<=0){b.windup=1.1;b.targetX=s.p.x;}
}
export function step(s,input,dt){
 dt=clamp(dt,0,.06);s.stats.time+=dt;s.stats.bestDepth=Math.max(s.stats.bestDepth,depth(s));s.attackTimer=Math.max(0,s.attackTimer-dt);s.moveTimer-=dt;s.fallTimer-=dt;s.p.inv=Math.max(0,s.p.inv-dt);s.sonar=Math.max(0,s.sonar-dt);s.shake=Math.max(0,s.shake-dt);
 const standing=tile(s,s.p.x,s.p.y+1)!==0&&tile(s,s.p.x,s.p.y+1)!==7;
 s.p.heat=Math.max(0,s.p.heat-dt*(input.down||input.left||input.right?5:30));
 if(s.overheated&&s.p.heat<55)s.overheated=false;
 if(safe(s)){s.p.air=Math.min(maxAir(s),s.p.air+dt*50);s.p.hp=Math.min(maxHP(s),s.p.hp+dt*20);s.p.fuel=Math.min(maxFuel(s),s.p.fuel+dt*25);}
 else{s.p.air-=dt*(.5+Math.min(.4,s.p.y*.003));if(s.p.air<=0){s.p.air=0;hurt(s,5,'氧气耗尽');}}
 if(standing)s.p.fuel=Math.min(maxFuel(s),s.p.fuel+dt*14);
 let didDig=false,fly=false;
 if(input.up&&s.p.fuel>3&&s.moveTimer<=0&&s.p.y>0&&tile(s,s.p.x,s.p.y-1)===0){s.p.y--;s.p.fuel-=4.5;s.moveTimer=.11;s.fallDistance=0;fly=true;s.dig=null;}
 if(input.up&&s.p.fuel>3){fly=true;if(!standing)s.p.fuel=Math.max(0,s.p.fuel-dt*10);}
 const dx=input.left?-1:input.right?1:0;if(dx)s.p.face=dx;
 if(dx&&s.moveTimer<=0){const t=tile(s,s.p.x+dx,s.p.y);if(t===0||t===7){s.p.x=clamp(s.p.x+dx,1,W-2);s.moveTimer=.12;s.dig=null;}else if(standing){dig(s,s.p.x+dx,s.p.y,dt);didDig=true;}}
 if(input.down&&standing){dig(s,s.p.x,s.p.y+1,dt);didDig=true;}
 if(!didDig&&s.dig){s.dig.idle=(s.dig.idle||0)+dt;if(s.dig.idle>1)s.dig=null;}
 if(!fly&&s.fallTimer<=0&&(tile(s,s.p.x,s.p.y+1)===0||tile(s,s.p.x,s.p.y+1)===7)){s.p.y++;s.fallTimer=.115;s.fallDistance++;}
 else if(standing&&s.fallDistance>0){if(s.fallDistance>7)hurt(s,(s.fallDistance-7)*5,'坠落过高');s.fallDistance=0;}
 if(input.attack)attack(s);
 if(tile(s,s.p.x,s.p.y)===6||tile(s,s.p.x,s.p.y+1)===6)hurt(s,18,'灼热熔流');
 if(tile(s,s.p.x,s.p.y)===7)s.p.air=Math.max(0,s.p.air-dt*5);
 s.p.px+=(s.p.x-s.p.px)*Math.min(1,dt*15);s.p.py+=(s.p.y-s.p.py)*Math.min(1,dt*15);
 reveal(s,s.p.x,s.p.y,s.sonar>0?12:6);
 for(const e of s.enemies){if(e.hp<=0)continue;const m=MONSTERS[e.kind];e.hit=Math.max(0,e.hit-dt);e.cool-=dt;const dist=Math.hypot(e.x-s.p.x,e.y-s.p.y);
  if(e.cool<=0&&dist<14){e.cool=m.speed;if(dist<1.35)hurt(s,m.damage,m.name+'袭击');else{
   const d=dist<8?Math.sign(s.p.x-e.x)||e.face:e.face;
   if(m.kind==='walk'&&tile(s,e.x,e.y+1)===0)e.y++;
   else if(tile(s,e.x+d,e.y)===0)e.x+=d;else e.face=-e.face;
   if(m.kind==='fly'&&dist<8){const dy=Math.sign(s.p.y-e.y);if(tile(s,e.x,e.y+dy)===0)e.y+=dy;}
  }}e.px+=(e.x-e.px)*Math.min(1,dt*9);e.py+=(e.y-e.py)*Math.min(1,dt*9);
 }
 for(const b of s.bosses)bossStep(s,b,dt);
 for(const b of s.bombs){b.ttl-=dt;if(b.ttl<=0){for(let y=b.y-2;y<=b.y+2;y++)for(let x=b.x-2;x<=b.x+2;x++)if(Math.hypot(x-b.x,y-b.y)<2.8)harvest(s,x,y,true);for(const e of s.enemies)if(e.hp>0&&Math.hypot(e.x-b.x,e.y-b.y)<3.5){e.hp-=85;if(e.hp<=0)s.stats.kills++;}for(const boss of s.bosses)if(Math.hypot(boss.x-b.x,boss.y-b.y)<4.5)bossHit(s,boss,85);if(Math.hypot(s.p.x-b.x,s.p.y-b.y)<2.5)hurt(s,25,'岩爆球冲击');burst(s,b.x,b.y,'#ffd087',32);s.shake=.4;}}
 s.bombs=s.bombs.filter(b=>b.ttl>0);
 for(const p of s.shots){p.ttl-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.kind==='spore')p.vy+=dt*2;if(Math.hypot(p.x-s.p.x-.5,p.y-s.p.y-.5)<.7){hurt(s,p.kind==='wave'?18:23,'守卫的攻击');p.ttl=0;}if(p.kind!=='wave'&&tile(s,Math.floor(p.x),Math.floor(p.y))!==0)p.ttl=0;}
 s.shots=s.shots.filter(p=>p.ttl>0);
 for(const d of s.drops){d.life-=dt;if(Math.hypot(d.x-s.p.x,d.y-s.p.y)<1.5&&weight(s)+ORES[d.tile].weight<=capacity(s)){s.bag[d.tile]++;d.life=0;}}
 s.drops=s.drops.filter(d=>d.life>0);
 for(const p of s.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*5;}s.particles=s.particles.filter(p=>p.life>0).slice(-250);
 progress(s);
}
export function snapshot(s){const d=structuredClone(s);for(const k of ['events','particles','shots'])d[k]=[];d.dig=null;return d;}
export function restore(data){
 if(!data||data.version!==VERSION||!Array.isArray(data.world)||data.world.length!==W*H||!Array.isArray(data.seen)||data.seen.length!==W*H)throw new Error('存档格式或版本不匹配');
 const validTiles=new Set([0,1,2,3,4,5,6,7,18,...Object.keys(ORES).map(Number)]);
 if(data.world.some(v=>!Number.isInteger(v)||!validTiles.has(v))||data.seen.some(v=>v!==0&&v!==1))throw new Error('地图数据损坏');
 if(!data.p||!Number.isInteger(data.p.x)||!Number.isInteger(data.p.y)||data.p.x<1||data.p.x>W-2||data.p.y<0||data.p.y>=H-1||!Number.isFinite(data.coins)||data.coins<0||data.coins>1e8)throw new Error('角色数据损坏');
 for(const key of Object.keys(EQUIPMENT))if(!Number.isInteger(data.gear?.[key])||data.gear[key]<0||data.gear[key]>4)throw new Error('装备数据损坏');
 for(const key of Object.keys(ORES))if(!Number.isInteger(data.bag?.[key])||data.bag[key]<0||data.bag[key]>10000)throw new Error('矿袋数据损坏');
 for(const key of Object.keys(SUPPLIES))if(!Number.isInteger(data.supplies?.[key])||data.supplies[key]<0||data.supplies[key]>10000)throw new Error('道具数据损坏');
 if(!Array.isArray(data.enemies)||data.enemies.length>150||data.enemies.some(e=>!Object.hasOwn(MONSTERS,e.kind)||![e.x,e.y,e.hp,e.px,e.py,e.cool].every(Number.isFinite)))throw new Error('生物数据损坏');
 if(!Array.isArray(data.bosses)||data.bosses.length!==3||data.bosses.some((b,i)=>b.id!==BOSSES[i].id||![b.hp,b.x,b.y,b.timer,b.windup].every(Number.isFinite)))throw new Error('守卫数据损坏');
 if(!Array.isArray(data.relays)||data.relays.length!==RELAYS.length||data.relays.some((a,i)=>a.id!==RELAYS[i].id||typeof a.active!=='boolean'))throw new Error('驿站数据损坏');
 if(!Array.isArray(data.chests)||data.chests.length>100||!Array.isArray(data.quests)||data.quests.some(q=>!QUESTS.some(v=>v.id===q))||!data.stats||Object.values(data.stats).some(v=>!Number.isFinite(v)||v<0))throw new Error('探索数据损坏');
 const statKeys=['mined','soldCopper','earned','kills','bestDepth','samples','logs','time','rescues'];
 if(statKeys.some(k=>!Number.isFinite(data.stats[k])||data.stats[k]<0||data.stats[k]>1e9)||data.stats.logs>LETTERS.length||new Set(data.quests).size!==data.quests.length)throw new Error('探索记录损坏');
 if(data.chests.some(c=>!Number.isInteger(c.x)||!Number.isInteger(c.y)||c.x<1||c.x>W-2||c.y<SURFACE||c.y>=H-1||typeof c.opened!=='boolean'||typeof c.letter!=='boolean')||data.enemies.some(e=>!Number.isInteger(e.x)||!Number.isInteger(e.y)||e.x<1||e.x>W-2||e.y<0||e.y>=H-1)||data.bosses.some((b,i)=>typeof b.dead!=='boolean'||b.hp<0||b.hp>BOSSES[i].hp||b.dead&&b.hp!==0)||typeof data.won!=='boolean'||![1,-1].includes(data.p.face))throw new Error('场景数据损坏');
 const s=snapshot(data);s.enemies=s.enemies.map(e=>({...e,px:e.x,py:e.y,face:e.face===-1?-1:1,hit:0,phase:Number.isFinite(e.phase)?e.phase:0}));s.relays=s.relays.map((a,i)=>({...RELAYS[i],active:a.active}));s.bosses=s.bosses.map((b,i)=>({...BOSSES[i],hp:clamp(b.hp,0,BOSSES[i].hp),maxHp:BOSSES[i].hp,dead:b.dead,awake:false,timer:3.8,windup:0,hit:0,phase:0,gateWarn:false}));s.events=[];s.p.inv=2;s.p.px=s.p.x;s.p.py=s.p.y;s.moveTimer=0;s.fallTimer=0;s.fallDistance=0;s.attackTimer=0;s.sonar=0;s.shake=0;s.bombs=[];s.drops=[];s.p.heat=0;s.overheated=false;
 for(const field of ['hp','air','fuel'])if(!Number.isFinite(s.p[field]))throw new Error('生命数据损坏');s.p.hp=clamp(s.p.hp,1,maxHP(s));s.p.air=clamp(s.p.air,0,maxAir(s));s.p.fuel=clamp(s.p.fuel,0,maxFuel(s));return s;
}
