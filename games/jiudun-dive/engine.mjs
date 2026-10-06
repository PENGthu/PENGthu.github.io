// A simplified cave-dive model for a game. Bühlmann ZHL-16C with gradient factors,
// fresh water, sea-level surface. Values are illustrative and must not be used to plan real dives.
import {caveAt, LINE_LENGTH, penetration} from './cave.mjs';

export const VERSION = 1;
export const P_SURF = 1.01325, BAR_PER_M = .0981, P_H2O = .0627;
export const pAmb = d => P_SURF + Math.max(0,d)*BAR_PER_M;
export const depthOf = p => (p-P_SURF)/BAR_PER_M;
export const clamp = (v,a=0,b=1) => Math.min(b, Math.max(a,v));

const N2_HT = [5,8,12.5,18.5,27,38.3,54.3,77,109,146,187,239,305,390,498,635];
const N2_A = [1.1696,1,.8618,.7562,.62,.5043,.441,.4,.375,.35,.3295,.3065,.2835,.261,.248,.2327];
const N2_B = [.5578,.6514,.7222,.7825,.8126,.8434,.8693,.891,.9092,.9222,.9319,.9403,.9477,.9544,.9602,.9653];
const HE_HT = [1.88,3.02,4.72,6.99,10.21,14.48,20.53,29.11,41.2,55.19,70.69,90.34,115.29,147.42,188.24,240.03];
const HE_A = [1.6189,1.383,1.1919,1.0458,.922,.8205,.7305,.6502,.595,.5545,.5333,.5189,.5181,.5176,.5172,.5119];
const HE_B = [.477,.5747,.6527,.7223,.7582,.7957,.8279,.8553,.8757,.8903,.8997,.9073,.9122,.9171,.9217,.9267];

export const SPEEDS = [5,9,18]; // metres of line per minute
export const MAX_ASCENT = 10;    // metres per minute
export const SAFE_PPO2 = 1.6, MIN_PPO2 = .16;

export const PLANS = {
  basin:{name:'天窗水潭', subtitle:'空气单瓶 · 开放水域 0–30 m', target:30, gf:[40,85], sac:16,
    brief:'只在天窗下方的开放水域活动。洞口在 40 m，休闲潜水员不应进入头顶有遮挡的环境。',
    gases:[{name:'空气', o2:.21, he:0, vol:12, bar:200, role:'bottom'}]},
  mouth:{name:'洞口平洞', subtitle:'Tx 21/35 双瓶 + EAN50 · 目标 45 m', target:45, gf:[30,80], sac:18,
    brief:'穿过 40 m 洞口，沿平洞到竖井入口后折返。回程用 EAN50 加速减压。',
    gases:[{name:'Tx 21/35', o2:.21, he:.35, vol:24, bar:220, role:'bottom'},
      {name:'EAN50', o2:.5, he:0, vol:11, bar:200, role:'deco'}]},
  shaft:{name:'竖井 120', subtitle:'Tx 10/70 双瓶 + 三种减压气 · 目标 120 m', target:120, gf:[30,75], sac:18,
    brief:'用旅行气下潜，20 m 以下切换低氧底气。底部时间约 5 分钟。竖井狭窄易扬沙，上升需要数小时减压。',
    gases:[{name:'Tx 21/35', o2:.21, he:.35, vol:22, bar:200, role:'travel'},
      {name:'Tx 10/70', o2:.1, he:.7, vol:36, bar:230, role:'bottom'},
      {name:'EAN50', o2:.5, he:0, vol:22, bar:200, role:'deco'},
      {name:'氧气', o2:1, he:0, vol:11, bar:200, role:'deco'}]}
};

const clone = x => structuredClone(x);
const fN2 = g => 1-g.o2-g.he;
export const ppO2 = (g,d) => g.o2*pAmb(d);
export const modOf = (g,limit=SAFE_PPO2) => depthOf(limit/g.o2);
export const endOf = (g,d) => Math.max(0, depthOf(pAmb(d)*(1-g.he)));
export const turnBar = g => Math.ceil(g.bar0*2/3);

export function createGame({plan='basin', seed=261006}={}) {
  plan = PLANS[plan] ? plan : 'basin';
  const cfg = PLANS[plan], inert = (P_SURF-P_H2O)*.7902;
  return {version:VERSION, plan, seed, t:0, pos:0, maxPos:0, thirdsPos:null, depth:0, maxDepth:0, speed:1, move:0,
    gases:cfg.gases.map(g=>({...g, bar0:g.bar})), active:0, gf:[...cfg.gf], sac:cfg.sac,
    n2:N2_HT.map(()=>inert), he:HE_HT.map(()=>0), anchor:0, ceiling:0,
    cns:0, maxCns:0, silt:0, battery:100, ascentRate:0, violation:0, rapidAscent:0,
    noGas:0, hypoxia:0, narcosis:0, flags:{}, outcome:null,
    log:[{t:0, text:`计划「${cfg.name}」：${cfg.subtitle}`, level:'info'}]};
}

// Haldane loading at constant ambient pressure for `minutes`.
export function load(n2, he, p, gas, minutes) {
  const pi = p-P_H2O;
  for (let i=0;i<16;i++) {
    n2[i] += (pi*fN2(gas)-n2[i])*(1-2**(-minutes/N2_HT[i]));
    he[i] += (pi*gas.he-he[i])*(1-2**(-minutes/HE_HT[i]));
  }
}

function coeffs(n2, he, i) {
  const pt = n2[i]+he[i];
  return {pt, a:(N2_A[i]*n2[i]+HE_A[i]*he[i])/pt, b:(N2_B[i]*n2[i]+HE_B[i]*he[i])/pt};
}
// Deepest tolerated depth across compartments at gradient factor `gf`.
function tolerated(n2, he, gf) {
  let max = -Infinity;
  for (let i=0;i<16;i++) {
    const {pt,a,b} = coeffs(n2,he,i);
    max = Math.max(max, depthOf((pt-a*gf)/(gf/b+1-gf)));
  }
  return max;
}
const gfAt = (d, [lo,hi], anchor) => anchor<=0 ? hi : d>=anchor ? lo : hi+(lo-hi)*d/anchor;
export const rawCeiling = (n2, he, gf) => Math.max(0, tolerated(n2, he, gf[0]/100));
const allowed = (n2, he, gf, anchor, d) => tolerated(n2, he, gfAt(d, gf.map(v=>v/100), anchor)) <= d+1e-6;

// Current ceiling with GF low anchored at the deepest GF-low ceiling seen.
export function ceilingOf(n2, he, gf, anchor) {
  anchor = Math.max(anchor, rawCeiling(n2,he,gf));
  if (allowed(n2,he,gf,anchor,0)) return 0;
  let lo = 0, hi = anchor;
  for (let k=0;k<24;k++) { const mid=(lo+hi)/2; allowed(n2,he,gf,anchor,mid) ? hi=mid : lo=mid; }
  return hi;
}

// Highest supersaturation at the surface, in percent of the raw M-value.
export function surfaceGF(n2, he) {
  let max = 0;
  for (let i=0;i<16;i++) {
    const {pt,a,b} = coeffs(n2,he,i), m = a+P_SURF/b;
    max = Math.max(max, (pt-P_SURF)/(m-P_SURF)*100);
  }
  return max;
}

// CNS oxygen clock (NOAA single-exposure limits), percent per minute.
const CNS_TABLE = [[.6,720],[.7,570],[.8,450],[.9,360],[1,300],[1.1,240],[1.2,210],[1.3,180],[1.4,150],[1.5,120],[1.6,45]];
export function cnsRate(p) {
  if (p <= .5) return 0;
  if (p > 1.6) return 100/(45*Math.exp(-(p-1.6)*10));
  let [p0,l0] = [.5,1e9];
  for (const [p1,l1] of CNS_TABLE) {
    if (p <= p1) return 100/(p0===.5 ? l1 : l0+(l1-l0)*(p-p0)/(p1-p0));
    [p0,l0] = [p1,l1];
  }
  return 100/45;
}

// Richest usable gas for an ascent at depth `d`.
export function bestGas(gases, d, fallback=0) {
  let pick = -1;
  gases.forEach((g,i)=>{
    const p = ppO2(g,d);
    if (g.bar>5 && p<=SAFE_PPO2+.02 && p>=.18 && (pick<0 || g.o2>gases[pick].o2)) pick = i;
  });
  return pick<0 ? fallback : pick;
}

function note(s, key, text, level='info') {
  if (s.flags[key]) return;
  s.flags[key] = true;
  s.log.push({t:s.t, text, level});
}

function finish(s, kind) {
  const sgf = surfaceGF(s.n2, s.he), cfg = PLANS[s.plan];
  if (kind==='surfaced' && (sgf>100 || s.violation>30)) kind = 'dcs';
  const texts = {
    surfaced:['安全出水','你完成了减压，回到天窗水面。'],
    dcs:['减压病','出水时组织过饱和过高，气泡在体内形成。真实环境里需要立即吸氧并送往高压氧舱。'],
    drowned:['气体耗尽','当前气瓶已空，没有及时切换到可用气体。'],
    hypoxia:['缺氧昏迷','吸入气体的氧分压过低。低氧混合气只能在足够深的地方呼吸。'],
    oxtox:['氧中毒抽搐','氧分压过高导致中枢神经氧中毒。在水下抽搐通常致命。']
  };
  const bottom = s.gases.find(g=>g.role==='bottom') ?? s.gases[0];
  const checks = [
    {ok:s.maxDepth>=cfg.target-3, text:`到达目标深度 ${cfg.target} m（最大 ${s.maxDepth.toFixed(1)} m）`},
    {ok:s.violation<1, text:'全程没有浅于减压上限'},
    {ok:s.rapidAscent<20, text:`上升速率不超过 ${MAX_ASCENT} m/min`},
    {ok:s.thirdsPos===null || s.maxPos<=s.thirdsPos+5, text:'底气用到三分之一时折返'},
    {ok:s.maxCns<80, text:`CNS 氧中毒负荷低于 80%（最高 ${Math.round(s.maxCns)}%）`},
    {ok:bottom.bar>=bottom.bar0/3, text:`底气保留三分之一以上（剩余 ${Math.round(bottom.bar)} bar）`}
  ];
  s.outcome = {kind, title:texts[kind][0], text:texts[kind][1], surfaceGF:sgf, runtime:s.t, checks};
  s.log.push({t:s.t, text:texts[kind][0], level:kind==='surfaced'?'good':'danger'});
}

// Advance the dive by one second. Mutates `s`.
function tick(s, input) {
  if (s.outcome) return;
  const dt = 1, from = caveAt(s.pos), gas = s.gases[s.active];
  s.speed = Math.max(0, Math.min(2, input.speed ?? s.speed));
  s.move = Math.sign(input.move ?? 0);
  const v = SPEEDS[s.speed]/60*(1-.6*s.silt);
  s.pos = clamp(s.pos+s.move*v*dt, 0, LINE_LENGTH);
  s.maxPos = Math.max(s.maxPos, s.pos);
  const here = caveAt(s.pos), d0 = s.depth, d1 = here.d, p = pAmb((d0+d1)/2);
  s.depth = d1;
  s.maxDepth = Math.max(s.maxDepth, d1);
  s.ascentRate = (d0-d1)/dt*60;
  if (s.ascentRate > MAX_ASCENT+.5) {
    s.rapidAscent += dt;
    note(s, `rapid:${Math.floor(s.t/60)}`, `上升过快：${s.ascentRate.toFixed(0)} m/min`, 'warn');
  }

  // Breathing and gas use.
  s.narcosis = clamp((endOf(gas,s.depth)-30)/40);
  const work = s.move ? 1+.35*s.speed : 1, stress = 1+.5*s.narcosis+.4*s.silt;
  if (gas.bar > 0) {
    gas.bar = Math.max(0, gas.bar - s.sac/60*dt*p*work*stress/gas.vol);
    load(s.n2, s.he, p, gas, dt/60);
    s.noGas = 0;
  } else {
    s.noGas += dt;
    note(s, `empty:${s.active}`, `${gas.name} 已空，立刻切换气体！`, 'danger');
  }
  const bottom = s.gases.find(g=>g.role==='bottom') ?? s.gases[0];
  if (bottom.bar < turnBar(bottom)) {
    if (s.thirdsPos===null) s.thirdsPos = s.pos;
    note(s, 'thirds', `${bottom.name} 已用掉三分之一，按规则应折返`, 'warn');
  }
  if (gas.bar>0 && gas.bar<30) note(s, `low:${s.active}`, `${gas.name} 低于 30 bar`, 'warn');

  // Oxygen limits.
  const po2 = gas.o2*p;
  s.hypoxia = po2<MIN_PPO2 && gas.bar>0 ? s.hypoxia+dt : 0;
  if (s.hypoxia) note(s, `hypoxic:${s.active}:${Math.floor(s.t/30)}`, `${gas.name} 在此深度氧分压只有 ${po2.toFixed(2)}，正在缺氧`, 'danger');
  if (po2 > SAFE_PPO2+.05) note(s, `hyperoxic:${s.active}:${Math.floor(s.t/30)}`, `氧分压 ${po2.toFixed(2)} 超过 1.6`, 'danger');
  s.cns = Math.max(0, s.cns + (po2>.5 ? cnsRate(po2)*dt/60 : -s.cns*(1-2**(-dt/60/90))));
  s.maxCns = Math.max(s.maxCns, s.cns);
  if (s.narcosis>.25) note(s, `narc:${s.active}`, `氮醉加重（等效麻醉深度 ${endOf(gas,s.depth).toFixed(0)} m）`, 'warn');

  // Environment.
  if (here.overhead) {
    note(s, 'overhead', '进入洞穴：头顶不再有直接通往水面的出口', 'warn');
    if (s.move) s.silt += .0015*(s.speed+1)**2/Math.max(.8, here.w-1)*dt;
  }
  s.silt = clamp(s.silt*Math.exp(-dt/120));
  if (s.silt>.6) note(s, `silt:${Math.floor(s.t/120)}`, '扬沙！能见度接近零，放慢速度', 'warn');
  s.battery = Math.max(0, s.battery-dt/(600*60)*100);

  // Decompression.
  s.anchor = Math.max(s.anchor, rawCeiling(s.n2, s.he, s.gf));
  s.ceiling = ceilingOf(s.n2, s.he, s.gf, s.anchor);
  if (s.depth < s.ceiling-.3) {
    s.violation += dt*(s.ceiling-s.depth)/3;
    note(s, `ceiling:${Math.floor(s.t/60)}`, `浅于减压上限 ${s.ceiling.toFixed(1)} m！`, 'danger');
  }
  if (s.depth >= PLANS[s.plan].target) note(s, 'target', `到达计划深度 ${PLANS[s.plan].target} m`, 'good');
  if (s.pos >= LINE_LENGTH) note(s, 'lineEnd', '引导绳到此为止，前方是未探明的黑暗', 'warn');

  s.t += dt;
  if (s.noGas >= 25) finish(s, 'drowned');
  else if (s.hypoxia >= 12) finish(s, 'hypoxia');
  else if (s.cns >= 100) finish(s, 'oxtox');
  else if (s.pos <= 0 && s.move < 0 && s.maxDepth > 2) finish(s, 'surfaced');
}

// Pure: returns a new state advanced by `seconds`.
export function advance(state, input={}, seconds=1) {
  const s = clone(state);
  for (let i=0;i<seconds && !s.outcome;i++) tick(s, input);
  return s;
}

export function switchGas(state, index) {
  if (state.outcome || !state.gases[index] || index===state.active) return {state, error:'无法切换'};
  const s = clone(state), g = s.gases[index], p = ppO2(g, s.depth);
  s.active = index;
  s.log.push({t:s.t, text:`切换到 ${g.name}（氧分压 ${p.toFixed(2)}）`,
    level:p>SAFE_PPO2 || p<MIN_PPO2 ? 'danger' : 'info'});
  return {state:s};
}

// Simulated ascent from the current state: stops, time to surface and gas needed.
export function planAscent(s, {rate=9, step=3}={}) {
  const n2 = [...s.n2], he = [...s.he], need = s.gases.map(()=>0), stops = [];
  let d = s.depth, anchor = s.anchor, run = 0, gi = s.active, guard = 0;
  const breathe = (depth, minutes) => {
    gi = bestGas(s.gases, depth, gi);
    load(n2, he, pAmb(depth), s.gases[gi], minutes);
    need[gi] += s.sac*.9*pAmb(depth)*minutes;
    run += minutes;
  };
  let noStop = null;
  if (s.ceiling <= 0) {
    // No-stop time at the current depth, capped at 99 minutes.
    const t2 = [...n2], h2 = [...he];
    for (noStop=0; noStop<99 && ceilingOf(t2, h2, s.gf, anchor)<=0; noStop++) load(t2, h2, pAmb(d), s.gases[s.active], 1);
  }
  while (d > 0 && guard++ < 3000) {
    anchor = Math.max(anchor, rawCeiling(n2, he, s.gf));
    const next = Math.max(0, Math.ceil(d/step-1e-9)*step-step);
    if (allowed(n2, he, s.gf, anchor, next)) {
      breathe((d+next)/2, (d-next)/rate);
      d = next;
    } else {
      breathe(d, 1);
      const last = stops.at(-1);
      if (last && last.depth===d) last.min++; else stops.push({depth:d, min:1, gas:s.gases[gi].name});
    }
  }
  const short = s.gases.filter((g,i)=>need[i] > g.bar*g.vol).map(g=>g.name);
  return {tts:run, stops, need, short, noStop};
}
