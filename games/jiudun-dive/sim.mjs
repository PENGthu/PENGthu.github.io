// Dive simulation. No DOM. All times are game seconds; the app runs the clock at TIME_SCALE.
import {PERMANENT_LINE, OLD_LINE, SIGNS, BOUNDS, CELL, nearestOnLine, lineLength, pointAt} from './cave.mjs';
import {MISSIONS, RELICS} from './missions.mjs';
import * as D from './deco.mjs';

export const TIME_SCALE = 5;              // game seconds per real second
export const SWIM = .15, SPRINT = .28;    // metres per game second: 9 and 17 m/min
export const TORCH = {primary:14, backup:8};
const BASE_R = .3, STAGE_R = .08, REACH = 1.2;
const clamp = D.clamp;

function rand(s) {
  s.rng = (s.rng+0x6D2B79F5)>>>0;
  let t = s.rng;
  t = Math.imul(t^t>>>15, t|1); t ^= t+Math.imul(t^t>>>7, t|61);
  return ((t^t>>>14)>>>0)/4294967296;
}

export function createSim(missionId, cave, seed=1) {
  const m = MISSIONS[missionId] ?? MISSIONS.basin;
  const {n2, he} = D.freshTissues();
  return {
    mission: MISSIONS[missionId] ? missionId : 'basin', seed, rng: seed>>>0, t: 0,
    x: m.start[0], y: m.start[1], vx: 0, vy: 0, facing: 1, aimX: 1, aimY: .25,
    gases: m.gases.map(g=>({...g, bar0:g.bar, carried:true, x:0, y:0})), active: 0,
    gf: [...m.gf], sac: m.sac, n2, he, anchor: 0, ceiling: 0, cns: 0, narc: 0,
    stress: 0, panic: 0, panicDir: 0, calm: false, breath: 0, noGas: 0, hypoxia: 0,
    violation: 0, rapid: 0, ascent: 0, vis: 20, stuck: 0, blocked: false, wriggle: 0,
    light: {on:true, mode:'primary', backups:2, failAt:null},
    lines: [{kind:'perm', pts:PERMANENT_LINE.map(p=>[...p])}, {kind:'old', pts:OLD_LINE.map(p=>[...p])}],
    laying: -1, reel: m.reel, reelLeft: m.reel, lastClear: [m.start[0], m.start[1]], grip: null,
    silt: new Float32Array(cave.cells), seen: new Uint8Array(cave.cells), box: null,
    items: [...m.items.map(i=>({...i, state:'world'})), ...RELICS.map(r=>({...r, relic:true, state:'world'}))],
    objectives: m.objectives.map(o=>({...o, done:false})),
    log: [], says: [], track: [[0, m.start[0], m.start[1]]],
    stats: {maxDepth:0, wallHits:0, offLine:0, selfSilt:0, minVis:20, maxStress:0, turnAt:null, pastTurn:false, entered:false},
    flags: {}, cooldown: {}, outcome: null
  };
}

// --- helpers ------------------------------------------------------------
export const depthOf = s => Math.max(0, s.y);
export const radius = s => BASE_R + STAGE_R*s.gases.filter(g=>g.role==='stage' && g.carried).length;
export const backGas = s => s.gases.find(g=>g.role==='back');
export const turnBar = g => Math.ceil(g.bar0*2/3);
const usable = g => g.carried && g.bar>0;

function event(s, cave, type, text, level='info') {
  s.log.push({t:s.t, type, text, level, x:s.x, y:s.y, depth:depthOf(s), place:cave.placeName(s.x, s.y)});
}
function say(s, text, kind='info') { s.says.push({t:s.t, text, kind}); }
function once(s, key) { if (s.flags[key]) return false; return s.flags[key] = true; }
function every(s, key, gap) { if ((s.cooldown[key] ?? -1e9) > s.t-gap) return false; s.cooldown[key] = s.t; return true; }

// Nearest followable line (permanent, old, or finished/being-laid own line) to a point.
export function nearestLine(s, x, y, skip=-1) {
  let best = null;
  s.lines.forEach((ln, index)=>{
    if (index===skip || ln.pts.length<2) return;
    const n = nearestOnLine(ln.pts, x, y);
    if (!best || n.dist<best.dist) best = {...n, index, kind:ln.kind};
  });
  return best;
}
// Distance along the permanent line, used to tell "further in" from "on the way out".
export const progress = s => { const n = nearestOnLine(PERMANENT_LINE, s.x, s.y); return n.dist<5 ? n.s : 0; };

function addSilt(s, cave, i, amount) {
  if (i<0 || !cave.water[i] || amount<=0) return;
  s.silt[i] = Math.min(4, s.silt[i]+amount);
  const cx = i%cave.cw, cy = (i-cx)/cave.cw, b = s.box;
  if (!b) s.box = {x0:cx-2, x1:cx+2, y0:cy-2, y1:cy+2};
  else { b.x0 = Math.min(b.x0, cx-2); b.x1 = Math.max(b.x1, cx+2); b.y0 = Math.min(b.y0, cy-2); b.y1 = Math.max(b.y1, cy+2); }
}
export function siltBurst(s, cave, x, y, r, amount) {
  for (let dy=-r; dy<=r; dy+=.5) for (let dx=-r; dx<=r; dx+=.5) {
    const d = Math.hypot(dx,dy);
    if (d<=r) addSilt(s, cave, cave.cellAt(x+dx, y+dy), amount*(1-d/r*.7));
  }
}
export function siltAt(s, cave, x, y) {
  let sum = 0, n = 0;
  for (const [dx,dy] of [[0,0],[.5,0],[-.5,0],[0,.5],[0,-.5]]) { const i = cave.cellAt(x+dx, y+dy); if (i>=0 && cave.water[i]) { sum += s.silt[i]; n++; } }
  return n ? sum/n : 0;
}
export const lightRange = s => s.light.on ? TORCH[s.light.mode] : 0;

// Diffusion and slow settling, restricted to the box that has silt in it.
function updateSilt(s, cave, dt) {
  const b = s.box; if (!b) return;
  b.x0 = Math.max(1, b.x0); b.y0 = Math.max(1, b.y0); b.x1 = Math.min(cave.cw-2, b.x1); b.y1 = Math.min(cave.ch-2, b.y1);
  const k = Math.min(.24, .25*dt), settle = Math.exp(-dt*.0029), c = s.silt, w = cave.water, cw = cave.cw;
  let total = 0, nx0 = 1e9, nx1 = -1, ny0 = 1e9, ny1 = -1;
  for (let y=b.y0; y<=b.y1; y++) for (let x=b.x0; x<=b.x1; x++) {
    const i = y*cw+x; if (!w[i]) continue;
    let sum = 0, n = 0;
    if (w[i-1]) { sum += c[i-1]; n++; } if (w[i+1]) { sum += c[i+1]; n++; }
    if (w[i-cw]) { sum += c[i-cw]; n++; } if (w[i+cw]) { sum += c[i+cw]; n++; }
    c[i] = (c[i] + k*(sum-n*c[i]))*settle;
    if (c[i] < .004) c[i] = 0;
    else { total += c[i]; nx0 = Math.min(nx0,x); nx1 = Math.max(nx1,x); ny0 = Math.min(ny0,y); ny1 = Math.max(ny1,y); }
  }
  s.box = total ? {x0:nx0-1, x1:nx1+1, y0:ny0-1, y1:ny1+1} : null;
}

// --- actions --------------------------------------------------------------
function startLine(s, cave, x, y, text) {
  s.lines.push({kind:'own', pts:[[x,y]], done:false});
  s.laying = s.lines.length-1; s.lastClear = [s.x, s.y]; s.flags.tiedOnce = true;
  event(s, cave, 'tie', text);
  if (MISSIONS[s.mission].objectives.some(o=>o.id==='tie') && s.mission==='basin') complete(s, cave, 'tie');
}
function endLine(s, cave, x, y, text, connected) {
  const ln = s.lines[s.laying];
  ln.pts.push([x,y]); ln.done = true;
  s.reel = Math.max(0, s.reel-lineLength(ln.pts)); s.reelLeft = s.reel; s.laying = -1;
  event(s, cave, 'tieOff', text);
  if (connected && ln.fromRock) { s.flags.connected = true; complete(s, cave, 'tie'); }
}

function actLine(s, cave) {
  const nearWall = cave.body(s.x, s.y) > -(radius(s)+.9);
  const other = nearestLine(s, s.x, s.y, s.laying);
  if (s.laying<0) {
    if (s.reel < 1) return say(s, '线轮空了。', 'warn');
    const atEnd = other && other.dist<REACH && other.s > lineLength(s.lines[other.index].pts)-2;
    if (atEnd) {
      startLine(s, cave, other.x, other.y, '在线头接上自己的线轮，开始放线');
      s.lines[s.laying].fromLine = other.kind;
    } else if (other && other.dist<REACH) say(s, '这里已经有线了。按住空格抓线，沿线走。');
    else if (nearWall) {
      startLine(s, cave, s.x, s.y, '把线系在岩石上，开始放线');
      s.lines[s.laying].fromRock = !cave.overhead(s.x, s.y);
    } else say(s, '离岩壁太远。靠近岩壁再系线。');
    return;
  }
  const own = s.lines[s.laying];
  if (other && other.dist<REACH && other.kind!=='own') {
    endLine(s, cave, other.x, other.y, other.kind==='perm' ? '接上永久线' : '接上了一条旧线', other.kind==='perm');
    if (other.kind==='perm') say(s, '接上永久线了。白色的，比你的线粗一圈。按住空格可以沿线走。', 'good');
    else say(s, '这条线的线头是断的，不通往出口。', 'warn');
  } else if (other && other.dist<REACH) endLine(s, cave, other.x, other.y, '接上自己的线', false);
  else if (nearWall) endLine(s, cave, s.x, s.y, `系好线尾（共放 ${Math.round(lineLength([...own.pts,[s.x,s.y]]))} 米）`, false);
  else say(s, '要靠近岩壁或另一条线才能系。');
}

function interact(s, cave) {
  if (s.y < 1 && s.stats.maxDepth > 3) return finish(s, cave, 'surface');
  const item = s.items.find(i=>i.state==='world' && Math.hypot(i.x-s.x, i.y-s.y) < REACH+.3);
  if (item) {
    item.state = 'carried';
    event(s, cave, 'pickup', `拿到${item.name}`, 'good');
    say(s, item.desc);
    if (item.goal) complete(s, cave, `get:${item.id}`);
    return;
  }
  const tank = s.gases.find(g=>!g.carried && Math.hypot(g.x-s.x, g.y-s.y) < REACH+.4);
  if (tank) {
    if (cave.body(s.x, s.y) > -(radius(s)+STAGE_R+.02)) return say(s, '这里太窄，挂上侧挂瓶就过不去了。先到宽一点的地方。', 'warn');
    tank.carried = true; event(s, cave, 'stageOn', `挂回 ${tank.name}`); return;
  }
  const sign = SIGNS.find(g=>Math.hypot(g.x-s.x, g.y-s.y) < 2.5);
  if (sign) say(s, `牌子上写着：${sign.text}`);
}

function dropStage(s, cave) {
  const options = s.gases.map((g,i)=>({g,i})).filter(({g,i})=>g.role==='stage' && g.carried && i!==s.active);
  if (!options.length) return say(s, s.gases.some((g,i)=>g.role==='stage' && g.carried && i===s.active) ? '正在吸的那瓶不能放下。先按 X 换气。' : '身上没有可以放下的侧挂瓶。');
  const {g} = options.sort((a,b)=>b.g.o2-a.g.o2)[0];
  const ln = nearestLine(s, s.x, s.y);
  const at = ln && ln.dist<REACH ? [ln.x, ln.y] : [s.x, s.y];
  g.carried = false; [g.x, g.y] = at;
  event(s, cave, 'stageOff', `把 ${g.name} 放在${ln && ln.dist<REACH ? '线上' : '这里'}`);
}

function switchGas(s, cave, index) {
  const g = s.gases[index];
  if (!g || index===s.active) return;
  if (!g.carried) return say(s, `${g.name} 不在身上。`);
  s.active = index;
  const p = D.ppO2(g, depthOf(s));
  event(s, cave, 'switch', `换到 ${g.name}（氧分压 ${p.toFixed(2)}）`, p>D.SAFE_PPO2+.05 || p<D.MIN_PPO2 ? 'danger' : 'info');
}

// Which gas a diver should be on now, or -1 to stay.
export function suggestGas(s) {
  const d = depthOf(s), cur = s.gases[s.active], fits = g => usable(g) && D.ppO2(g,d)>=.18 && D.ppO2(g,d)<=SAFE+.02;
  const best = D.bestGas(s.gases, d, s.active, usable);
  if (!fits(cur)) return best!==s.active && fits(s.gases[best]) ? best : -1;
  if ((s.ceiling>0 || s.vy<-.03) && best!==s.active && s.gases[best].o2>cur.o2) return best;
  const back = s.gases.findIndex(g=>g.role==='back');
  if (back!==s.active && fits(s.gases[back]) && D.ppO2(s.gases[back],d)<=1.4 && s.vy>.02 && s.ceiling<=0) return back;
  return -1;
}
const SAFE = D.SAFE_PPO2;

function act(s, cave, key) {
  const best = suggestGas(s);
  if (key==='R') actLine(s, cave);
  else if (key==='E') interact(s, cave);
  else if (key==='G') dropStage(s, cave);
  else if (key==='F') {
    s.wriggle = 2.5; s.stress = Math.min(1, s.stress+.04);
    siltBurst(s, cave, s.x, s.y+.3, 1, .25);
  } else if (key==='X') {
    const carried = s.gases.map((g,i)=>i).filter(i=>s.gases[i].carried);
    switchGas(s, cave, best>=0 ? best : carried[(carried.indexOf(s.active)+1)%carried.length]);
  } else if (key==='L') {
    if (s.light.on) return;
    if (s.light.backups>0) { s.light.backups--; s.light.on = true; s.light.mode = 'backup'; event(s, cave, 'light', '换上备用灯'); }
    else say(s, '没有备用灯了。', 'warn');
  } else if (/^[1-9]$/.test(key)) switchGas(s, cave, Number(key)-1);
}

function complete(s, cave, id) {
  const o = s.objectives.find(o=>o.id===id);
  if (o && !o.done) { o.done = true; event(s, cave, 'objective', `完成：${o.text}`, 'good'); }
}

// --- available prompts ------------------------------------------------------
export function prompts(s, cave) {
  if (s.outcome) return [];
  const out = [], d = depthOf(s);
  const droppable = s.gases.some((g,i)=>g.role==='stage' && g.carried && i!==s.active);
  if (s.stuck > .6) {
    if (droppable) out.push({key:'G', label:'放下一个侧挂瓶'});
    out.push({key:'F', label:'连按：扭动往前挤'});
  }
  if (!s.light.on && s.light.backups>0) out.push({key:'L', label:'换备用灯'});
  if (s.y<1 && s.stats.maxDepth>3) out.push({key:'E', label:s.ceiling>0 ? '出水（还有减压义务！）' : '出水'});
  const item = s.items.find(i=>i.state==='world' && Math.hypot(i.x-s.x, i.y-s.y) < REACH+.3);
  if (item) out.push({key:'E', label:`捡起${item.name}`});
  const tank = s.gases.find(g=>!g.carried && Math.hypot(g.x-s.x, g.y-s.y) < REACH+.4);
  if (tank) out.push({key:'E', label:`挂回 ${tank.name}`});
  if (SIGNS.some(g=>Math.hypot(g.x-s.x, g.y-s.y) < 2.5)) out.push({key:'E', label:'看牌子'});
  const other = nearestLine(s, s.x, s.y, s.laying), nearWall = cave.body(s.x, s.y) > -(radius(s)+.9);
  if (s.laying>=0) {
    if (other && other.dist<REACH) out.push({key:'R', label:other.kind==='perm' ? '接上永久线' : '接到这条线上'});
    else if (nearWall) out.push({key:'R', label:`系好线尾（已放 ${Math.round(s.reel-s.reelLeft)} 米）`});
  } else if (s.reel>=1 && d>.5) {
    if (other && other.dist<REACH && other.kind==='perm' && other.s>lineLength(PERMANENT_LINE)-1.5) out.push({key:'R', label:'在线头接上自己的线轮'});
    else if (!(other && other.dist<REACH) && nearWall && !s.flags.tiedOnce) out.push({key:'R', label:'系主线，开始放线'});
  }
  const best = suggestGas(s);
  if (best>=0) out.push({key:'X', label:`换到 ${s.gases[best].name}`});
  if (s.grip==null && other && other.dist<REACH && s.laying<0) out.push({key:'Space', label:'按住：抓线'});
  return out;
}

// --- simulation step ------------------------------------------------------
export function step(s, cave, input={}, dt=.1) {
  if (s.outcome) return;
  const n = Math.max(1, Math.ceil(dt/.25));
  for (let k=0; k<n && !s.outcome; k++) tick(s, cave, k ? {...input, press:[]} : input, dt/n);
}

function tick(s, cave, inp, dt) {
  const m = MISSIONS[s.mission];
  if (inp.aimX!=null && (inp.aimX || inp.aimY)) { const l = Math.hypot(inp.aimX, inp.aimY); s.aimX = inp.aimX/l; s.aimY = inp.aimY/l; }
  for (const key of inp.press ?? []) { act(s, cave, key); if (s.outcome) return; }

  let mx = inp.mx ?? 0, my = inp.my ?? 0, fast = !!inp.fast;
  if (s.panic>0) {
    s.panic -= dt*(inp.calm ? 3 : 1);
    if (rand(s) < dt*.4) s.panicDir += (rand(s)-.5)*2.5;
    mx = Math.cos(s.panicDir); my = Math.sin(s.panicDir); fast = true;
    if (s.panic<=0) { event(s, cave, 'calm', '停下，呼吸，想清楚'); s.stress = .6; }
  }
  s.calm = !!inp.calm && s.panic<=0;
  if (s.calm) { mx = 0; my = 0; fast = false; }
  if (s.wriggle>0) s.wriggle -= dt;
  move(s, cave, mx, my, fast, !!inp.grip && s.panic<=0, dt);

  const depth = depthOf(s), p = D.pAmb(depth), inCave = cave.overhead(s.x, s.y);
  s.stats.maxDepth = Math.max(s.stats.maxDepth, depth);
  if (inCave && once(s, 'enteredCave')) { s.stats.entered = true; event(s, cave, 'cave', '进入洞穴', 'warn'); say(s, '头顶没有直接出水的路了。从这里开始，线就是出口。', 'warn'); }

  // Line paying out from the reel.
  if (s.laying>=0) payOut(s, cave);

  // Silt, light and what the diver can see.
  updateSilt(s, cave, dt);
  const c = siltAt(s, cave, s.x, s.y), ci = cave.cellAt(s.x, s.y);
  const amb = ci>=0 ? cave.ambient[ci] : 1;
  s.vis = Math.max(amb*25, lightRange(s), .6)/(1+6*c);
  s.stats.minVis = Math.min(s.stats.minVis, s.vis);
  if (c>1 && !s.flags.siltFall) s.stats.selfSilt += dt;
  if (s.vis<1.5 && inCave && once(s, 'tipZeroVis')) say(s, '能见度归零的时候，手里的线是唯一的出路。按住空格摸线。', 'warn');
  if (s.t % 1 < dt) reveal(s, cave);

  // Breathing.
  breathe(s, cave, depth, p, dt);

  // Decompression and oxygen.
  s.anchor = Math.max(s.anchor, D.rawCeiling(s.n2, s.he, s.gf));
  s.ceiling = D.ceilingOf(s.n2, s.he, s.gf, s.anchor);
  if (s.ceiling>0 && once(s, 'tipDeco')) say(s, '电脑表上出现了减压上限。别往上冲：在上限下面停着，按住 Q 等它降下来。', 'warn');
  if (depth < s.ceiling-.5) {
    s.violation += dt*(s.ceiling-depth)/3;
    if (every(s, 'ceiling', 60)) event(s, cave, 'ceiling', `上升超过减压上限，往下回到 ${Math.ceil(s.ceiling/3)*3} 米`, 'danger');
  }
  s.ascent += (-s.vy*60 - s.ascent)*(1-Math.exp(-dt/2.5));
  if (s.ascent > D.MAX_ASCENT+1 && depth>3) {
    s.rapid += dt; s.violation += dt*.05;
    if (every(s, 'rapid', 45)) event(s, cave, 'rapid', `上升太快：${Math.round(s.ascent)} 米/分`, 'warn');
  }

  // Stress builds in the dark, off the line, when stuck or short of gas. Narcosis hides it.
  const off = nearestLine(s, s.x, s.y);
  const offLine = !off || off.dist > 3;
  if (inCave && offLine) s.stats.offLine += dt;
  const back = backGas(s);
  let target = 0;
  if (inCave && s.vis<1.5) target += .35;
  if (inCave && offLine && s.vis<4) target += .3;
  if (s.stuck>.5) target += .45;
  if (back.bar<50) target += .25;
  if (!s.light.on && inCave) target += .35;
  if (s.noGas>0) target = 1;
  target = clamp(target - s.narc*.4);
  let rate = target>s.stress ? .07 : .025;
  if (s.calm) { target = Math.min(target, .05); rate = .15; }
  s.stress += (target-s.stress)*(1-Math.exp(-rate*dt));
  s.stats.maxStress = Math.max(s.stats.maxStress, s.stress);
  if (s.stress>.88 && s.panic<=0 && !s.calm && s.noGas<=0) {
    s.panic = 25; s.panicDir = Math.atan2(-s.vy || -.2, s.vx || rand(s)-.5) + (rand(s)-.5)*2; s.grip = null;
    event(s, cave, 'panic', '惊慌失措，乱游了一段', 'danger');
    say(s, '心跳很快。按住 Q，先把呼吸放慢。', 'danger');
  }

  // Turn pressure on the back gas (rule of thirds).
  const prog = progress(s);
  if (back.bar < turnBar(back) && s.stats.turnAt==null) {
    s.stats.turnAt = prog;
    event(s, cave, 'turn', `气压到 ${turnBar(back)} bar，该返航了`, 'warn');
    say(s, `${back.name} 到返航压力 ${turnBar(back)} bar。现在就往回走。`, 'warn');
  }
  if (s.stats.turnAt!=null && prog > s.stats.turnAt+5 && !s.stats.pastTurn) {
    s.stats.pastTurn = true; event(s, cave, 'pastTurn', '过了返航压力还在往里走', 'danger');
  }

  // Light.
  const ev = m.events ?? {};
  if (ev.lightFail && s.light.failAt==null && depth>ev.lightFail.below) {
    const [a,b] = ev.lightFail.delay; s.light.failAt = s.t + a + rand(s)*(b-a);
  }
  if (s.light.on && s.light.mode==='primary' && s.light.failAt!=null && s.t>=s.light.failAt) {
    s.light.on = false; event(s, cave, 'lightFail', '主灯灭了', 'danger'); say(s, '主灯灭了。按 L 换备用灯。', 'danger');
  }
  // Silt falls from the roof once, on the way out.
  if (ev.siltFall && !s.flags.siltFall && s.items.some(i=>i.id===ev.siltFall.needs && i.state==='carried')
      && s.x>ev.siltFall.x0 && s.x<ev.siltFall.x1 && inCave) {
    s.flags.siltFall = true;
    siltBurst(s, cave, ev.siltFall.at[0], ev.siltFall.at[1], 3.5, 2.6);
    siltBurst(s, cave, s.x, s.y, 2, 1.6);
    event(s, cave, 'siltFall', '头顶落下一片泥', 'danger');
    say(s, '头顶塌下来一片泥，什么都看不见了。按住空格摸线，线上的箭头指向出口。', 'danger');
  }
  for (const sign of SIGNS) if (Math.hypot(sign.x-s.x, sign.y-s.y)<3 && once(s, `sign:${sign.x}`)) say(s, `岩壁上钉着一块牌子：${sign.text}`);

  s.t += dt;
  if (s.t - s.track.at(-1)[0] >= 3) s.track.push([s.t, s.x, s.y]);

  // Ways a dive ends underwater.
  if (s.noGas >= 40) finish(s, cave, 'death', deathCause(s, cave, offLine, inCave));
  else if (s.hypoxia >= 15) finish(s, cave, 'death', 'hypoxia');
  else if (s.cns >= 100) finish(s, cave, 'death', 'oxtox');
}

function move(s, cave, mx, my, fast, wantGrip, dt) {
  const len = Math.hypot(mx, my);
  if (len>1) { mx /= len; my /= len; }
  const vmax = s.wriggle>0 && s.stuck>0 ? .05 : fast ? SPRINT : SWIM;
  let tx = mx*vmax, ty = my*vmax;

  if (wantGrip && s.grip==null) {
    const g = nearestLine(s, s.x, s.y);
    if (g && g.dist<REACH) {
      s.grip = g.index;
      if (once(s, 'tipGrip')) say(s, s.lines[g.index].kind==='perm' ? '手里是永久线。线上的箭头指向出口。' : '抓住了线。');
    }
  } else if (!wantGrip) s.grip = null;
  if (s.grip!=null && len>.05) {
    // At junctions, hand over to the line that runs the way the diver is pushing.
    const fit = (ln) => {
      const n = nearestOnLine(ln.pts, s.x, s.y), q = pointAt(ln.pts, n.s), a = mx*q.tx + my*q.ty, l = lineLength(ln.pts);
      return n.dist>REACH || (a>0 && n.s>l-.3) || (a<0 && n.s<.3) ? 0 : Math.abs(a);
    };
    let score = fit(s.lines[s.grip]);
    s.lines.forEach((ln, i)=>{ if (i!==s.grip && ln.pts.length>1) { const f = fit(ln); if (f>score+.25) { score = f; s.grip = i; } } });
  }
  if (s.grip!=null) {
    const ln = s.lines[s.grip], near = nearestOnLine(ln.pts, s.x, s.y);
    if (near.dist>1.6) { s.grip = null; say(s, '手离开了线。', 'warn'); }
    else {
      const p = pointAt(ln.pts, near.s), along = mx*p.tx + my*p.ty;
      tx = p.tx*along*vmax + (near.x-s.x)*.3;
      ty = p.ty*along*vmax + (near.y-s.y)*.3;
      s.gripAlong = along; s.gripS = near.s;
      if (ln.kind==='perm' && Math.abs(along)>.2 && every(s, 'arrow', 40) && s.vis<3) {
        say(s, along<0 ? '摸到线箭头：这边出去。' : '摸到线箭头：你在往里走。');
      }
    }
  }

  const response = len>.05 || s.grip!=null ? .45 : .3;
  const f = 1-Math.exp(-response*dt*(fast ? 1.6 : 1));
  s.vx += (tx-s.vx)*f; s.vy += (ty-s.vy)*f;
  if (Math.abs(s.vx)>.02) s.facing = Math.sign(s.vx);

  // Integrate and keep the body out of the rock.
  const R = Math.max(.24, radius(s) - (s.wriggle>0 ? .1 : 0));
  const ox = s.x, oy = s.y;
  let x = s.x+s.vx*dt, y = s.y+s.vy*dt, hit = false;
  for (let it=0; it<4; it++) {
    const d = cave.body(x, y);
    if (d <= -R) break;
    const [gx,gy] = cave.bodyNormal(x, y);
    x -= gx*(d+R); y -= gy*(d+R);
    const vn = s.vx*gx + s.vy*gy;
    if (vn>0) { if (vn>.07) hit = true; s.vx -= gx*vn; s.vy -= gy*vn; }
  }
  const clearance = cave.body(x, y);
  s.blocked = clearance > -R+.03 && clearance > cave.body(ox, oy)-1e-4;
  if (s.blocked) { x = ox; y = oy; s.vx *= .2; s.vy *= .2; }
  y = Math.max(.15, y);
  if (s.laying>=0 && s.reelLeft<=0) {
    const a = s.lines[s.laying].pts.at(-1), allow = s.reel - lineLength(s.lines[s.laying].pts), d = Math.hypot(x-a[0], y-a[1]);
    if (d>allow && d>Math.hypot(ox-a[0], oy-a[1])-1e-6) {
      x = ox; y = oy; s.vx = s.vy = 0;
      if (once(s, `reelOut:${s.laying}`)) event(s, cave, 'reelOut', '线放完了', 'warn');
      if (every(s, 'reelOutSay', 40)) say(s, '线放完了。按 R 把线尾系在岩壁上，或者回头。', 'warn');
    }
  }
  s.x = x; s.y = y;

  // A squeeze: pushing into open water that is narrower than the body (with its tanks).
  const ahead = len>.05 ? cave.body(s.x+mx/len*(R+.25), s.y+my/len*(R+.25)) : 0;
  const moved = len>.05 ? ((s.x-ox)*mx+(s.y-oy)*my)/len : 0;
  const squeezed = len>.05 && ahead<-.08 && ahead>-R-.02 && moved < .3*vmax*dt;
  s.stuck = squeezed || (s.blocked && len>.05) ? s.stuck+dt : Math.max(0, s.stuck-dt*2);
  if (s.stuck>.6 && once(s, 'tipStuck')) {
    event(s, cave, 'stuck', '卡在窄缝里', 'warn');
    say(s, '卡住了。肩膀顶着石头，气瓶刮着洞顶。连按 F 往前挤，或按 G 放下侧挂瓶。', 'warn');
  }
  if (s.blocked && s.wriggle>0 && s.stuck>0 && every(s, 'squeeze', 2)) siltBurst(s, cave, s.x, s.y, .8, .15);
  if (!s.blocked && s.flags.tipStuck && !s.flags.squeezed && cave.placeName(s.x, s.y)==='限制段' && s.y>87.5) {
    s.flags.squeezed = true; event(s, cave, 'squeeze', '挤过去了', 'good');
  }

  if (hit) {
    s.stats.wallHits++;
    siltBurst(s, cave, s.x, s.y, .9, .35);
    s.stress = Math.min(1, s.stress+.03);
    if (every(s, 'wall', 30)) event(s, cave, 'wall', '撞到岩壁');
  }

  // Fin kicks stir up whatever silt lies near the fins.
  const speed = Math.hypot(s.vx, s.vy);
  if (speed>.04) {
    const kick = speed/SWIM*(fast ? 2.2 : 1)*(s.grip!=null && !fast ? .25 : 1);
    const fx = s.x - s.vx/speed*.9, fy = s.y - s.vy/speed*.9 + .35;
    for (const [dx,dy] of [[0,0],[0,.5],[.5,.5],[-.5,.5],[0,1]]) {
      const i = cave.cellAt(fx+dx, fy+dy);
      if (i<0 || cave.siltCap[i]<=0) continue;
      const amount = cave.siltCap[i]*kick*dt*.35;
      addSilt(s, cave, i, amount*.6);
      // Fin wash lifts part of it into the water column.
      addSilt(s, cave, cave.cellAt(fx+dx, fy+dy-.5), amount*.25);
      addSilt(s, cave, cave.cellAt(fx+dx, fy+dy-1), amount*.15);
    }
  }
}

function payOut(s, cave) {
  const ln = s.lines[s.laying], a = ln.pts.at(-1);
  if (cave.clear(a[0], a[1], s.x, s.y, .02) < 1) ln.pts.push([...s.lastClear]);
  else s.lastClear = [s.x, s.y];
  const b = ln.pts.at(-1);
  s.reelLeft = Math.max(0, s.reel - lineLength(ln.pts) - Math.hypot(s.x-b[0], s.y-b[1]));
}

function breathe(s, cave, depth, p, dt) {
  const g = s.gases[s.active], speed = Math.hypot(s.vx, s.vy);
  let effort = s.calm ? .55 : speed>.03 ? (speed>SWIM*1.2 ? 1.9 : 1.05) : .8;
  if (s.wriggle>0) effort = 2.2;
  s.breath = s.sac*effort*(1+1.3*s.stress);
  s.narc = clamp((D.endOf(g, depth)-30)/30);
  if (s.narc>.25 && once(s, `narc:${s.active}`)) say(s, `有点晕，又觉得什么都挺好。${Math.round(depth)} 米，${g.name}：这是氮醉。`, 'warn');

  if (usable(g)) {
    g.bar = Math.max(0, g.bar - s.breath/60*dt*p/g.vol);
    D.load(s.n2, s.he, p, g, dt/60);
    s.noGas = 0;
    if (g.bar<50 && g.role==='back' && once(s, 'low:'+s.active)) event(s, cave, 'gasLow', `${g.name} 只剩 ${Math.round(g.bar)} bar`, 'warn');
  } else {
    const alt = s.gases.findIndex((h,i)=>i!==s.active && usable(h) && D.ppO2(h,depth)>=.16 && D.ppO2(h,depth)<=1.8);
    if (alt>=0) {
      event(s, cave, 'switch', `${g.name} 打空了，换到 ${s.gases[alt].name}`, 'warn');
      say(s, `${g.name} 打空了。嘴里换成了 ${s.gases[alt].name}。现在就往外走。`, 'danger');
      s.active = alt;
    } else {
      if (s.noGas===0) { event(s, cave, 'noGas', '吸不到气了', 'danger'); say(s, '吸不到气了。', 'danger'); }
      s.noGas += dt;
    }
  }
  const po2 = g.o2*p;
  s.hypoxia = po2<D.MIN_PPO2 && usable(g) ? s.hypoxia+dt : 0;
  if (s.hypoxia>0 && every(s, 'hypoxia', 30)) event(s, cave, 'hypoxia', `${g.name} 在 ${Math.round(depth)} 米氧分压只有 ${po2.toFixed(2)}`, 'danger');
  if (usable(g) && po2>D.SAFE_PPO2+.05 && every(s, 'hyperoxia', 30)) event(s, cave, 'hyperoxia', `氧分压 ${po2.toFixed(2)}，超过 1.6`, 'danger');
  const breathing = usable(g) ? po2 : 0;
  s.cns = Math.max(0, s.cns + (breathing>.5 ? D.cnsRate(breathing)*dt/60 : -s.cns*(1-2**(-dt/60/90))));
}

function reveal(s, cave) {
  const r = Math.min(7, Math.max(2, s.vis*.8)), rc = Math.ceil(r/CELL);
  const cx = Math.floor((s.x-BOUNDS.x0)/CELL), cy = Math.floor((s.y-BOUNDS.y0)/CELL);
  for (let dy=-rc; dy<=rc; dy++) for (let dx=-rc; dx<=rc; dx++) {
    if (dx*dx+dy*dy > rc*rc) continue;
    const x = cx+dx, y = cy+dy;
    if (x>=0 && y>=0 && x<cave.cw && y<cave.ch) s.seen[y*cave.cw+x] = 1;
  }
}

function deathCause(s, cave, offLine, inCave) {
  if (s.stuck>2) return 'stuck';
  if (inCave && offLine) return siltAt(s, cave, s.x, s.y)>.5 ? 'silt' : 'lost';
  return 'gas';
}

export const CAUSES = {
  gas:['气体耗尽','气瓶空了，没到出口。'],
  lost:['丢线迷路','离开了线，在黑暗里没找到回去的路。'],
  silt:['泥沙中迷失','能见度归零以后，没找到线。'],
  stuck:['卡在窄缝','人卡在缝里，挣扎到气用完。'],
  hypoxia:['缺氧昏迷','吸的气体氧分压太低。低氧底气只能在足够深的地方吸。'],
  oxtox:['氧中毒抽搐','氧分压太高，中枢神经氧中毒。在水下抽搐通常是致命的。'],
  dcs:['减压病','上升太快或没做完减压，氮气在身体里冒泡。'],
  incomplete:['任务没完成','安全出水了，但没带回要找的东西。'],
  safe:['安全出水','活着回到天窗水面。']
};

function finish(s, cave, how, cause) {
  if (s.outcome) return;
  const m = MISSIONS[s.mission], sgf = D.surfaceGF(s.n2, s.he);
  if (how==='surface') {
    const goals = s.items.filter(i=>i.goal);
    if (goals.every(i=>i.state==='carried')) complete(s, cave, 'exit');
    cause = sgf>100 || s.violation>40 ? 'dcs' : goals.every(i=>i.state==='carried') ? 'safe' : 'incomplete';
    event(s, cave, 'surface', cause==='dcs' ? '出水，关节开始疼' : '出水', cause==='dcs' ? 'danger' : 'good');
  } else event(s, cave, 'death', CAUSES[cause][0], 'danger');
  const back = backGas(s), tie = s.objectives.find(o=>o.id==='tie');
  const checks = [
    {ok:tie ? tie.done : true, text:s.mission==='basin' ? '下水后先系好主线' : '从开放水域放线，接上永久线'},
    {ok:!s.stats.entered || s.stats.offLine<15, text:`在洞里没有离开线（离线 ${Math.round(s.stats.offLine)} 秒）`},
    {ok:!s.stats.pastTurn, text:'到返航压力就回头'},
    {ok:s.stats.selfSilt<20, text:'没有自己把能见度踢到零'},
    {ok:s.stats.wallHits<10, text:`撞墙 ${s.stats.wallHits} 次`},
    {ok:s.rapid<20, text:'上升速度不超过 10 米/分'},
    {ok:s.violation<1, text:'没有浅于减压上限'},
    {ok:back.bar>=back.bar0/3, text:`底气剩下三分之一以上（${Math.round(back.bar)} bar）`}
  ];
  const relics = s.items.filter(i=>i.relic && i.state==='carried').map(i=>i.name);
  s.outcome = {how, cause, title:CAUSES[cause][0], text:CAUSES[cause][1], t:s.t, surfaceGF:sgf, checks,
    relics: how==='surface' ? relics : [], score: how==='surface' && cause!=='dcs' ? checks.filter(c=>c.ok).length : 0};
}
