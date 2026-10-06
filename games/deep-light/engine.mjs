// The simulation is independent of the browser. All distances are in tiles.
export const W = 48, H = 120, SURFACE = 5;
export const ORES = {
  3: { name: '铜矿', color: '#e49a65', value: 12, weight: 1 },
  4: { name: '铁矿', color: '#b4c9d8', value: 28, weight: 2 },
  5: { name: '金矿', color: '#ffc75a', value: 65, weight: 2 },
  6: { name: '紫水晶', color: '#bfa0ff', value: 120, weight: 3 },
  7: { name: '钻石', color: '#72efe2', value: 240, weight: 4 },
};
export const CORES = [
  { tile: 11, x: 10, y: 34, name: '森之晶核', color: '#9bed9a' },
  { tile: 12, x: 37, y: 65, name: '潮之晶核', color: '#79d9ff' },
  { tile: 13, x: 17, y: 94, name: '焰之晶核', color: '#ff947c' },
];
export const EQUIPMENT = {
  drill: { name: '钻头', desc: '加快挖掘。Ⅱ级可钻玄武岩，Ⅲ级可钻黑曜石。', costs: [160, 520, 1400], names: ['铁齿钻', '合金钻', '钛金钻', '星核钻'] },
  tank: { name: '氧气瓶', desc: '每级增加 60 点氧气，走得更深、回来更从容。', costs: [130, 380, 950], names: ['小气瓶', '双气瓶', '高压瓶', '循环气瓶'] },
  bag: { name: '矿袋', desc: '每级增加 14 格载重，多带矿石回营地。', costs: [100, 300, 780], names: ['帆布袋', '加固袋', '矿工箱', '压缩仓'] },
  armor: { name: '护甲', desc: '每级增加 25 点生命，并降低怪物伤害。', costs: [150, 420, 1100], names: ['工作服', '皮革甲', '钢片甲', '守护甲'] },
};
export const SUPPLIES = {
  bombs: { name: '岩爆炸弹', price: 45, desc: '炸开周围岩层，对怪物造成 65 点伤害。', key: '1' },
  tanks: { name: '便携氧气', price: 35, desc: '在地底立即恢复 75 点氧气。', key: '2' },
  recalls: { name: '回城信标', price: 65, desc: '带着所有矿石安全回到营地。', key: '3' },
};
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const index = (x, y) => y * W + x;
export const at = (s, x, y) => (x < 0 || x >= W || y < 0 || y >= H) ? 9 : s.world[index(x, y)];
export const maxAir = s => 120 + s.upgrades.tank * 60;
export const maxHP = s => 100 + s.upgrades.armor * 25;
export const capacity = s => 18 + s.upgrades.bag * 14;
export const cargoWeight = s => Object.entries(s.bag).reduce((n, [id, count]) => n + ORES[id].weight * count, 0);
export const cargoValue = s => Object.entries(s.bag).reduce((n, [id, count]) => n + ORES[id].value * count, 0);
export const depth = s => Math.max(0, (s.p.y - SURFACE) * 4);
export const zone = y => y < 36 ? '01 · 苔土矿层' : y < 69 ? '02 · 蓝晶岩层' : y < 103 ? '03 · 熔火矿层' : '04 · 地心遗迹';
function rng(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function announce(s, text, kind = 'info') { s.events.push({ text, kind }); }
export function createGame(seed = Date.now() >>> 0) {
  const r = rng(seed), world = Array(W * H).fill(0), enemies = [];
  for (let y = SURFACE + 1; y < H; y++) for (let x = 0; x < W; x++) {
    const n = r(); let t = 1;
    if (y > 38) t = 2;
    if (x === 0 || x === W - 1 || y === H - 1) t = 9;
    else if (n < .065) t = y > 80 ? 9 : y > 43 ? 8 : 2;
    else if (n < .1) t = y > 79 ? 7 : y > 49 ? 6 : y > 24 ? 5 : 4;
    else if (n < .185) t = y > 56 ? 5 : y > 20 ? 4 : 3;
    else if (n < .26) t = 3;
    world[index(x, y)] = t;
  }
  // Guaranteed nearby copper makes the first trip useful for every seed.
  for (const [x,y] of [[24,6],[24,7],[25,7],[23,8],[24,9],[25,10]]) world[index(x,y)] = 3;
  function cavern(cx, cy, rx, ry) {
    for (let y = cy-ry; y <= cy+ry; y++) for (let x = cx-rx; x <= cx+rx; x++) {
      if (x > 0 && x < W-1 && y > SURFACE && y < H-1 && ((x-cx)/rx)**2 + ((y-cy)/ry)**2 < 1) world[index(x,y)] = 0;
    }
  }
  for (let y = 18; y < 101; y += 11) {
    const x = 7 + Math.floor(r() * 32); cavern(x, y, 5, 2);
    enemies.push({ x, y, hp: 26 + Math.floor(y / 3), maxHp: 26 + Math.floor(y / 3), timer: 0, hit: 0, kind: y > 69 ? 'ember' : 'slime' });
  }
  CORES.forEach(c => { cavern(c.x, c.y, 4, 2); world[index(c.x,c.y)] = c.tile; world[index(c.x,c.y+1)] = yRock(c.y); });
  // A horizontal landing and descent shaft lead into the final arena.
  for (let y = 106; y <= 116; y++) for (let x = 15; x <= 33; x++) world[index(x,y)] = 0;
  for (let y = 101; y <= 116; y++) world[index(24,y)] = 0;
  world[index(24,116)] = 14;
  for (let y = 74; y < 104; y += 10) {
    const cx = 4 + Math.floor(r()*38);
    for (let x = cx; x < cx+3; x++) if(!CORES.some(c=>Math.abs(c.x-x)<=4 && Math.abs(c.y-y)<=3)) world[index(x,y)] = 10;
  }
  const s = {
    version: 1, seed, world, enemies, p: { x: 24, y: SURFACE, px: 24, py: SURFACE, face: 1, hp: 100, air: 120, invincible: 0 },
    upgrades: { drill: 0, tank: 0, bag: 0, armor: 0 }, bag: { 3:0,4:0,5:0,6:0,7:0 }, coins: 60,
    supplies: { bombs: 3, tanks: 2, recalls: 2 }, cores: [false,false,false],
    boss: { x:24, y:115, hp:220, maxHp:220, phase:0, timer:3.5, flash:0, awake:false, dead:false },
    stats: { mined:0, earned:0, bestDepth:0, trips:0, rescues:0, time:0, kills:0 },
    dig:null, moveTimer:0, fallTimer:0, fallDistance:0, attackTimer:0, surface:true, bombs:[], particles:[], effects:[], events:[], won:false, noise:0,
  };
  return s;
}
function yRock(y) { return y > 69 ? 8 : 2; }
function canDrill(s, t) { return t !== 9 ? t !== 8 || s.upgrades.drill >= 1 : s.upgrades.drill >= 2; }
function hardness(t) { return [0,.28,.6,.42,.65,.75,.95,1.1,1.7,2.5,0,.7,.7,.7,0][t] ?? 1; }
function burst(s, x, y, color, n=10) { for (let i=0;i<n;i++) s.particles.push({x:x+.5,y:y+.5,vx:(Math.random()-.5)*4,vy:-Math.random()*3,life:.35+Math.random()*.4,color}); }
function harvest(s, x, y, forced=false) {
  const t = at(s,x,y);
  if (t <= 0 || t === 10 || t === 14 || x <= 0 || x >= W-1 || y >= H-1) return false;
  if (ORES[t]) {
    if (cargoWeight(s) + ORES[t].weight > capacity(s)) { if(!forced) announce(s,'矿袋满了！回营地卖矿，或换个方向挖。','warn'); return false; }
    s.bag[t]++; announce(s,`+ ${ORES[t].name} · ¥${ORES[t].value}`, 'ore');
  }
  const core = CORES.findIndex(c=>c.tile===t);
  if (core >= 0) { s.cores[core]=true; announce(s,`获得${CORES[core].name}！晶核不会占用矿袋。`, 'core'); }
  s.world[index(x,y)] = 0; s.stats.mined++; burst(s,x,y,ORES[t]?.color || (core>=0 ? CORES[core].color : '#ac866b'));
  return true;
}
function hurt(s, amount, reason) {
  if (s.p.invincible > 0) return;
  s.p.hp -= amount * (1 - s.upgrades.armor*.12); s.p.invincible=.7; s.noise=.18;
  burst(s,s.p.x,s.p.y,'#ff8276',12);
  if (s.p.hp <= 0) rescue(s,reason);
}
function surfaceRefill(s) {
  s.p.air = maxAir(s); s.p.hp = maxHP(s); s.fallDistance=0;
  if (!s.surface) { s.stats.trips++; announce(s,'回到营地 · 氧气和生命已补满，按 E 打开矿工商店。','success'); }
  s.surface = true;
}
function rescue(s, reason) {
  const lost = cargoValue(s);
  for (const id in s.bag) s.bag[id]=0;
  s.coins = Math.floor(s.coins*.9); s.stats.rescues++;
  s.p.x=s.p.px=24; s.p.y=s.p.py=SURFACE; s.p.invincible=2; s.dig=null; s.fallTimer=0; s.fallDistance=0;
  s.supplies.recalls=Math.max(s.supplies.recalls,1); s.supplies.tanks=Math.max(s.supplies.tanks,1);
  surfaceRefill(s); announce(s,`${reason}，救援队带你回到营地。损失矿石 ¥${lost} 和 10% 金币；装备、晶核保留。`,'rescue');
}
function move(s,x,y) {
  const oldY=s.p.y; s.p.x=x; s.p.y=y; s.dig=null; s.moveTimer=.13;
  if (y<oldY) { s.p.air = Math.max(0,s.p.air-.14); s.fallDistance=0; }
  if (y<=SURFACE) surfaceRefill(s); else s.surface=false;
  if (at(s,x,y)===10) hurt(s,17,'触碰熔岩');
  if (at(s,x,y)===14 && !s.won) {
    if (s.boss.dead) { s.won=true; announce(s,'找到阿岚！地心信标重新亮起，你们一起回到了光里。','win'); }
    else announce(s,'信标被地心守卫封锁了。先收集三枚晶核，再击败守卫。','warn');
  }
}
function attempt(s, dx,dy,dt) {
  const x=s.p.x+dx,y=s.p.y+dy;
  if (x<1 || x>=W-1 || y<1 || y>=H-1) return;
  if(dx) s.p.face=dx;
  const t=at(s,x,y);
  if(t===0 || t===10 || t===14) { if(s.moveTimer<=0) move(s,x,y); return; }
  if (!canDrill(s,t)) {
    if(s.moveTimer<=0) { announce(s, t===9 ? '黑曜石很硬：升级到Ⅲ级钻头，或使用炸弹。':'玄武岩很硬：升级到Ⅱ级钻头，或使用炸弹。','warn'); s.moveTimer=1.5; }
    s.dig=null; return;
  }
  if(!s.dig || s.dig.x!==x || s.dig.y!==y) s.dig={x,y,progress:0};
  s.dig.progress += dt*(1+s.upgrades.drill*.7)/hardness(t);
  if(s.dig.progress>=1) { if(harvest(s,x,y)) move(s,x,y); else {s.moveTimer=.6;s.dig=null;} }
}
export function useSupply(s,key) {
  if(!SUPPLIES[key]) return false;
  if(s.supplies[key]<=0) { announce(s,'道具用完了，可以回营地购买。','warn'); return false; }
  if(s.surface) { announce(s,'营地很安全，把道具留给地底吧。'); return false; }
  if(key==='bombs') {
    if(s.bombs.length>=3) return false;
    s.supplies.bombs--; s.bombs.push({x:clamp(s.p.x+s.p.face,1,W-2),y:s.p.y,timer:1.1}); announce(s,'炸弹已点燃 · 你不会受到自己的炸弹伤害。');
  } else if(key==='tanks') {
    if(s.p.air>=maxAir(s)-1) return false;
    s.supplies.tanks--; s.p.air=Math.min(maxAir(s),s.p.air+75); announce(s,'便携氧气 · 恢复 75 点氧气','success');
  } else {
    s.supplies.recalls--; s.p.x=s.p.px=24; s.p.y=s.p.py=SURFACE; s.dig=null; s.fallTimer=0;s.fallDistance=0;surfaceRefill(s);announce(s,'信标启动 · 矿石已安全带回营地。','success');
  }
  return true;
}
export function sell(s) {
  if(!s.surface) return 0;
  const value=cargoValue(s); if(!value) {announce(s,'矿袋空空的，下矿寻找闪光的矿脉吧。');return 0;}
  s.coins+=value;s.stats.earned+=value;for(const id in s.bag)s.bag[id]=0;
  announce(s,`出售全部矿石 · +¥${value}`, 'success');return value;
}
export function buy(s,type,key) {
  if(!s.surface) return false;
  let price;
  if(type==='equipment') { if(!EQUIPMENT[key] || s.upgrades[key]>=3)return false;price=EQUIPMENT[key].costs[s.upgrades[key]]; }
  else if(type==='supply' && SUPPLIES[key]) price=SUPPLIES[key].price; else return false;
  if(s.coins<price) {announce(s,'金币还不够，先出售矿石。','warn');return false;}
  s.coins-=price;
  if(type==='equipment') {s.upgrades[key]++;surfaceRefill(s);announce(s,`${EQUIPMENT[key].name}升级成功！`,'success');}
  else {s.supplies[key]++;announce(s,`购入${SUPPLIES[key].name}`,'success');}
  return true;
}
export function attack(s) {
  if(s.attackTimer>0 || s.surface || s.won)return;
  s.attackTimer=.32;s.effects.push({kind:'slash',x:s.p.x+s.p.face,y:s.p.y,face:s.p.face,life:.18});
  const damage=12+s.upgrades.drill*6;
  for(const e of s.enemies) if(e.hp>0 && Math.abs(e.x-s.p.x)<=2 && Math.abs(e.y-s.p.y)<=1.5 && (e.x-s.p.x)*s.p.face>=-0.5) damageEnemy(s,e,damage);
  const b=s.boss;
  if(!b.dead && Math.abs(b.x-s.p.x)<3 && Math.abs(b.y-s.p.y)<2) damageBoss(s,damage);
}
function damageEnemy(s,e,d) {e.hp-=d;e.hit=.2;burst(s,e.x,e.y,e.kind==='ember'?'#ff9478':'#83dcab');if(e.hp<=0){s.coins+=18+Math.floor(e.y/2);s.stats.kills++;announce(s,'击退地底怪物 · 获得金币','success');}}
function damageBoss(s,d) {
  if(!s.cores.every(Boolean)) { if(s.boss.flash<=0)announce(s,'守卫的护盾仍在！找到三枚晶核才能解除。','warn');s.boss.flash=.4;return; }
  s.boss.hp-=d;s.boss.flash=.25;
  if(s.boss.hp<=0) {s.boss.hp=0;s.boss.dead=true;s.coins+=600;burst(s,s.boss.x,s.boss.y,'#ffd17d',50);announce(s,'地心守卫倒下了！去中央的信标找到阿岚。','core');}
}
function explode(s,b) {
  for(let y=b.y-2;y<=b.y+2;y++)for(let x=b.x-2;x<=b.x+2;x++)if(Math.hypot(x-b.x,y-b.y)<=2.4)harvest(s,x,y,true);
  for(const e of s.enemies)if(e.hp>0 && Math.hypot(e.x-b.x,e.y-b.y)<3.5)damageEnemy(s,e,65);
  if(Math.hypot(s.boss.x-b.x,s.boss.y-b.y)<4)damageBoss(s,65);
  s.effects.push({kind:'explosion',x:b.x,y:b.y,life:.5});burst(s,b.x,b.y,'#ffd183',40);s.noise=.35;announce(s,'轰！岩层已炸开。','boom');
}
export function update(s,dt,input={}) {
  dt=clamp(dt,0,.05);s.stats.time+=dt;s.moveTimer-=dt;s.attackTimer-=dt;s.p.invincible=Math.max(0,s.p.invincible-dt);s.noise=Math.max(0,s.noise-dt);
  let dx=0,dy=0;
  if(input.up)dy=-1;else if(input.down)dy=1;else if(input.left)dx=-1;else if(input.right)dx=1;
  if((dx||dy) && s.moveTimer<=0)attempt(s,dx,dy,dt);else if(!dx&&!dy)s.dig=null;
  if(input.attack)attack(s);
  if(s.p.y>SURFACE) {
    s.p.air=Math.max(0,s.p.air-dt*(.75+depth(s)/800+(input.up?.2:0)));
    if(s.p.air<=0)hurt(s,6,'氧气耗尽');
    s.surface=false;
  } else surfaceRefill(s);
  // Released controls permit gravity; jetting upward or mining supports the miner.
  if(!dy && !s.dig && s.p.y>SURFACE && [0,10,14].includes(at(s,s.p.x,s.p.y+1))) {
    s.fallTimer+=dt;
    if(s.fallTimer>.18 && s.moveTimer<=0) {s.fallTimer=0;s.fallDistance++;move(s,s.p.x,s.p.y+1);}
  } else {
    if(s.fallDistance>6 && ![0,10,14].includes(at(s,s.p.x,s.p.y+1)))hurt(s,(s.fallDistance-6)*3,'高处坠落');
    s.fallTimer=0;s.fallDistance=0;
  }
  s.stats.bestDepth=Math.max(s.stats.bestDepth,depth(s));
  s.p.px+=(s.p.x-s.p.px)*Math.min(1,dt*20);s.p.py+=(s.p.y-s.p.py)*Math.min(1,dt*20);
  for(const e of s.enemies) {
    e.hit=Math.max(0,e.hit-dt);if(e.hp<=0)continue;
    const dist=Math.abs(e.x-s.p.x)+Math.abs(e.y-s.p.y);if(dist>12)continue;
    e.timer-=dt;
    if(e.timer<=0){e.timer=.6;const ex=e.x+(s.p.x>e.x?1:-1);if(at(s,ex,e.y)===0)e.x=ex;
      if(at(s,e.x,e.y+1)===0)e.y++;
      if(Math.abs(e.x-s.p.x)+Math.abs(e.y-s.p.y)<=1)hurt(s,e.kind==='ember'?15:10,'被地底怪物击倒');
    }
  }
  const boss=s.boss;boss.flash=Math.max(0,boss.flash-dt);
  if(!boss.dead && s.p.y>104) {
    if(!boss.awake){boss.awake=true;announce(s,'地心守卫苏醒了。避开红色震波，空格攻击或用炸弹！','warn');}
    boss.timer-=dt;
    if(boss.timer<=0) {
      if(boss.phase===0) {boss.phase=1;boss.timer=1.35;s.effects.push({kind:'warning',x:boss.x,y:boss.y,life:1.35});}
      else {boss.phase=0;boss.timer=3.2;s.effects.push({kind:'shock',x:boss.x,y:boss.y,life:.6});s.noise=.25;
        if(Math.abs(s.p.x-boss.x)<5 && s.p.y>=boss.y-1)hurt(s,28,'被守卫的震波击倒');}
    }
    if(boss.phase===0 && Math.abs(s.p.x-boss.x)>1) boss.x+=Math.sign(s.p.x-boss.x)*dt*.8;
  }
  for(const b of s.bombs)b.timer-=dt;
  const detonated=s.bombs.filter(b=>b.timer<=0);s.bombs=s.bombs.filter(b=>b.timer>0);detonated.forEach(b=>explode(s,b));
  for(const p of s.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=9*dt;}s.particles=s.particles.filter(p=>p.life>0);
  for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);
}
export function encode(s) {
  const {events,particles,effects,dig,bombs,...persistent}=s;
  return JSON.stringify({...persistent,p:{...s.p,px:s.p.x,py:s.p.y},moveTimer:0,fallTimer:0,fallDistance:0,attackTimer:0,noise:0});
}
export function decode(text) {
  try {
    const raw=JSON.parse(text);
    if(raw.version!==1 || !Array.isArray(raw.world) || raw.world.length!==W*H || !raw.world.every(t=>Number.isInteger(t)&&t>=0&&t<=14))return null;
    if(!raw.p || !Number.isInteger(raw.p.x) || !Number.isInteger(raw.p.y) || raw.p.x<1 || raw.p.x>=W-1 || raw.p.y<1 || raw.p.y>=H-1)return null;
    if(!['hp','air'].every(k=>Number.isFinite(raw.p[k])) || !Number.isFinite(raw.coins) || raw.coins<0)return null;
    if(!raw.upgrades || !Object.keys(EQUIPMENT).every(k=>Number.isInteger(raw.upgrades[k])&&raw.upgrades[k]>=0&&raw.upgrades[k]<=3))return null;
    if(!raw.bag || !Object.keys(ORES).every(k=>Number.isInteger(raw.bag[k])&&raw.bag[k]>=0))return null;
    if(!raw.supplies || !Object.keys(SUPPLIES).every(k=>Number.isInteger(raw.supplies[k])&&raw.supplies[k]>=0))return null;
    if(!Array.isArray(raw.cores)||raw.cores.length!==3||!raw.cores.every(v=>typeof v==='boolean')||!Array.isArray(raw.enemies)||raw.enemies.length>100)return null;
    if(!raw.enemies.every(e=>['x','y','hp','maxHp','timer','hit'].every(k=>Number.isFinite(e[k]))))return null;
    if(!raw.boss || !['x','y','hp','maxHp','phase','timer','flash'].every(k=>Number.isFinite(raw.boss[k])) || !raw.stats || !['mined','earned','bestDepth','trips','rescues','time','kills'].every(k=>Number.isFinite(raw.stats[k])))return null;
    return {...createGame(raw.seed),...raw,events:[],particles:[],effects:[],dig:null,bombs:[],moveTimer:0,fallTimer:0,fallDistance:0,attackTimer:0,noise:0};
  }catch{return null;}
}
