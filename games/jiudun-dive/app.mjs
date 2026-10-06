import {Cave, lineLength} from './cave.mjs';
import {MISSIONS} from './missions.mjs';
import * as S from './sim.mjs';
import * as D from './deco.mjs';
import {createRenderer} from './render.mjs';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'jiudun-dive:v2';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) ?? {}; } catch { return {}; } },
  set(v) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch {} }
};
const fmt = t => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const esc = t => String(t).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const cave = new Cave();
const renderer = createRenderer($('view'), cave);
renderer.warm(-16, -10, 32, 14);

let mode = 'title', missionId = 'basin', sim = S.createSim('basin', cave, 1), paused = false, mapOpen = false;
let last = performance.now(), plan = null, planAt = 0, hudAt = 0, mapAt = 0, endAt = null, seenLog = 0, seenSay = 0, sayTimer = 0;
let view = null, mouse = null, rightDown = false;
const keys = new Set(), press = [], touch = {mx:0, my:0, grip:false, fast:false, calm:false};
const coarse = matchMedia('(pointer: coarse)').matches;
const cache = {};
const setHTML = (el, html) => { if (cache[el.id] !== html) { cache[el.id] = html; el.innerHTML = html; } };

// --- screens ----------------------------------------------------------------
function show(id) {
  for (const s of ['title','brief','debrief','pause','map']) $(s).hidden = s!==id;
  const diving = mode==='dive';
  $('hud').hidden = !diving; $('touch').hidden = !(diving && coarse);
}
function showTitle() {
  mode = 'title'; paused = false; mapOpen = false;
  sim = S.createSim('basin', cave, 1);
  const prog = store.get();
  $('missions').innerHTML = Object.entries(MISSIONS).map(([id,m],k)=>{
    const p = prog[id];
    return `<li><button data-mission="${id}"><b>${String(k+1).padStart(2,'0')}　${m.name}</b><span class="m-tag">${m.tag}</span>
      <span class="m-sub">${m.depthLabel} · ${m.mix}</span>
      ${p ? `<span class="m-best">下过 ${p.dives} 次 · 最好 ${p.best}/8${p.safe ? ' · 已完成' : ''}</span>` : ''}</button></li>`;
  }).join('');
  show('title');
}
function openBrief(id) {
  missionId = id; mode = 'brief';
  const m = MISSIONS[id];
  $('brief-tag').textContent = `${m.tag} · ${m.depthLabel}`;
  $('brief-name').textContent = m.name;
  $('brief-quote').textContent = `${m.from}：“${m.quote}”`;
  $('brief-text').textContent = m.brief;
  $('brief-gear').innerHTML = [
    ...m.gases.map(g=>`<li>${g.name} · ${g.vol} L ${g.bar} bar · ${g.role==='back' ? '底气' : '侧挂瓶'}${g.o2<.18 ? ' · 低氧，浅处不能吸' : ''}${g.o2>=.5 ? ` · 最大深度 ${Math.floor(D.modOf(g))} m` : ''}</li>`),
    `<li>线轮 ${m.reel} 米 · 主灯 + 两支备用灯</li>`, `<li>梯度因子 GF ${m.gf.join('/')}</li>`
  ].join('');
  $('brief-goals').innerHTML = m.objectives.map(o=>`<li>${o.text}</li>`).join('');
  $('brief-tips').innerHTML = m.tips.map(t=>`<li>${t}</li>`).join('');
  show('brief');
  $('dive-button').focus();
}
function startDive(id=missionId) {
  missionId = id; mode = 'dive'; paused = false; mapOpen = false; endAt = null; plan = null; planAt = 0;
  sim = S.createSim(id, cave, (Date.now() % 1e9) | 0);
  seenLog = sim.log.length; seenSay = 0;
  $('ticker').innerHTML = ''; $('narration').hidden = true;
  for (const k in cache) delete cache[k];
  show(null);
  narrate(`${MISSIONS[id].name}。${MISSIONS[id].tips[0]}`);
}
function togglePause(force) {
  if (mode!=='dive') return;
  paused = force ?? !paused;
  if (paused) { keys.clear(); show('pause'); } else show(mapOpen ? 'map' : null);
}
function toggleMap() {
  if (mode!=='dive' || paused) return;
  mapOpen = !mapOpen; show(mapOpen ? 'map' : null); mapAt = 0;
}

$('missions').addEventListener('click', e=>{ const b = e.target.closest('[data-mission]'); if (b) openBrief(b.dataset.mission); });
$('brief-back').addEventListener('click', showTitle);
$('dive-button').addEventListener('click', ()=>startDive());
$('resume').addEventListener('click', ()=>togglePause(false));
$('restart').addEventListener('click', ()=>startDive());
$('quit').addEventListener('click', showTitle);
$('db-again').addEventListener('click', ()=>startDive());
$('db-menu').addEventListener('click', showTitle);
for (const id of ['help-open','help-open-2']) $(id).addEventListener('click', ()=>$('help').showModal());

// --- input ----------------------------------------------------------------
const ACTIONS = {KeyR:'R', KeyE:'E', KeyG:'G', KeyF:'F', KeyX:'X', KeyL:'L', Digit1:'1', Digit2:'2', Digit3:'3', Digit4:'4'};
addEventListener('keydown', e=>{
  if (e.target.closest?.('dialog') || e.metaKey || e.ctrlKey) return;
  if (mode==='brief') { if (e.key==='Enter') startDive(); else if (e.key==='Escape') showTitle(); return; }
  if (mode==='debrief') { if (e.key==='Enter') startDive(); return; }
  if (mode!=='dive') return;
  if (e.code==='Escape') { togglePause(); return; }
  if (paused) return;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code==='KeyM' && !e.repeat) return toggleMap();
  if (e.code==='KeyH' && !e.repeat) return $('help').showModal();
  if (ACTIONS[e.code] && !e.repeat) press.push(ACTIONS[e.code]);
  keys.add(e.code);
});
addEventListener('keyup', e=>keys.delete(e.code));
addEventListener('blur', ()=>{ keys.clear(); rightDown = false; });
const canvas = $('view');
canvas.addEventListener('pointermove', e=>{ if (e.pointerType==='mouse') mouse = {x:e.clientX, y:e.clientY}; });
canvas.addEventListener('pointerdown', e=>{ if (e.pointerType==='mouse' && e.button===2) rightDown = true; });
addEventListener('pointerup', e=>{ if (e.button===2) rightDown = false; });
canvas.addEventListener('contextmenu', e=>e.preventDefault());

// Touch: a floating stick on the left, hold buttons on the right.
const zone = $('stick-zone'), stick = $('stick');
let stickId = null, origin = null;
zone.addEventListener('pointerdown', e=>{ stickId = e.pointerId; origin = {x:e.clientX, y:e.clientY}; zone.setPointerCapture(e.pointerId);
  stick.style.left = `${e.clientX}px`; stick.style.top = `${e.clientY - zone.getBoundingClientRect().top}px`; stick.classList.add('on'); });
zone.addEventListener('pointermove', e=>{
  if (e.pointerId!==stickId) return;
  let dx = (e.clientX-origin.x)/50, dy = (e.clientY-origin.y)/50; const l = Math.hypot(dx,dy);
  if (l>1) { dx /= l; dy /= l; }
  touch.mx = Math.abs(dx)<.15 ? 0 : dx; touch.my = Math.abs(dy)<.15 ? 0 : dy;
  stick.firstElementChild.style.transform = `translate(${dx*36}px, ${dy*36}px)`;
});
const endStick = e=>{ if (e.pointerId!==stickId) return; stickId = null; touch.mx = touch.my = 0; stick.classList.remove('on'); stick.firstElementChild.style.transform = ''; };
zone.addEventListener('pointerup', endStick); zone.addEventListener('pointercancel', endStick);
for (const b of document.querySelectorAll('[data-hold]')) {
  const set = v => e=>{ e.preventDefault(); touch[b.dataset.hold] = v; b.classList.toggle('on', v); };
  b.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup','pointercancel','pointerleave']) b.addEventListener(ev, set(false));
}
for (const b of document.querySelectorAll('[data-tap]')) b.addEventListener('click', ()=>b.dataset.tap==='M' ? toggleMap() : togglePause());
$('prompts').addEventListener('pointerdown', e=>{ const b = e.target.closest('[data-key]'); if (b && b.dataset.key!=='Space') { e.preventDefault(); press.push(b.dataset.key); } });

function gather() {
  const k = c => keys.has(c);
  const mx = (k('KeyD')||k('ArrowRight') ? 1 : 0) - (k('KeyA')||k('ArrowLeft') ? 1 : 0) + touch.mx;
  const my = (k('KeyS')||k('ArrowDown') ? 1 : 0) - (k('KeyW')||k('ArrowUp') ? 1 : 0) + touch.my;
  let aimX = null, aimY = null;
  if (mouse && view) { aimX = (mouse.x-view.X(0))/view.scale - sim.x; aimY = (mouse.y-view.Y(0))/view.scale - sim.y; }
  else if (mx || my) { aimX = mx; aimY = my; }
  return {mx, my, aimX, aimY, press:press.splice(0),
    fast: k('ShiftLeft') || k('ShiftRight') || touch.fast,
    grip: k('Space') || touch.grip,
    calm: k('KeyQ') || touch.calm};
}

// --- HUD ------------------------------------------------------------------
function narrate(text, kind='info') {
  const n = $('narration');
  n.textContent = text; n.className = `narration ${kind}`; n.hidden = false;
  clearTimeout(sayTimer); sayTimer = setTimeout(()=>{ n.hidden = true; }, 2600 + text.length*110);
}
function ticker(e) {
  const t = $('ticker'), div = document.createElement('div');
  div.className = e.level; div.innerHTML = `<time>${fmt(e.t)}</time>${esc(e.text)}`;
  t.append(div); while (t.children.length>5) t.firstElementChild.remove();
}
function drain() {
  while (seenSay<sim.says.length) { const m = sim.says[seenSay++]; narrate(m.text, m.kind); }
  while (seenLog<sim.log.length) { const e = sim.log[seenLog++]; if (e.type!=='objective') ticker(e); }
}

function hud(now) {
  const s = sim, d = S.depthOf(s), g = s.gases[s.active], back = S.backGas(s), turn = S.turnBar(back);
  if (!plan || now-planAt>1000) {
    plan = D.planAscent({depth:d, n2:s.n2, he:s.he, anchor:s.anchor, gf:s.gf, gases:s.gases, active:s.active, sac:s.sac, usable:h=>h.carried && h.bar>5});
    planAt = now;
  }
  const po2 = D.ppO2(g, d);
  const warn = s.noGas>0 ? '吸不到气了！' : po2>1.62 ? `氧分压 ${po2.toFixed(2)}，太高！` : po2<D.MIN_PPO2 ? `氧分压 ${po2.toFixed(2)}，缺氧！`
    : d<s.ceiling-.3 ? `浅于减压上限！回到 ${Math.ceil(s.ceiling/3)*3} 米` : s.ascent>10.5 && d>3 ? `上升太快 ${Math.round(s.ascent)} 米/分` : !s.light.on ? '灯灭了 · 按 L' : '';
  const breath = s.panic>0 ? '慌乱' : s.stress>.6 ? '急促' : s.stress>.3 ? '紧张' : '平稳';
  setHTML($('computer'), `
    <div class="row1"><span>深度</span><span>潜水时间</span></div>
    <div class="row1"><span class="depth">${d.toFixed(1)}<small>m</small></span><span class="time">${fmt(s.t)}</span></div>
    <div class="gasbar ${back.bar<turn ? 'low' : ''}"><i style="width:${back.bar/back.bar0*100}%"></i><u style="left:${turn/back.bar0*100}%"></u></div>
    <div class="gasline"><span><b>${Math.round(back.bar)}</b> bar</span><span>返航 ${turn}</span></div>
    <div class="chips">${s.gases.map((h,i)=>{ const p = D.ppO2(h,d), bad = h.carried && (p>1.62 || p<D.MIN_PPO2);
      return `<span class="chip ${i===s.active ? 'active' : ''} ${h.carried ? '' : 'off'} ${bad ? 'bad' : ''}">${i+1} ${h.name} ${Math.round(h.bar)}</span>`; }).join('')}</div>
    <div class="meta">${s.ceiling>0 ? `<span class="deco on">上限 ${Math.ceil(s.ceiling/3)*3} m · 出水 ${Math.ceil(plan.tts)}′</span>` : `<span class="deco">免减压 ${plan.noStop>=99 ? '99+' : plan.noStop ?? 0}′</span>`}
      <span>${s.laying>=0 ? `放线 · 剩 ${Math.round(s.reelLeft)} m` : `线轮 ${Math.round(s.reel)} m`}</span></div>
    <div class="meta"><span>ppO₂ ${po2.toFixed(2)}</span><span>${s.light.on ? (s.light.mode==='primary' ? '主灯' : `备用灯 · 余 ${s.light.backups}`) : '灯灭了'}</span><span>呼吸 ${breath}</span></div>
    ${warn ? `<div class="warnline danger">${warn}</div>` : ''}`);
  const m = MISSIONS[s.mission], relics = s.items.filter(i=>i.relic && i.state==='carried').length;
  setHTML($('objectives'), `<span class="tag">${m.tag}</span><h4>${m.name}</h4>
    <ol>${s.objectives.map(o=>`<li class="${o.done ? 'done' : ''}">${o.text}</li>`).join('')}</ol>
    <div class="relic">洞里的东西 ${relics}/3 · 带出水才算</div>`);
  setHTML($('prompts'), S.prompts(s, cave).slice(0, 3).map(p=>`<button data-key="${p.key}"><kbd>${p.key==='Space' ? '空格' : p.key}</kbd>${esc(p.label)}</button>`).join(''));
}

// --- debrief --------------------------------------------------------------
const KEY_EVENTS = new Set(['tie','tieOff','cave','turn','pastTurn','pickup','stuck','squeeze','stageOff','stageOn','siltFall','lightFail','light',
  'panic','noGas','switch','ceiling','rapid','hypoxia','hyperoxia','gasLow','reelOut','death','surface']);
function showDebrief() {
  mode = 'debrief'; endAt = null; mapOpen = false;
  const s = sim, o = s.outcome, m = MISSIONS[s.mission];
  let events = s.log.filter(e=>KEY_EVENTS.has(e.type));
  if (events.length>18) events = [...events.slice(0,8), ...events.slice(-10)];
  $('db-eyebrow').textContent = `${m.name} · ${o.how==='death' ? '事故复盘' : '潜后复盘'}`;
  $('db-title').textContent = o.title;
  $('db-text').textContent = o.how==='death' ? `${o.text} 下面是这一潜的时间线。` : o.text;
  renderer.drawMap($('db-map'), s, {whole:true, track:true, events});
  const laid = s.lines.filter(l=>l.kind==='own').reduce((a,l)=>a+lineLength(l.pts), 0) + (s.laying>=0 ? 0 : 0);
  const stat = (k,v)=>`<div><dt>${k}</dt><dd>${v}</dd></div>`;
  $('db-stats').innerHTML = stat('最大深度', `${s.stats.maxDepth.toFixed(1)} m`) + stat('潜水时间', fmt(o.t)) + stat('放线', `${Math.round(laid)} m`)
    + stat('撞墙', `${s.stats.wallHits} 次`) + stat('最低能见度', `${s.stats.minVis.toFixed(1)} m`) + stat('出水 GF', `${Math.round(o.surfaceGF)}%`);
  $('db-timeline').innerHTML = events.map(e=>`<li class="${e.level}"><time>${fmt(e.t)}</time>${esc(e.place)} · ${Math.round(e.depth)} m · ${esc(e.text)}</li>`).join('');
  $('db-checks').innerHTML = o.checks.map(c=>`<li class="${c.ok ? '' : 'bad'}">${esc(c.text)}</li>`).join('');
  $('db-relics').textContent = o.relics.length ? `带出水的东西：${o.relics.join('、')}` : o.how==='death' ? '' : '没带出别的东西。';
  const prog = store.get(), p = prog[s.mission] ?? {dives:0, best:0, safe:false};
  prog[s.mission] = {dives:p.dives+1, best:Math.max(p.best, o.score), safe:p.safe || o.cause==='safe'};
  store.set(prog);
  show('debrief');
}

// --- loop -----------------------------------------------------------------
function frame(now) {
  const dt = Math.min(.05, (now-last)/1000); last = now;
  if (mode==='dive' && !paused) {
    const inp = gather();
    const warp = inp.calm && Math.hypot(sim.vx, sim.vy)<.05 && !sim.outcome && sim.panic<=0 ? 6 : 1;
    $('warp').hidden = warp===1;
    S.step(sim, cave, inp, dt*S.TIME_SCALE*warp);
    drain();
    if (sim.outcome && endAt==null) endAt = now + (sim.outcome.how==='death' ? 3500 : 1800);
    if (endAt!=null && now>=endAt) showDebrief();
  }
  view = renderer.draw(sim, {time:now/1000, dt, look:mode==='dive' && (keys.has('KeyZ') || rightDown), tileBudget:mode==='dive' ? 2 : 1});
  if (mode==='dive' && now-hudAt>100) { hud(now); hudAt = now; }
  if (mapOpen && now-mapAt>400) { renderer.drawMap($('map-canvas'), sim); mapAt = now; }
  requestAnimationFrame(frame);
}
addEventListener('resize', ()=>renderer.resize());
if (location.hash==='#debug') window.jiudun = {cave, keys, press, get sim() { return sim; }, start:startDive};
showTitle();
requestAnimationFrame(frame);
