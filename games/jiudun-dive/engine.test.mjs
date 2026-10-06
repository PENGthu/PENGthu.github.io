import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, advance, switchGas, planAscent, ceilingOf, surfaceGF, cnsRate, bestGas, pAmb, PLANS} from './engine.mjs';
import {caveAt, LINE_LENGTH} from './cave.mjs';

const descend = (s, depth, speed=2) => { while (s.depth<depth-.1 && !s.outcome) s = advance(s, {move:1, speed}, 1); return s; };

test('advance is pure and deterministic', ()=>{
  const s = createGame({plan:'mouth'}), copy = structuredClone(s);
  const a = advance(s, {move:1, speed:1}, 90), b = advance(s, {move:1, speed:1}, 90);
  assert.deepEqual(s, copy); assert.deepEqual(a, b);
  assert.equal(a.t, 90); assert.ok(a.depth>0 && a.gases[0].bar<s.gases[0].bar);
});

test('cave line runs from the surface to the 277 m end of the guideline', ()=>{
  assert.equal(caveAt(0).d, 0); assert.equal(caveAt(LINE_LENGTH).d, 277);
  assert.equal(caveAt(5).overhead, false); assert.equal(caveAt(LINE_LENGTH/2).overhead, true);
});

test('fresh dive has no ceiling; long air dive at 30 m creates a decompression obligation', ()=>{
  let s = createGame();
  assert.equal(ceilingOf(s.n2, s.he, s.gf, 0), 0);
  s = descend(s, 30);
  const plan = planAscent(s);
  assert.ok(plan.noStop>=8 && plan.noStop<=20, `no-stop time ${plan.noStop}`);
  s = advance(s, {move:0}, 25*60);
  assert.ok(s.ceiling>3);
  const deco = planAscent(s);
  assert.ok(deco.stops.length>0 && deco.stops.every(x=>x.depth%3===0));
  assert.ok(deco.tts>s.depth/9);
});

test('ascent plan picks the richest gas within ppO2 limits', ()=>{
  const {gases} = PLANS.shaft;
  assert.equal(gases[bestGas(gases, 120)].name, 'Tx 10/70');
  assert.equal(gases[bestGas(gases, 21)].name, 'EAN50');
  assert.equal(gases[bestGas(gases, 6)].name, '氧气');
  let s = createGame({plan:'shaft'});
  s = descend(s, 22, 1); s = switchGas(s, 1).state; s = descend(s, 120, 1);
  s = advance(s, {move:0}, 5*60);
  const plan = planAscent(s);
  assert.ok(plan.stops.some(x=>x.gas==='氧气' && x.depth<=6));
  assert.deepEqual(plan.short, []);
});

test('breathing a hypoxic mix at the surface ends the dive', ()=>{
  let s = switchGas(createGame({plan:'shaft'}), 1).state;
  assert.equal(s.log.at(-1).level, 'danger');
  s = advance(s, {}, 30);
  assert.equal(s.outcome.kind, 'hypoxia');
  assert.deepEqual(advance(s, {move:1}, 10), s);
});

test('running the active cylinder dry drowns the diver unless they switch', ()=>{
  let s = descend(createGame({plan:'mouth'}), 20);
  s.gases[0].bar = 0;
  const switched = advance(switchGas(s, 1).state, {}, 40);
  assert.equal(switched.outcome, null);
  assert.equal(advance(s, {}, 40).outcome.kind, 'drowned');
});

test('surfacing through a ceiling is decompression sickness, a clean ascent is safe', ()=>{
  let s = advance(descend(createGame(), 30), {move:0}, 30*60);
  let bolt = s;
  while (!bolt.outcome) bolt = advance(bolt, {move:-1, speed:2}, 5);
  assert.equal(bolt.outcome.kind, 'dcs'); assert.ok(bolt.outcome.surfaceGF>100);
  let safe = descend(createGame(), 18, 1);
  safe = advance(safe, {move:0}, 10*60);
  while (!safe.outcome) safe = advance(safe, {move:safe.depth<6 && safe.t<17*60 ? 0 : -1, speed:0}, 5);
  assert.equal(safe.outcome.kind, 'surfaced');
  assert.ok(safe.outcome.surfaceGF<100);
});

test('oxygen clock accelerates above 1.6 bar and pressure follows fresh water', ()=>{
  assert.equal(cnsRate(.4), 0);
  assert.ok(cnsRate(1.4)<cnsRate(1.6) && cnsRate(1.6)<cnsRate(2));
  assert.ok(Math.abs(pAmb(10)-1.994)<.001);
  assert.ok(surfaceGF(createGame().n2, createGame().he)===0);
});
