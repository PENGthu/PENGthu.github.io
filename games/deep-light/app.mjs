import {createGame,decode,encode,update,buy,sell,useSupply,ORES,CORES,EQUIPMENT,SUPPLIES,capacity,cargoWeight,cargoValue,maxAir,maxHP,depth,zone} from './engine.mjs';
import {Renderer} from './render.mjs';
const $=id=>document.getElementById(id), KEY='deep-light-save-v1', input={}, dialogs=[...document.querySelectorAll('dialog')];
let game=createGame(), started=false, shopTab='equipment', sound=false, audio=null, last=0, uiTimer=0, saveTimer=0, lowWarning=false, unavailable=false, tapStep=null;
let stored=null;try{stored=decode(localStorage.getItem(KEY));}catch{unavailable=true;}
if(stored)game=stored;
const renderer=new Renderer($('game'),$('minimap'));
function paused(){return !started || dialogs.some(d=>d.open);}
function clearInput(){for(const key in input)input[key]=false;tapStep=null;document.querySelectorAll('.pressed').forEach(el=>el.classList.remove('pressed'));}
function open(id){clearInput();const d=$(id);if(!d.open)d.showModal();}
function close(id){$(id).close();clearInput();last=performance.now();if(started)$('game').focus({preventScroll:true});}
function save(){
  if(!started)return;try{localStorage.setItem(KEY,encode(game));$('save-state').textContent='已自动保存';setTimeout(()=>{$('save-state').textContent='本机存档';},2000);unavailable=false;}
  catch{unavailable=true;$('save-state').textContent='存档不可用';}
}
function tone(kind){if(!sound)return;try{audio??=new AudioContext();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=kind==='boom'?'sawtooth':'triangle';o.frequency.setValueAtTime(kind==='ore'?620:kind==='core'?890:kind==='warn'?175:kind==='boom'?70:420,audio.currentTime);o.frequency.exponentialRampToValueAtTime(kind==='boom'?30:270,audio.currentTime+.16);g.gain.setValueAtTime(.04,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.21);}catch{sound=false;}}
function toast(text,kind='info',duration=3500){const el=document.createElement('div');el.className='toast '+kind;el.textContent=text;$('toasts').append(el);while($('toasts').children.length>3)$('toasts').firstElementChild.remove();setTimeout(()=>el.remove(),duration);tone(kind);}
function processEvents(){for(const e of game.events.splice(0)){toast(e.text,e.kind,e.kind==='rescue'?6500:3500);if(e.kind==='win')showWin();} }
function stat(id,text){$(id).textContent=text;}
function renderHUD(){
  const s=game,weight=cargoWeight(s);stat('hp-label',`${Math.ceil(Math.max(0,s.p.hp))} / ${maxHP(s)}`);stat('air-label',`${Math.ceil(s.p.air)} / ${maxAir(s)}`);
  $('hp-fill').style.width=Math.max(0,100*s.p.hp/maxHP(s))+'%';$('air-fill').style.width=100*s.p.air/maxAir(s)+'%';
  stat('depth',depth(s));stat('coins',s.coins.toLocaleString());stat('bag-load',`${weight} / ${capacity(s)}`);$('bag-fill').style.width=100*weight/capacity(s)+'%';stat('bag-value',cargoValue(s).toLocaleString());stat('best-depth',`最深 ${s.stats.bestDepth}m`);
  for(const key in SUPPLIES)stat(key,s.supplies[key]);
  stat('zone',s.surface?'营地 · 松风矿站':zone(s.p.y));$('camp-btn').hidden=!s.surface;
  stat('scene-hint',s.surface?'↓ 向下挖掘 · 营地自动补满生命与氧气':s.p.air<25?'氧气不足！2 补氧 · 3 安全回城':s.p.y>104?'空格攻击 · 1 炸弹 · 避开红色震波':s.stats.mined<10?'矿石藏在发光的土块里 · 3 带矿石回城':'↑ 喷气上升 · 1 炸弹 · 2 补氧 · 3 回城');
  $('boss-hud').hidden=s.p.y<=104||s.boss.dead;$('boss-fill').style.width=100*s.boss.hp/s.boss.maxHp+'%';stat('boss-label',s.cores.every(Boolean)?'地心守卫 · 护盾已解除':'地心守卫 · 晶核护盾');
  $('cores').innerHTML=CORES.map((c,i)=>`<div class="core ${s.cores[i]?'found':''}"><span class="gem" style="color:${c.color}">◆</span><span>${s.cores[i]?'已找到':c.name.slice(0,1)+'之晶核'}</span></div>`).join('');
  stat('quest-tip',s.won?'已救回阿岚 · 矿层仍然等待你的探索':s.boss.dead?'守卫倒下了，去 444m 的地心信标找到阿岚。':s.cores.every(Boolean)?'晶核集齐 · 前往 440m 挑战地心守卫。':'晶核所在深度：116m / 240m / 356m');
  $('ore-list').innerHTML=Object.entries(ORES).map(([id,o])=>`<div class="ore-row"><i class="ore-dot" style="background:${o.color}"></i><span>${o.name}</span><span class="count">${s.bag[id]}</span><small>¥${o.value}</small></div>`).join('');
  $('equipment-list').innerHTML=Object.entries(EQUIPMENT).map(([id,e])=>`<div class="equipment-row"><span>${e.name}</span><span>${e.names[s.upgrades[id]]} · ${['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][s.upgrades[id]]}</span></div>`).join('');
  if(!unavailable&&started&&s.p.air<25&&!s.surface&&!lowWarning){toast('氧气快用完了！按 2 补氧，或按 3 回营地。','warn',5000);lowWarning=true;}if(s.p.air>35)lowWarning=false;
}
function renderShop(){
  stat('shop-coins',game.coins.toLocaleString());stat('shop-value',cargoValue(game).toLocaleString());$('sell-btn').disabled=!cargoValue(game);
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===shopTab));
  const items=shopTab==='equipment'?Object.entries(EQUIPMENT):Object.entries(SUPPLIES);
  $('shop-items').innerHTML=items.map(([key,item])=>{
    const level=game.upgrades[key],maxed=shopTab==='equipment'&&level===3,price=shopTab==='equipment'?item.costs[level]:item.price;
    return `<article class="shop-item"><h3>${item.name}<small>${shopTab==='equipment'?`${['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][level]} → ${maxed?'MAX':['Ⅱ','Ⅲ','Ⅳ'][level]}`:`已有 ${game.supplies[key]}`}</small></h3><p>${item.desc}</p><button data-buy="${key}" ${maxed||game.coins<price?'disabled':''}><span>${maxed?'已升至满级':shopTab==='equipment'?'升级至 '+item.names[level+1]:'购买一份'}</span><b>${maxed?'✓':'¥'+price}</b></button></article>`;
  }).join('');
}
function openShop(){if(!started)return;if(!game.surface){toast('商店在地表营地。按 3 使用回城信标，或沿矿道向上飞。','warn');return;}renderShop();open('shop');}
function showWin(){save();$('win-stats').innerHTML=`<span>最深探索<b>${game.stats.bestDepth}m</b></span><span>矿石收入<b>¥${game.stats.earned}</b></span><span>冒险用时<b>${Math.floor(game.stats.time/60)}分</b></span>`;open('win');}
function newAdventure(){dialogs.forEach(d=>{if(d.open)d.close();});game=createGame();started=true;lowWarning=false;saveTimer=0;renderer.cam={x:9,y:0};clearInput();renderHUD();save();toast('新的矿层，新的冒险。附近的铜矿足够赚到第一桶金。');$('game').focus({preventScroll:true});}
$('start-btn').textContent=stored?'继续冒险 →':'点亮头灯，开始冒险 →';
if(stored){document.querySelector('.intro-copy>p').textContent=`头灯还在等你。上次已探索至 ${stored.stats.bestDepth}m，找到 ${stored.cores.filter(Boolean).length} 枚晶核。继续沿着挖开的矿道出发吧。`;}
$('start-btn').addEventListener('click',()=>{started=true;close('intro');save();if(unavailable)toast('此浏览器限制了本地存档，进度会在关闭后丢失。','warn',6000);else toast(stored?'欢迎回来，矿工。':'头灯亮起了。长按 ↓ 挖第一块铜矿吧！');});
$('help-btn').addEventListener('click',()=>open('help'));
$('pause-btn').addEventListener('click',()=>{if(!started)return;if($('pause').open)close('pause');else{save();open('pause');}});
$('sound-btn').addEventListener('click',()=>{sound=!sound;$('sound-btn').classList.toggle('active',sound);$('sound-btn').setAttribute('aria-label',sound?'关闭音效':'开启音效');tone('core');});
['camp-btn','workshop-btn'].forEach(id=>$(id).addEventListener('click',openShop));
document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>close(el.dataset.close)));
['new-btn','pause-new-btn','win-new-btn'].forEach(id=>$(id).addEventListener('click',()=>open('reset')));
$('confirm-new-btn').addEventListener('click',newAdventure);
$('save-btn').addEventListener('click',()=>{save();stat('pause-note',unavailable?'浏览器限制了存档，当前进度未能保存。':'进度已保存。下次打开即可继续。');});
$('sell-btn').addEventListener('click',()=>{sell(game);renderShop();renderHUD();processEvents();save();});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{shopTab=b.dataset.tab;renderShop();}));
$('shop-items').addEventListener('click',e=>{const btn=e.target.closest('[data-buy]');if(!btn)return;buy(game,shopTab,btn.dataset.buy);renderShop();renderHUD();processEvents();save();});
document.querySelectorAll('[data-supply]').forEach(b=>b.addEventListener('click',()=>{if(paused())return;useSupply(game,b.dataset.supply);processEvents();renderHUD();save();}));
const directionKeys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right',' ':'attack'};
window.addEventListener('keydown',e=>{
  const key=e.key.length===1?e.key.toLowerCase():e.key;
  if(directionKeys[key]){if(paused())return;e.preventDefault();tapStep=null;input[directionKeys[key]]=true;}
  if(e.repeat)return;
  if(key==='Escape'||key==='p'){
    if($('intro').open||$('reset').open)return;e.preventDefault();const current=dialogs.find(d=>d.open);if(current)close(current.id);else{save();open('pause');}return;
  }
  if(paused())return;
  if(key==='e')openShop();
  if(['1','2','3'].includes(key)){e.preventDefault();useSupply(game,['bombs','tanks','recalls'][Number(key)-1]);processEvents();renderHUD();save();}
});
window.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(directionKeys[k]){e.preventDefault();input[directionKeys[k]]=false;}});
window.addEventListener('blur',()=>{clearInput();if(started&&!paused()){save();open('pause');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();save();if(started&&!paused())open('pause');}});
window.addEventListener('pagehide',save);
dialogs.forEach(d=>{d.addEventListener('cancel',e=>{e.preventDefault();if(d.id!=='intro')close(d.id);});d.addEventListener('close',clearInput);});
function queueStep(direction){tapStep={direction,x:game.p.x,y:game.p.y,remaining:4};}
$('game').addEventListener('pointerdown',e=>{
  if(paused())return;const box=$('game').getBoundingClientRect();
  const dx=e.clientX-box.left+renderer.cam.x-(game.p.px+.5)*32,dy=e.clientY-box.top+renderer.cam.y-(game.p.py+.5)*32;
  queueStep(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));
});
document.querySelectorAll('[data-direction]').forEach(b=>{
  const held=new Map();
  b.addEventListener('pointerdown',e=>{if(paused())return;e.preventDefault();tapStep=null;held.set(e.pointerId,performance.now());b.setPointerCapture(e.pointerId);input[b.dataset.direction]=true;b.classList.add('pressed');});
  const release=e=>{const pressedAt=held.get(e.pointerId);held.delete(e.pointerId);if(!held.size){input[b.dataset.direction]=false;b.classList.remove('pressed');}if(e.type==='pointerup'&&pressedAt!==undefined&&performance.now()-pressedAt<200&&!paused())queueStep(b.dataset.direction);};
  b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
});
new ResizeObserver(()=>renderer.resize()).observe($('viewport'));
function frame(now){
  const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  if(!paused()){
    const active=tapStep?{...input,[tapStep.direction]:true}:input;update(game,dt,active);
    if(tapStep){tapStep.remaining-=dt;if(game.p.x!==tapStep.x||game.p.y!==tapStep.y||tapStep.remaining<=0||tapStep.direction==='attack')tapStep=null;}
    processEvents();saveTimer+=dt;if(saveTimer>=10){saveTimer=0;save();}
  }
  renderer.draw(game,now/1000,paused()?{}:input);uiTimer+=dt;if(uiTimer>.15){renderHUD();renderer.drawMap(game,now/1000);uiTimer=0;}
  requestAnimationFrame(frame);
}
renderer.resize();renderHUD();renderer.drawMap(game,0);$('loading').remove();open('intro');requestAnimationFrame(frame);
if(location.hash==='#debug')window.deepLight={get state(){return game;},set state(s){game=s;renderHUD();},update,buy,sell,useSupply,renderHUD,openShop,newAdventure,save,renderer};
