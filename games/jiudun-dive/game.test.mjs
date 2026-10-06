import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from './deco.mjs';
import {Cave, PERMANENT_LINE, SIGNS, nearestOnLine, pointAt} from './cave.mjs';
import * as S from './sim.mjs';
import {MISSIONS} from './missions.mjs';

const cave = new Cave();
const DT = S.TIME_SCALE/60;
const run = (s, input, seconds) => { const t0 = s.t; while (!s.outcome && s.t-t0<seconds) S.step(s, cave, input, DT); };
const place = (s, x, y) => { s.x = x; s.y = y; s.vx = s.vy = 0; };

test('decompression: 30 m on air gives a realistic no-stop time and a ceiling later', ()=>{
  const {n2, he} = D.freshTissues(), air = {o2:.21, he:0};
  assert.equal(D.ceilingOf(n2, he, [40,85], 0), 0);
  const plan = D.planAscent({depth:30, n2, he, anchor:0, gf:[40,85], gases:[{...air, bar:200, vol:12, name:'空气'}], active:0, sac:16});
  assert.ok(plan.noStop>=8 && plan.noStop<=20, `no-stop ${plan.noStop}`);
  D.load(n2, he, D.pAmb(30), air, 30);
  assert.ok(D.ceilingOf(n2, he, [40,85], 0) > 3);
  assert.ok(D.surfaceGF(n2, he) > 100);
  assert.ok(D.cnsRate(1.4) < D.cnsRate(1.6) && D.cnsRate(1.6) < D.cnsRate(2));
});

test('cave: the permanent line runs through water and the restriction is 0.88 m wide', ()=>{
  for (const p of PERMANENT_LINE) assert.ok(cave.sdf(...p) < -.15, `line point ${p} in rock`);
  for (let i=0;i<PERMANENT_LINE.length-1;i++) assert.equal(cave.clear(...PERMANENT_LINE[i], ...PERMANENT_LINE[i+1], 0), 1);
  for (const sign of SIGNS) assert.ok(cave.sdf(sign.x, sign.y) < 0);
  for (const m of Object.values(MISSIONS)) for (const it of m.items) assert.ok(cave.body(it.x, it.y) < -.3, it.name);
  assert.ok(Math.abs(cave.body(47.5, 83)+.44) < .05);
  assert.equal(cave.overhead(0, 10), false);
  assert.equal(cave.overhead(35, 41.5), true);
});

test('swimming never ends inside rock, even pushing into walls', ()=>{
  const s = S.createSim('basin', cave, 1);
  for (const [mx,my] of [[-1,0],[1,1],[1,0],[0,1],[-1,1]]) {
    run(s, {mx, my, fast:true}, 60);
    assert.ok(cave.body(s.x, s.y) <= -S.radius(s)+.05, `inside rock at ${s.x},${s.y}`);
  }
  assert.ok(s.stats.wallHits>0);
});

test('a line tied on rock pays out as you swim, wraps corners and runs out', ()=>{
  const s = S.createSim('basin', cave, 1);
  place(s, -10.2, 3); S.step(s, cave, {press:['R']}, DT);
  assert.equal(s.laying, 2);
  assert.equal(s.objectives[0].done, true);
  run(s, {mx:1, my:1}, 200);
  const own = s.lines[s.laying];
  assert.ok(own.pts.length>=2, 'line should wrap around the shelf');
  assert.ok(s.reelLeft < MISSIONS.basin.reel);
  run(s, {mx:1, my:1}, 900);
  assert.ok(s.reelLeft<=.01);
  const a = own.pts.at(-1), allow = s.reel - own.pts.reduce((t,p,i)=>i ? t+Math.hypot(p[0]-own.pts[i-1][0], p[1]-own.pts[i-1][1]) : 0, 0);
  assert.ok(Math.hypot(s.x-a[0], s.y-a[1]) <= allow+.05, 'reel should tether the diver');
});

test('tying into the permanent line completes the primary line objective', ()=>{
  const s = S.createSim('mouth', cave, 1);
  place(s, -10.2, 3); S.step(s, cave, {press:['R']}, DT);
  place(s, 8.6, 35); S.step(s, cave, {press:['R']}, DT);
  assert.equal(s.laying, -1);
  assert.equal(s.objectives.find(o=>o.id==='tie').done, true);
  assert.ok(s.log.some(e=>e.text==='接上永久线'));
});

test('gripping the permanent line carries you along it, towards the exit when you push that way', ()=>{
  const s = S.createSim('mouth', cave, 1);
  const start = nearestOnLine(PERMANENT_LINE, 36, 41.4);
  place(s, 36, 41.4);
  for (let i=0;i<1000;i++) { const n = nearestOnLine(PERMANENT_LINE, s.x, s.y), p = pointAt(PERMANENT_LINE, n.s); S.step(s, cave, {mx:-p.tx, my:-p.ty, grip:true}, DT); }
  const end = nearestOnLine(PERMANENT_LINE, s.x, s.y);
  assert.ok(end.s < start.s-8, `moved ${start.s-end.s} m along the line`);
  assert.ok(end.dist < 1);
});

test('fast kicks over the passage floor stir silt that cuts visibility, and it settles', ()=>{
  const s = S.createSim('mouth', cave, 1);
  place(s, 30, 42.6);
  run(s, {mx:1, fast:true}, 40);
  run(s, {mx:-1, fast:true}, 40);
  const peak = s.silt.reduce((a,b)=>a+b, 0);
  assert.ok(peak > 2, `silt ${peak}`);
  assert.ok(s.stats.minVis < 8);
  run(s, {calm:true}, 1800);
  assert.ok(s.silt.reduce((a,b)=>a+b, 0) < peak*.2);
});

test('the restriction stops a diver with two or more side tanks until they drop some', ()=>{
  const s = S.createSim('shaft', cave, 1);
  s.active = 1; place(s, 47.25, 77.5);
  run(s, {mx:.03, my:1}, 240);
  assert.ok(s.y < 81 && s.stuck > .6, `y ${s.y} stuck ${s.stuck}`);
  assert.ok(S.prompts(s, cave).some(p=>p.key==='G'));
  S.step(s, cave, {press:['G']}, DT); S.step(s, cave, {press:['G']}, DT);
  assert.equal(s.gases.filter(g=>g.role==='stage' && g.carried).length, 1);
  run(s, {mx:.03, my:1}, 240);
  assert.ok(s.y > 87, `got to ${s.y}`);
  assert.ok(s.log.some(e=>e.type==='squeeze'));
});

test('running out of gas off the line in the dark is recorded as lost', ()=>{
  const s = S.createSim('mouth', cave, 1);
  place(s, 55.5, 121.5); s.gases.forEach(g=>g.bar=0); s.light.on = false;
  run(s, {}, 120);
  assert.equal(s.outcome.how, 'death');
  assert.equal(s.outcome.cause, 'lost');
});

test('breathing the hypoxic bottom gas at the surface knocks you out', ()=>{
  const s = S.createSim('shaft', cave, 1);
  S.step(s, cave, {press:['2']}, DT);
  run(s, {}, 60);
  assert.equal(s.outcome.cause, 'hypoxia');
});

test('surfacing through a ceiling is decompression sickness; a clean dive scores every check', ()=>{
  const bent = S.createSim('basin', cave, 1);
  place(bent, 15, 28); run(bent, {}, 30*60);
  place(bent, 0, .5); S.step(bent, cave, {press:['E']}, DT);
  assert.equal(bent.outcome.cause, 'dcs');

  const s = S.createSim('basin', cave, 1);
  place(s, -10.2, 3); S.step(s, cave, {press:['R']}, DT);
  place(s, 17.9, 28); S.step(s, cave, {press:['E']}, DT);
  assert.equal(s.items.find(i=>i.id==='logger').state, 'carried');
  place(s, -9.9, 3.2); S.step(s, cave, {press:['R']}, DT);
  run(s, {calm:true}, 120);
  place(s, -3, .5); S.step(s, cave, {press:['E']}, DT);
  assert.equal(s.outcome.cause, 'safe');
  assert.ok(s.objectives.every(o=>o.done));
});

test('the simulation is deterministic for the same seed and inputs', ()=>{
  const a = S.createSim('mouth', cave, 42), b = S.createSim('mouth', cave, 42);
  for (const s of [a, b]) { run(s, {mx:1, my:1}, 300); run(s, {mx:1, fast:true}, 200); }
  assert.equal(a.x, b.x); assert.equal(a.y, b.y); assert.deepEqual(a.gases, b.gases); assert.deepEqual([...a.silt], [...b.silt]);
});
