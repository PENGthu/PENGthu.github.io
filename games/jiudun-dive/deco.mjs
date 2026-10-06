// Decompression and breathing-gas model. Bühlmann ZHL-16C with gradient factors,
// fresh water, sea-level surface. Illustrative only: never use it to plan a real dive.

export const P_SURF = 1.01325, BAR_PER_M = .0981, P_H2O = .0627;
export const SAFE_PPO2 = 1.6, MIN_PPO2 = .16, MAX_ASCENT = 10;
export const pAmb = d => P_SURF + Math.max(0,d)*BAR_PER_M;
export const depthOf = p => (p-P_SURF)/BAR_PER_M;
export const clamp = (v,a=0,b=1) => Math.min(b, Math.max(a,v));

const N2_HT = [5,8,12.5,18.5,27,38.3,54.3,77,109,146,187,239,305,390,498,635];
const N2_A = [1.1696,1,.8618,.7562,.62,.5043,.441,.4,.375,.35,.3295,.3065,.2835,.261,.248,.2327];
const N2_B = [.5578,.6514,.7222,.7825,.8126,.8434,.8693,.891,.9092,.9222,.9319,.9403,.9477,.9544,.9602,.9653];
const HE_HT = [1.88,3.02,4.72,6.99,10.21,14.48,20.53,29.11,41.2,55.19,70.69,90.34,115.29,147.42,188.24,240.03];
const HE_A = [1.6189,1.383,1.1919,1.0458,.922,.8205,.7305,.6502,.595,.5545,.5333,.5189,.5181,.5176,.5172,.5119];
const HE_B = [.477,.5747,.6527,.7223,.7582,.7957,.8279,.8553,.8757,.8903,.8997,.9073,.9122,.9171,.9217,.9267];

const fN2 = g => 1-g.o2-g.he;
export const ppO2 = (g,d) => g.o2*pAmb(d);
export const modOf = (g,limit=SAFE_PPO2) => depthOf(limit/g.o2);
export const endOf = (g,d) => Math.max(0, depthOf(pAmb(d)*(1-g.he)));
export const freshTissues = () => ({n2:N2_HT.map(()=>(P_SURF-P_H2O)*.7902), he:HE_HT.map(()=>0)});

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
// Deepest tolerated depth across compartments at gradient factor `gf` (0..1).
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

// Current ceiling, GF low anchored at the deepest GF-low ceiling seen.
export function ceilingOf(n2, he, gf, anchor) {
  anchor = Math.max(anchor, rawCeiling(n2,he,gf));
  if (allowed(n2,he,gf,anchor,0)) return 0;
  let lo = 0, hi = anchor;
  for (let k=0;k<24;k++) { const mid=(lo+hi)/2; allowed(n2,he,gf,anchor,mid) ? hi=mid : lo=mid; }
  return hi;
}

// Highest supersaturation at the surface, in percent of the raw M-value. 0 when undersaturated.
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

// Richest usable gas at depth `d` among those with `usable(g)` true.
export function bestGas(gases, d, fallback=0, usable=g=>g.bar>5) {
  let pick = -1;
  gases.forEach((g,i)=>{
    const p = ppO2(g,d);
    if (usable(g) && p<=SAFE_PPO2+.02 && p>=.18 && (pick<0 || g.o2>gases[pick].o2)) pick = i;
  });
  return pick<0 ? fallback : pick;
}

// Simulated ascent from depth `depth`: stops, time to surface (minutes) and gas needed (litres).
export function planAscent({depth, n2, he, anchor, gf, gases, active, sac, usable}, {rate=9, step=3}={}) {
  n2 = [...n2]; he = [...he];
  const need = gases.map(()=>0), stops = [];
  let d = depth, run = 0, gi = active, guard = 0, noStop = null;
  const breathe = (at, minutes) => {
    gi = bestGas(gases, at, gi, usable);
    load(n2, he, pAmb(at), gases[gi], minutes);
    need[gi] += sac*.9*pAmb(at)*minutes;
    run += minutes;
  };
  if (ceilingOf(n2, he, gf, anchor) <= 0) {
    const t2 = [...n2], h2 = [...he];
    for (noStop=0; noStop<99 && ceilingOf(t2, h2, gf, anchor)<=0; noStop++) load(t2, h2, pAmb(d), gases[active], 1);
  }
  while (d > 0 && guard++ < 3000) {
    anchor = Math.max(anchor, rawCeiling(n2, he, gf));
    const next = Math.max(0, Math.ceil(d/step-1e-9)*step-step);
    if (allowed(n2, he, gf, anchor, next)) {
      breathe((d+next)/2, (d-next)/rate);
      d = next;
    } else {
      breathe(d, 1);
      const last = stops.at(-1);
      if (last && last.depth===d) last.min++; else stops.push({depth:d, min:1, gas:gases[gi].name});
    }
  }
  const short = gases.filter((g,i)=>need[i] > g.bar*g.vol).map(g=>g.name);
  return {tts:run, stops, need, short, noStop};
}
