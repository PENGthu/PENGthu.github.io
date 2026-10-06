import {PLANS, VERSION, createGame, advance, switchGas, planAscent, bestGas, ppO2, modOf, endOf, turnBar, surfaceGF, SAFE_PPO2, MIN_PPO2} from './engine.mjs';
import {createRenderer, visibility} from './render.mjs';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'jiudun-dive:v'+VERSION, WARPS = [1,5,20,60,180];
const store = {
  get() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } },
  set(v) { try { v ? localStorage.setItem(SAVE_KEY, JSON.stringify(v)) : localStorage.removeItem(SAVE_KEY); } catch {} }
};

const renderer = createRenderer($('view'));
let chosen = 'basin', state = null, running = false, paused = false, map = false;
let warp = 1, speed = 1, latch = 0, keys = {up:false, down:false};
let acc = 0, last = performance.now(), plan = null, planAt = 0, hudAt = 0, saveAt = 0, seenLog = 0, toastTimer = 0;

const fmtTime = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const fmtMin = m => m>=60 ? `${Math.floor(m/60)} h ${Math.round(m%60)} min` : `${Math.ceil(m)} min`;

// --- Start screen -------------------------------------------------------
function renderPlans() {
  $('plans').innerHTML = Object.entries(PLANS).map(([key,p])=>`
    <button class="plan" data-plan="${key}" aria-pressed="${key===chosen}">
      <b>${p.name}</b><span class="sub">${p.subtitle}</span><p>${p.brief}</p>
      <span class="tags">${p.gases.map(g=>`<span>${g.name} ${g.vol}L</span>`).join('')}<span>GF ${p.gf.join('/')}</span></span>
    </button>`).join('');
}
$('plans').addEventListener('click', e=>{
  const b = e.target.closest('[data-plan]'); if (!b) return;
  chosen = b.dataset.plan;
  for (const el of $('plans').children) el.setAttribute('aria-pressed', el===b);
});

function showStart() {
  running = false;
  const saved = store.get();
  $('resume-button').hidden = !(saved && saved.version===VERSION && !saved.outcome);
  $('start-screen').hidden = false; $('end-screen').hidden = true;
  renderPlans();
}

function start(s) {
  state = s; chosen = s.plan; running = true; paused = false; latch = 0; acc = 0; seenLog = s.log.length; plan = null;
  setWarp(1); setSpeed(s.speed);
  $('start-screen').hidden = true; $('end-screen').hidden = true; $('toast').hidden = true;
  $('gf-label').textContent = `GF ${s.gf.join('/')}`;
  updatePause(); refreshHud(true);
}

// --- Controls -----------------------------------------------------------
function setWarp(w) {
  warp = w;
  for (const b of $('warp').children) b.classList.toggle('on', Number(b.dataset.warp)===w);
}
function setSpeed(v) {
  speed = v;
  for (const b of $('speed').children) b.classList.toggle('on', Number(b.dataset.speed)===v);
}
function setLatch(v) {
  latch = v;
  $('up-button').classList.toggle('on', v<0); $('down-button').classList.toggle('on', v>0);
}
function updatePause() { $('pause-button').textContent = paused ? '继续' : '暂停'; }
const moveInput = () => keys.up && !keys.down ? -1 : keys.down && !keys.up ? 1 : latch;

$('warp').addEventListener('click', e=>{ const b=e.target.closest('[data-warp]'); if (b) setWarp(Number(b.dataset.warp)); });
$('speed').addEventListener('click', e=>{ const b=e.target.closest('[data-speed]'); if (b) setSpeed(Number(b.dataset.speed)); });
$('up-button').addEventListener('click', ()=>setLatch(latch<0 ? 0 : -1));
$('down-button').addEventListener('click', ()=>setLatch(latch>0 ? 0 : 1));
$('stop-button').addEventListener('click', ()=>setLatch(0));
// The gas list is rebuilt continuously, so act on press rather than click.
$('gases').addEventListener('pointerdown', e=>{ const b=e.target.closest('[data-gas]'); if (b) doSwitch(Number(b.dataset.gas)); });
$('map-button').addEventListener('click', ()=>{ map=!map; $('map-button').setAttribute('aria-pressed', map); });
$('pause-button').addEventListener('click', ()=>{ paused=!paused; updatePause(); });
$('help-button').addEventListener('click', ()=>$('help-dialog').showModal());
$('restart-button').addEventListener('click', showStart);
$('start-button').addEventListener('click', ()=>start(createGame({plan:chosen})));
$('resume-button').addEventListener('click', ()=>{ const s=store.get(); if (s) start(s); });
$('again-button').addEventListener('click', ()=>start(createGame({plan:state.plan})));
$('plan-button').addEventListener('click', showStart);

function doSwitch(i) {
  if (!running || !state) return;
  const r = switchGas(state, i);
  if (!r.error) { state = r.state; refreshHud(true); }
}

const KEYMAP = {ArrowUp:'up', w:'up', W:'up', ArrowDown:'down', s:'down', S:'down'};
addEventListener('keydown', e=>{
  if (e.target.closest?.('dialog') || e.metaKey || e.ctrlKey) return;
  if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = true; setLatch(0); e.preventDefault(); return; }
  if (e.repeat) return;
  if (e.key===' ') { setLatch(0); e.preventDefault(); }
  else if ('123'.includes(e.key) && e.key) setSpeed(Number(e.key)-1);
  else if (e.key==='t' || e.key==='T') setWarp(WARPS[(WARPS.indexOf(warp)+1)%WARPS.length]);
  else if (e.key==='m' || e.key==='M') $('map-button').click();
  else if (e.key==='p' || e.key==='P') $('pause-button').click();
  else if ((e.key==='g' || e.key==='G') && state) doSwitch(bestGas(state.gases, state.depth, state.active));
});
addEventListener('keyup', e=>{ if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; });
addEventListener('blur', ()=>{ keys.up = keys.down = false; });

// --- HUD ----------------------------------------------------------------
function toast(text, level) {
  const t = $('toast');
  t.textContent = text; t.className = `toast ${level}`; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>{ t.hidden = true; }, 3500);
}

function refreshHud(force=false) {
  const s = state, now = performance.now();
  if (!s) return;
  if (force || now-planAt > 400) { plan = planAscent(s); planAt = now; }
  $('depth').textContent = s.depth.toFixed(1);
  $('runtime').textContent = fmtTime(s.t);
  const box = $('ceiling-box');
  box.classList.toggle('active', s.ceiling>0);
  box.classList.toggle('violated', s.depth < s.ceiling-.3);
  $('ceiling').textContent = s.ceiling>0 ? `${Math.ceil(s.ceiling/3)*3} m` : plan.noStop!=null ? `免减压 ${plan.noStop>=99?'99+':plan.noStop}′` : '无';
  $('tts').textContent = fmtMin(plan.tts);

  const best = bestGas(s.gases, s.depth, s.active);
  $('gases').innerHTML = s.gases.map((g,i)=>{
    const p = ppO2(g, s.depth), unsafe = p>SAFE_PPO2+.02 || p<MIN_PPO2, minD = Math.max(0, Math.ceil(modOf(g, MIN_PPO2)));
    const cls = ['gas', i===s.active&&'active', unsafe&&'unsafe', i===best&&'best', g.bar<30&&'low'].filter(Boolean).join(' ');
    const turn = g.role==='bottom' ? `<u style="left:${turnBar(g)/g.bar0*100}%" title="三分之一折返压力"></u>` : '';
    return `<button class="${cls}" data-gas="${i}" aria-pressed="${i===s.active}">
      <span class="name">${i===s.active?'● ':''}${g.name}</span><span class="bar">${Math.round(g.bar)} bar</span>
      <span class="meter"><i style="width:${g.bar/g.bar0*100}%"></i>${turn}</span>
      <span class="meta"><span class="po2">ppO₂ ${p.toFixed(2)}</span> · MOD ${Math.floor(modOf(g))} m${minD>0?` · ≥${minD} m`:''} · ${g.vol}L</span>
    </button>`;
  }).join('');

  const stops = plan.stops.slice(0, 12);
  $('deco').innerHTML = (stops.length
    ? `<table>${stops.map(x=>`<tr><td>${x.depth} m</td><td>${x.min} min</td><td>${x.gas}</td></tr>`).join('')}</table>${plan.stops.length>12?`<div>… 另有 ${plan.stops.length-12} 站</div>`:''}`
    : `<div class="ok">无需停留，以 ≤9 m/min 上升</div>`)
    + `<div>出水总时间 ${fmtMin(plan.tts)} · 出水 GF ${Math.round(surfaceGF(s.n2,s.he))}%</div>`
    + (plan.short.length ? `<div class="short">气量不足：${plan.short.join('、')}</div>` : '');

  const g = s.gases[s.active], p = ppO2(g, s.depth), end = endOf(g, s.depth), vis = visibility(s);
  const cell = (k,v,lvl='') => `<div class="${lvl}"><dt>${k}</dt><dd>${v}</dd></div>`;
  $('vitals').innerHTML = [
    cell('氧分压 ppO₂', p.toFixed(2), p>1.6||p<MIN_PPO2?'danger':p>1.4?'warn':''),
    cell('CNS', `${Math.round(s.cns)}%`, s.cns>80?'danger':s.cns>50?'warn':''),
    cell('等效麻醉深度', `${Math.round(end)} m`, end>40?'danger':end>30?'warn':''),
    cell('上升速率', `${s.ascentRate>0?'↑':'↓'} ${Math.abs(s.ascentRate).toFixed(0)} m/min`, s.ascentRate>10.5?'danger':''),
    cell('能见度', `${vis.toFixed(1)} m`, vis<3?'danger':vis<6?'warn':''),
    cell('扬沙', `${Math.round(s.silt*100)}%`, s.silt>.6?'danger':s.silt>.3?'warn':''),
    cell('最大深度', `${s.maxDepth.toFixed(1)} m`),
    cell('灯电量', `${Math.round(s.battery)}%`, s.battery<20?'warn':'')
  ].join('');

  $('log').innerHTML = s.log.slice(-40).map(l=>`<li class="${l.level}"><time>${fmtTime(l.t)}</time>${l.text}</li>`).join('');
}

function showEnd() {
  const o = state.outcome;
  $('end-eyebrow').textContent = o.kind==='surfaced' ? '潜水结束 · 安全' : '潜水结束 · 事故';
  $('end-title').textContent = o.title;
  $('end-text').textContent = o.text;
  const stat = (k,v)=>`<div><dt>${k}</dt><dd>${v}</dd></div>`;
  $('end-stats').innerHTML = stat('计划', PLANS[state.plan].name) + stat('最大深度', `${state.maxDepth.toFixed(1)} m`)
    + stat('潜水时间', fmtTime(o.runtime)) + stat('出水 GF', `${Math.round(o.surfaceGF)}%`) + stat('最高 CNS', `${Math.round(state.maxCns)}%`);
  $('end-checks').innerHTML = o.checks.map(c=>`<li class="${c.ok?'':'bad'}">${c.text}</li>`).join('');
  $('end-screen').hidden = false;
}

// --- Main loop ----------------------------------------------------------
function frame(now) {
  const dt = Math.min(.25, (now-last)/1000); last = now;
  if (running && !paused && state && !state.outcome) {
    acc += dt*warp;
    const n = Math.floor(acc);
    if (n>0) {
      acc -= n;
      state = advance(state, {move:moveInput(), speed}, n);
      const fresh = state.log.slice(seenLog); seenLog = state.log.length;
      const worst = fresh.find(l=>l.level==='danger') ?? fresh.find(l=>l.level==='warn') ?? fresh.find(l=>l.level==='good');
      if (worst) { toast(worst.text, worst.level); if (worst.level!=='good' && warp>1) setWarp(1); }
      if (state.outcome) { setLatch(0); refreshHud(true); store.set(null); showEnd(); }
    }
    if (now-hudAt > 120) { refreshHud(); hudAt = now; }
    if (now-saveAt > 3000) { store.set(state); saveAt = now; }
  }
  renderer.draw(state ?? createGame({plan:chosen}), {map, time:now/1000});
  requestAnimationFrame(frame);
}

addEventListener('resize', ()=>renderer.resize());
addEventListener('pagehide', ()=>{ if (running && state && !state.outcome) store.set(state); });
showStart();
requestAnimationFrame(frame);
