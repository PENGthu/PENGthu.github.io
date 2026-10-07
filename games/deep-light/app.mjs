import {SURFACE,BIOMES,biome,ORES,EQUIPMENT,SUPPLIES,QUESTS,LETTERS,STORIES} from './data.mjs?v=cloud-1';
import {createGame,step,snapshot,restore,clamp,maxHP,maxAir,maxFuel,capacity,weight,value,depth,context,canShop,sell,upgrade,buy,use,interact,warp,questProgress} from './engine.mjs?v=cloud-1';
import {Renderer} from './render.mjs?v=cloud-1';
const $=id=>document.getElementById(id), input={left:false,right:false,up:false,down:false,attack:false};
const STORAGE='cloud-miners-v3', PREFS=STORAGE+'-prefs';
let state=createGame(),started=false,paused=false,currentSlot=0,shopTab='gear',storyQueue=[],autoTimer=0,uiTimer=0,lastTime=0,storageAvailable=true,slots=[null,null,null],prefs={sound:false,slot:0},soundContext=null,lastTone=0;
const renderer=new Renderer($('game'),$('minimap'));
function resetInput(){for(const k of Object.keys(input))input[k]=false;document.querySelectorAll('[data-input]').forEach(b=>b.classList.remove('pressed'));}
function note(text,kind='info'){
 const list=$('toasts'),same=[...list.children].find(e=>e.textContent===text);if(same)return;
 const el=document.createElement('div');el.className='toast '+kind;el.textContent=text;list.append(el);while(list.children.length>4)list.firstChild.remove();setTimeout(()=>el.remove(),kind==='warn'?5200:3200);
}
function tone(kind='click'){
 if(!prefs.sound)return;try{soundContext??=new (window.AudioContext||window.webkitAudioContext)();soundContext.resume();const t=soundContext.currentTime;if(t-lastTone<.08)return;lastTone=t;
 const o=soundContext.createOscillator(),g=soundContext.createGain();o.connect(g);g.connect(soundContext.destination);o.type=kind==='ore'?'sine':'triangle';const hz=kind==='success'?660:kind==='warn'?170:kind==='ore'?480:330;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(hz*(kind==='success'?1.5:.7),t+.12);g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.start(t);o.stop(t+.18);
 }catch{prefs.sound=false;updateSound();}
}
function persistPrefs(){try{localStorage.setItem(PREFS,JSON.stringify(prefs));}catch{}}
function updateSound(){$('sound').textContent=prefs.sound?'♫':'♪';$('sound').classList.toggle('active',prefs.sound);$('sound').setAttribute('aria-label',prefs.sound?'关闭音效':'开启音效');$('sound').title=prefs.sound?'音效已开启':'音效已关闭';}
function readStorage(){try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'[null,null,null]');if(!Array.isArray(raw)||raw.length!==3)throw Error();slots=raw.map(d=>{if(!d)return null;try{return{savedAt:d.savedAt,state:snapshot(restore(d.state))};}catch{return null;}});const p=JSON.parse(localStorage.getItem(PREFS)||'{}');prefs={sound:p.sound===true,slot:Number.isInteger(p.slot)?clamp(p.slot,0,2):0};currentSlot=prefs.slot;if(slots[currentSlot])state=restore(slots[currentSlot].state);}catch{storageAvailable=false;}}
function save(show=false,slot=currentSlot){
 const record={savedAt:new Date().toISOString(),state:snapshot(state)};slots[slot]=record;
 try{localStorage.setItem(STORAGE,JSON.stringify(slots));storageAvailable=true;$('save-status').textContent=`存档 ${slot+1} · 已保存`;if(show)note('进度已保存到本机存档 '+(slot+1),'success');}
 catch{storageAvailable=false;$('save-status').textContent='无法保存 · 请导出备份';if(show)note('浏览器无法写入存档，请导出备份。','warn');}
 if($('slots').open)renderSlots();return record;
}
function anyDialog(){return Boolean(document.querySelector('dialog[open]'));}
function openDialog(id){resetInput();document.querySelectorAll('dialog[open]').forEach(d=>d.close());$(id).showModal();if(id==='shop')renderShop();if(id==='journal')renderJournal();if(id==='relays')renderRelays();if(id==='slots')renderSlots();}
function closeDialog(id){$(id).close();resetInput();if(!started&&!anyDialog())openDialog('intro');else $('game').focus({preventScroll:true});}
function setPaused(v){paused=v;resetInput();$('pause-cover').hidden=!v;$('pause-btn').textContent=v?'▶':'Ⅱ';$('pause-btn').setAttribute('aria-label',v?'继续游戏':'暂停游戏');if(v&&started)save();}
function begin(){started=true;paused=false;document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('pause-cover').hidden=true;$('game').focus({preventScroll:true});if(state.stats.time===0)storyQueue.push({kind:'story',id:'intro'});save();updateUI();}
function showStory(event){const d=event.kind==='letter'?{who:'旧矿团的笔记',portrait:'drone',title:event.title,text:event.text}:STORIES[event.id];if(!d)return;$('story-portrait').src=`./assets/portrait-${d.portrait}.svg`;$('story-portrait').alt=d.who;$('story-who').textContent=d.who;$('story-title').textContent=d.title;$('story-text').textContent=d.text;openDialog('story');}
function processEvents(){for(const e of state.events.splice(0)){if(e.kind==='story'||e.kind==='letter'||e.kind==='win')storyQueue.push(e);else if(e.kind==='shop'){if(!anyDialog())openDialog('shop');}else{note(e.text,e.kind);tone(e.kind);}}
 if(started&&!paused&&!anyDialog()&&storyQueue.length){const e=storyQueue.shift();if(e.kind==='win'){$('win-stats').innerHTML=statsMarkup();openDialog('win');save();}else showStory(e);}
}
function meter(name,n,max){$(name+'-text').textContent=`${Math.ceil(n)} / ${max}`;$(name+'-bar').style.width=clamp(n/max*100,0,100)+'%';}
function mission(){if(state.won)return['05','风已经回到天空。还有没寄出的旧城回信，继续探索吧。'];if(!state.quests.includes('copper'))return['01','第一趟下矿：卖出六块赤铜，帮老狸修好风叶。'];if(!state.relays.some(a=>a.active))return['01','在 126m 左右点亮根灯驿站。这里是第一处地下补给点。'];if(!state.bosses[0].dead)return['02','向西寻找 234m 深处的沉钟守卫，带回潮汐风印。'];if(!state.bosses[1].dead)return['03','菌光花园的东边，织梦者守着生长风印。升级装备再出发。'];return['04','穿过赤炉遗城，抵达 786m 的风暴心室，唤醒最后一座织机。'];}
function updateUI(){
 meter('hp',state.p.hp,maxHP(state));meter('air',state.p.air,maxAir(state));meter('fuel',state.p.fuel,maxFuel(state));$('coins').textContent=state.coins.toLocaleString();$('fullscreen-vitals').textContent=`生命 ${Math.ceil(state.p.hp)} / ${maxHP(state)}　氧气 ${Math.ceil(state.p.air)} / ${maxAir(state)}　燃料 ${Math.ceil(state.p.fuel)} / ${maxFuel(state)}　◈ ${state.coins}`;$('depth').textContent=depth(state)+'m';$('area-label').textContent=state.p.y<=SURFACE?'风车矿站':biome(state.p.y).name;$('context').textContent=context(state);$('shop-btn').hidden=!canShop(state);
 $('bag-load').textContent=`${weight(state)} / ${capacity(state)}`;$('bag-bar').style.width=clamp(weight(state)/capacity(state)*100,0,100)+'%';$('bag-bar').classList.toggle('full',weight(state)>=capacity(state));$('bag-value').textContent=value(state).toLocaleString();
 $('ore-list').innerHTML=Object.entries(ORES).map(([id,o])=>`<div class="ore-row ${state.bag[id]?'':'empty'}"><span><i style="--ore:${o.color}"></i>${o.name}</span><b>${state.bag[id]}</b></div>`).join('');
 for(const [id,d] of Object.entries(SUPPLIES)){const b=document.querySelector(`[data-supply="${id}"]`);b.querySelector('b').textContent=state.supplies[id];b.disabled=state.supplies[id]===0||!started;}
 const [chapter,text]=mission();$('chapter').textContent='CHAPTER '+chapter;$('mission-text').textContent=text;$('seals').innerHTML=state.bosses.map((b,i)=>`<span class="seal ${b.dead?'earned':''}" title="${b.name}">${b.dead?'✦':'◇'}<small>${['潮汐','生长','风暴'][i]}</small></span>`).join('');
 const boss=state.bosses.find(b=>b.awake&&!b.dead);$('boss-hud').hidden=!boss;if(boss){$('boss-name').textContent=boss.name+(boss.windup>0?' · 准备闪避':'');$('boss-bar').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';}
 $('heat').hidden=state.p.heat<15;$('heat-bar').style.width=state.p.heat+'%';$('heat-text').textContent=state.p.heat>95?'过热！松开方向键散热':'钻头温度';
}
function statsMarkup(){return `<span>最深处 <b>${state.stats.bestDepth}m</b></span><span>已开采 <b>${state.stats.mined} 块</b></span><span>探险时长 <b>${Math.floor(state.stats.time/60)} 分</b></span><span>击退生物 <b>${state.stats.kills}</b></span>`;}
function renderShop(){
 $('shop-coins').textContent=state.coins.toLocaleString();$('shop-value').textContent=value(state).toLocaleString();$('sell-btn').disabled=value(state)===0;
 document.querySelectorAll('[data-shop-tab]').forEach(b=>b.classList.toggle('active',b.dataset.shopTab===shopTab));
 $('shop-items').innerHTML=shopTab==='gear'?Object.entries(EQUIPMENT).map(([id,g])=>{const lv=state.gear[id],cost=g.costs[lv];return `<article class="shop-item"><span class="item-icon">${g.icon}</span><div><small>${g.name} · ${lv+1} / 5 级</small><h3>${g.names[lv]}</h3><p>${g.desc}</p><div class="level-dots">${[0,1,2,3,4].map(i=>`<i class="${i<=lv?'on':''}"></i>`).join('')}</div>${lv<4?`<span class="next-gear">下一级：${g.names[lv+1]}</span>`:'<span class="next-gear">已达到最高级</span>'}</div><button class="primary" data-upgrade="${id}" ${lv>=4||state.coins<cost?'disabled':''}>${lv>=4?'已满级':'升级 · ◈ '+cost}</button></article>`;}).join(''):Object.entries(SUPPLIES).map(([id,d])=>`<article class="shop-item"><span class="item-icon">${d.icon}</span><div><small>现有 ${state.supplies[id]} 个</small><h3>${d.name}</h3><p>${d.desc}</p></div><button class="primary" data-buy="${id}" ${state.coins<d.price?'disabled':''}>购买 · ◈ ${d.price}</button></article>`).join('');
}
function renderJournal(){
 $('quest-list').innerHTML=QUESTS.map(q=>{const done=state.quests.includes(q.id),n=Math.min(q.need,questProgress(state,q));return `<article class="quest ${done?'done':''}"><div><h3>${done?'✓ ':''}${q.title}</h3><p>${q.body}</p><div class="meter"><i style="width:${n/q.need*100}%"></i></div></div><span>${done?'已寄回':n+' / '+q.need}<small>◈ ${q.reward}</small></span></article>`;}).join('');
 $('letters-count').textContent=`${state.stats.logs} / ${LETTERS.length}`;$('letters').innerHTML=state.stats.logs?LETTERS.slice(0,state.stats.logs).map(l=>`<p>${l}</p>`).join(''):'<p>洞穴深处的信匣，藏着旧矿团留下的回信。走近后按 E 阅读。</p>';$('stats').innerHTML=statsMarkup();
}
function renderRelays(){const list=[{id:'camp',name:'风车矿站',y:SURFACE,active:true},...state.relays];$('relay-list').innerHTML=list.map(a=>`<article class="relay-row"><div><h3>${a.active?'●':'○'} ${a.name}</h3><p>${a.id==='camp'?'云海起点':(a.y-SURFACE)*6+'m · '+(a.active?'灯已点亮':'等待你的第一封回信')}</p></div><button class="primary" data-warp="${a.id}" ${!a.active||!canShop(state)?'disabled':''}>传送</button></article>`).join('');}
function renderSlots(){
 $('storage-note').textContent=storageAvailable?'存档保存在当前浏览器。清除站点数据会清除进度，请先导出备份。':'浏览器无法写入存档。请使用导出备份保留进度。';
 $('slot-list').innerHTML=slots.map((d,i)=>`<article class="slot-row ${i===currentSlot?'current':''}"><div><h3>存档 ${i+1}${i===currentSlot?' · 当前':''}</h3><p>${d?`${d.state.stats.bestDepth}m · ${d.state.bosses.filter(b=>b.dead).length} 枚风印 · ${new Date(d.savedAt).toLocaleString('zh-CN')}`:'尚未出发'}</p></div><button class="primary" data-load="${i}">${d?'继续':'新冒险'}</button><button class="ghost" data-slot-save="${i}" ${!started?'disabled':''}>保存到此处</button></article>`).join('');
}
function fresh(){state=createGame();renderer.initial=false;storyQueue=[];autoTimer=0;begin();}
readStorage();updateSound();$('start-btn').textContent=slots[currentSlot]?'继续上次的冒险 →':'戴上头盔，出发 →';
$('toolbelt').innerHTML=Object.entries(SUPPLIES).map(([id,d])=>`<button class="tool" data-supply="${id}" title="${d.desc}"><kbd>${d.key}</kbd><span class="tool-icon">${d.icon}</span><span>${d.name}</span><b>${state.supplies[id]}</b></button>`).join('');
$('loading').hidden=true;updateUI();openDialog('intro');
$('start-btn').addEventListener('click',begin);
$('intro-slots').addEventListener('click',()=>openDialog('slots'));
$('sound').addEventListener('click',()=>{prefs.sound=!prefs.sound;updateSound();persistPrefs();tone('success');});
$('help-btn').addEventListener('click',()=>openDialog('help'));
$('pause-btn').addEventListener('click',()=>{if(started&&!anyDialog())setPaused(!paused);});
$('resume').addEventListener('click',()=>{setPaused(false);$('game').focus({preventScroll:true});});
for(const id of ['save-btn','pause-save'])$(id).addEventListener('click',()=>save(true));
$('slots-btn').addEventListener('click',()=>openDialog('slots'));$('journal-btn').addEventListener('click',()=>openDialog('journal'));$('relay-btn').addEventListener('click',()=>openDialog('relays'));
$('shop-btn').addEventListener('click',()=>{if(started&&canShop(state))openDialog('shop');});
$('touch-interact').addEventListener('click',()=>{if(started&&!paused&&!anyDialog()){interact(state);processEvents();}});
$('sell-btn').addEventListener('click',()=>{sell(state);processEvents();renderShop();updateUI();save();});
$('restart').addEventListener('click',()=>openDialog('reset'));$('confirm-restart').addEventListener('click',fresh);
$('fullscreen').addEventListener('click',async()=>{try{await $('stage').requestFullscreen();}catch{note('当前浏览器不支持全屏。');}});$('exit-fullscreen').addEventListener('click',()=>document.exitFullscreen?.());
const touchDock=$('touch-controls'),touchHome=touchDock.parentNode,touchAfter=touchDock.nextSibling,toolDock=$('toolbelt');document.addEventListener('fullscreenchange',()=>{resetInput();if(document.fullscreenElement){$('stage').append(toolDock,touchDock);}else{touchHome.insertBefore(touchDock,touchAfter);touchHome.insertBefore(toolDock,touchDock);}});
$('shop').addEventListener('click',e=>{const tab=e.target.closest('[data-shop-tab]');if(tab){shopTab=tab.dataset.shopTab;renderShop();}const up=e.target.closest('[data-upgrade]'),b=e.target.closest('[data-buy]');if(up)upgrade(state,up.dataset.upgrade);if(b)buy(state,b.dataset.buy);if(up||b){processEvents();renderShop();updateUI();save();}});
$('relay-list').addEventListener('click',e=>{const b=e.target.closest('[data-warp]');if(b&&warp(state,b.dataset.warp)){closeDialog('relays');renderer.initial=false;processEvents();updateUI();save();}});
$('toolbelt').addEventListener('click',e=>{const b=e.target.closest('[data-supply]');if(b&&started&&!paused&&!anyDialog()){use(state,b.dataset.supply);processEvents();updateUI();}});
$('slot-list').addEventListener('click',e=>{
 const load=e.target.closest('[data-load]'),store=e.target.closest('[data-slot-save]');if(load){const next=Number(load.dataset.load);if(started)save();currentSlot=next;prefs.slot=next;persistPrefs();storyQueue=[];renderer.initial=false;state=slots[next]?restore(slots[next].state):createGame();begin();}
 if(store){const next=Number(store.dataset.slotSave);if(next!==currentSlot&&slots[next]&&!confirm(`覆盖存档 ${next+1} 的进度？`))return;save(true,next);}
});
$('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({game:'cloud-miners',version:3,savedAt:new Date().toISOString(),state:snapshot(state)})],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`云下矿团-存档${currentSlot+1}-${new Date().toISOString().slice(0,10)}.json`;a.style.display="none";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);note('备份已导出。','success');});
$('import').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>1500000)throw Error('文件过大');const d=JSON.parse(await f.text());if(d.game!=='cloud-miners')throw Error('这不是云下矿团的备份');const next=restore(d.state);if(!confirm(`导入备份将替换当前存档 ${currentSlot+1}。继续吗？`))return;state=next;renderer.initial=false;storyQueue=[];started=true;setPaused(false);save(true);updateUI();renderSlots();}catch(err){note('导入失败：'+err.message,'warn');}finally{e.target.value='';}});
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>closeDialog(b.dataset.close));
for(const d of document.querySelectorAll('dialog')){d.addEventListener('cancel',e=>{if(d.id==='intro'){e.preventDefault();return;}e.preventDefault();closeDialog(d.id);});}
const bindings={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'attack'};
window.addEventListener('keydown',e=>{
 if(!started||anyDialog())return;if(bindings[e.code]){e.preventDefault();if(!paused)input[bindings[e.code]]=true;return;}
 if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();if(!e.repeat)setPaused(!paused);return;}
 if(paused||e.repeat)return;if(e.code==='KeyE'){interact(state);processEvents();}const supply=Object.entries(SUPPLIES).find(([,d])=>e.code==='Digit'+d.key);if(supply){use(state,supply[0]);processEvents();updateUI();}
});
window.addEventListener('keyup',e=>{if(bindings[e.code]){input[bindings[e.code]]=false;e.preventDefault();}});
for(const b of document.querySelectorAll('[data-input]')){let pressedAt=0,releaseTimer=0;const release=()=>{const remaining=Math.max(0,180-(performance.now()-pressedAt));releaseTimer=setTimeout(()=>{input[b.dataset.input]=false;b.classList.remove('pressed');},remaining);};b.addEventListener('pointerdown',e=>{if(!started||paused||anyDialog())return;e.preventDefault();clearTimeout(releaseTimer);pressedAt=performance.now();input[b.dataset.input]=true;b.classList.add('pressed');b.setPointerCapture(e.pointerId);});b.addEventListener('pointerup',release);b.addEventListener('pointercancel',()=>{clearTimeout(releaseTimer);resetInput();});b.addEventListener('click',()=>{if(!started||paused||anyDialog()||performance.now()-pressedAt<500)return;clearTimeout(releaseTimer);input[b.dataset.input]=true;b.classList.add('pressed');releaseTimer=setTimeout(()=>{input[b.dataset.input]=false;b.classList.remove('pressed');},300);});}
window.addEventListener('blur',()=>{resetInput();if(started&&!anyDialog())setPaused(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started){setPaused(true);save();}});
window.addEventListener('pagehide',()=>{if(started)save();});
function frame(ms){const dt=lastTime?Math.min(.06,(ms-lastTime)/1000):0;lastTime=ms;
 if(started&&!paused&&!anyDialog()&&!document.hidden){step(state,input,dt);autoTimer+=dt;if(autoTimer>=10){save();autoTimer=0;}}
 processEvents();renderer.draw(state,ms/1000,input);uiTimer+=dt;if(uiTimer>.1){updateUI();uiTimer=0;}requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
