import {createGame,step,getActions,weatherAt,forecast,nodeAt,weightOf,timeLabel,riskLevel,questLabel,conditionLabel,validateSave,cartSummary,clamp} from './engine.mjs?v=2';
import {SCENARIOS,BACKPACKS,ITEMS,PRESETS,NODES,EVENTS,CATEGORIES,ACHIEVEMENTS} from './data.mjs?v=2';

const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='aotai-story-v2',PROFILE='aotai-achievements-v2';
const metricNames={health:'生命',energy:'体力',warmth:'保温',san:'精神',satiety:'饱腹',hydration:'补水',battery:'电量',durability:'装备',weight:'负重'};
const utilitySymbols={rest:'◷',camp:'△',heat:'♨',refill:'◉',repair:'⌘',sos:'◎',wait:'◷',retreat:'↙',report:'◎',resupply:'▣'};
let state=createGame(),history=[],branch=null,started=false,selected='',lastReport=null,allLog=false,toastTimer;
let cart=structuredClone(PRESETS.balanced),scenario='letter',category='wear',saved=null,unlocked=[];
function validReport(r){return !!r&&typeof r.title==='string'&&typeof r.location==='string'&&Number.isFinite(r.turn)&&Number.isFinite(r.minutes)&&r.minutes>=0&&r.before&&r.after&&Object.keys(metricNames).every(k=>Number.isFinite(r.before[k])&&Number.isFinite(r.after[k]))&&Array.isArray(r.notes)&&r.notes.every(n=>typeof n==='string');}
try{
  const v=JSON.parse(localStorage.getItem(STORAGE));
  if(validateSave(v?.state)&&Array.isArray(v.history)&&v.history.length<=1000&&v.history.every(e=>validateSave(e.before)&&validReport(e.report))&&(!v.branch||validReport(v.branch.report)))saved=v;
  const p=JSON.parse(localStorage.getItem(PROFILE));
  if(Array.isArray(p))unlocked=[...new Set(p.filter(id=>ACHIEVEMENTS.some(a=>a.id===id)))];
}catch{}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3600);}
function save(){
  if(!started)return;
  saved={state,history,branch};
  try{localStorage.setItem(STORAGE,JSON.stringify(saved));localStorage.setItem(PROFILE,JSON.stringify(unlocked));}
  catch{toast('浏览器无法保存，可使用「导出记录」保留这次旅程。');}
}
function openDialog(id){if(!$(id).open)$(id).showModal();}
function duration(mins){return mins===0?'不耗时':mins<60?`${mins} 分钟`:`${+(mins/60).toFixed(1)} 小时`;}
function meter(key){
  const value=Math.round(state[key]);
  return `<div class="stat" data-key="${key}"><div class="stat-top"><span>${metricNames[key]}</span><b>${value}<small>/100</small></b></div><div class="stat-track" role="meter" aria-label="${metricNames[key]}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><div class="stat-fill ${value<20?'critical':value<40?'bad':''}" style="width:${value}%"></div></div></div>`;
}
function renderRoute(){
  $('route-list').innerHTML=NODES.map(n=>`<div class="route-stop ${state.visited.includes(n.id)?'visited':''} ${state.node===n.id?'current':''} ${n.branch?'branch':''}"><i></i><b>${n.name}</b><small>${n.alt.toLocaleString()} m${n.water?' · 水源':''}</small></div>`).join('');
  const main=NODES.filter(n=>!n.branch),index=main.findIndex(n=>n.id===state.node);
  $('progress-label').textContent=state.returning?'沿来路撤回':state.rescue?'停留待援':index>=0?`${String(index+1).padStart(2,'0')} / ${main.length}`:'支线中';
  $('quest-status').textContent=questLabel(state);
  $('quest-detail').textContent=state.quest?.status==='waiting'?'留下物资之后，还需要送达位置；救援也要赶在窗口内。':state.quest?.status==='reported'?'强风雪会拖慢接近，等待窗口仍在继续。':state.quest?.status==='rescued'?'有些绕路，改变了两个人的结局。':state.quest?.status==='failed'?'在记录中回到这一段，可以试试另一种分配。':'你的路线选择可能带来新的线索。';
  $('companion-card').innerHTML=state.companion?'<span class="companion-avatar">鹿</span><div><b>鹿宁 · 正在同行</b>有人与你互相照应。</div>':state.flags.helpedCompanion?'<span class="companion-avatar">鹿</span><div><b>鹿宁 · 已告别</b>她记住了你分出的那份帮助。</div>':'';
}
function renderScene(){
  const loc=nodeAt(state),w=weatherAt(state),index=NODES.findIndex(n=>n.id===state.node);
  $('scenario-name').textContent=SCENARIOS[state.scenario].name;
  $('clock').textContent=timeLabel(state);$('turn-label').textContent=`第 ${String(state.turn+1).padStart(2,'0')} 个决定 · 种子 ${state.seed}`;
  $('chapter-number').textContent=`CHAPTER ${String(index+1).padStart(2,'0')} / ${state.returning?'归途':loc.chapter}`;
  $('location-name').textContent=loc.name;$('location-detail').textContent=`海拔 ${loc.alt.toLocaleString()} m · ${state.returning?'沿已确认的来路撤回':'虚构山地故事'}`;
  $('landscape').className=`landscape ${loc.scene} ${w.night?'night':''} ${w.inStorm?'storm':''}`;
  $('weather-badge').innerHTML=`<span>${w.icon}</span><div><b>${w.kind}</b>${w.temp}°C · ${w.night?'夜间':'白昼'}</div>`;
  $('terrain-label').textContent=loc.shelter>.6?'地形有较多遮蔽':loc.shelter>.25?'部分遮蔽，仍会暴露':'开阔地形，风雨影响更大';
  $('weather-detail').textContent=`风力 ${w.wind} 级 · 能见度 ${w.visibility} m（游戏值）`;
}
function renderStory(){
  const loc=nodeAt(state),event=state.event?EVENTS[state.event]:null,actions=getActions(state);
  const main=actions.filter(a=>a.kind==='choice'||a.kind==='travel');
  if(!main.some(a=>a.id===selected&&!a.disabled))selected='';
  $('event-category').textContent=state.outcome?'故事 / 本次结局':state.rescue?'救援 / 守住定位点':state.returning?'归途 / 撤离也是选择':event?event.category:'行进 / 下一段路';
  $('event-count').textContent=state.outcome?`${state.turn} 个决定`:event?`${event.choices.length} 个选项`:'先观察，再动身';
  const hikerExpired=state.event==='hiker'&&state.quest?.status==='failed';
  $('story-title').textContent=state.outcome?state.outcome.title:state.rescue?'你已经把位置送了出去':hikerExpired?'等不到的回应':event?event.title:loc.chapter;
  $('story-text').textContent=state.outcome?state.outcome.text:state.rescue?'等待不是暂停。气温、饥饿和疲劳仍会变化。用背包里的物资维持状态，在这里等救援接近。':hikerExpired?'时间超过了他可以等待的窗口。你需要带回位置与这段消息。回看此前的停留和物资准备，可以从找到他之前重新选择。':event?event.text:loc.text;
  const chips=[];
  if(state.companion)chips.push('鹿宁与你同行');
  if(state.quest?.status==='waiting')chips.push(questLabel(state));
  if(state.rescue)chips.push(`预计还需 ${Math.ceil(state.rescue.remaining)} 小时`);
  if(state.conditions.length)chips.push(...state.conditions.map(conditionLabel));
  if(state.route)chips.push('本次路线选择会影响下一段耗时与暴露');
  if(state.flags.weatherHint)chips.push('路况笔记提醒：留意天气变化');
  if(state.warmth<30)chips.push('保温状态偏低');if(state.energy<25)chips.push('体力正在吃紧');
  $('story-context').innerHTML=chips.map(c=>`<span class="context-chip ${c.includes('剩余')||c.includes('偏低')?'urgent':''}">${esc(c)}</span>`).join('');
  $('choices').innerHTML=state.outcome?'<button class="outline-button" data-result>查看结局与成就 ↗</button>':main.map((a,i)=>`<button type="button" class="choice ${selected===a.id?'selected':''}" data-main="${a.id}" aria-pressed="${selected===a.id}" ${a.disabled?'disabled':''}><span class="choice-number">${a.disabled?'·':i+1}</span><div><strong>${esc(a.title)}</strong><p>${esc(a.disabled||a.desc)}</p></div><span class="choice-time">${duration(a.minutes)}</span></button>`).join('');
  $('commit-button').hidden=!!state.outcome||!!state.rescue;
  $('commit-button').disabled=!started||!selected;
  $('selected-label').textContent=state.rescue?'在下方停留、补给与保温':selected?actions.find(a=>a.id===selected).title:'选择上面的一个决定';
  $('utilities').innerHTML=actions.filter(a=>a.kind==='utility').map(a=>`<button class="utility-button" data-do="${a.id}" ${a.disabled?'disabled':''} title="${esc(a.disabled||a.desc)}">${utilitySymbols[a.id]||'◇'} ${esc(a.title)}<span>${esc(a.disabled||duration(a.minutes))}</span></button>`).join('');
  $('quick-items').innerHTML=['ration','water','snack','meal','med','warmer'].map(id=>{
    const a=actions.find(a=>a.id===`use:${id}`),n=state.inventory[id]||0;
    return `<button class="quick-item" data-do="use:${id}" ${!a||a.disabled?'disabled':''} title="${esc(a?.disabled||ITEMS[id].desc)}">${ITEMS[id].icon} ${ITEMS[id].name.replace(' · 0.5 L','')}<b>×${n}</b></button>`;
  }).join('');
}
function renderStatus(){
  $('stats').innerHTML=['health','energy','warmth','san','satiety','hydration'].map(meter).join('');
  const risk=riskLevel(state);$('risk-badge').textContent=risk.name;$('risk-badge').className=`risk-badge level-${risk.level}`;
  $('minor-stats').innerHTML=[['wetness','湿衣'],['battery','电量'],['durability','完整度']].map(([key,label])=>`<div>${label}<b>${Math.round(state[key])}%</b></div>`).join('');
  $('conditions').innerHTML=state.conditions.length?state.conditions.map(c=>`<span class="condition">${conditionLabel(c)}</span>`).join(''):'<span class="subtle">身体暂无持续病痛</span>';
  $('resources').innerHTML=[['口粮',(state.inventory.ration||0)+(state.inventory.meal||0),'份'],['饮水',((state.inventory.water||0)*.5).toFixed(1),'L'],['燃气',state.inventory.fuel||0,'份'],['医疗',state.inventory.med||0,'包']].map(([label,n,unit])=>`<div class="resource"><span>${label}</span><b>${n}<small>${unit}</small></b></div>`).join('');
  const weight=weightOf(state),capacity=BACKPACKS[state.backpack].capacity;
  $('weight-line').className=`weight-line ${weight>capacity?'overloaded':''}`;
  $('weight-line').innerHTML=`<span>${BACKPACKS[state.backpack].name}</span><b>${weight.toFixed(1)} / ${capacity} kg</b>`;
  $('rescue-status').innerHTML=state.rescue?`<b>◎ 救援已建立</b>守住${nodeAt(state).name}定位点<br>预计剩余 ${Math.ceil(state.rescue.remaining)} 个游戏小时`:'';
  $('forecast').innerHTML=forecast(state).map(w=>`<div class="forecast-row"><span>约 ${w.hours} 小时后</span><b>${w.icon} ${w.kind}</b><span>${w.temp}°C</span></div>`).join('');
}
function deltaMarkup(report){
  return Object.entries(metricNames).map(([key,label])=>{
    const n=+(report.after[key]-report.before[key]).toFixed(1);if(!n||!Number.isFinite(n))return '';
    return `<span class="${key==='weight'?n<0?'positive':'negative':n>0?'positive':'negative'}">${label} ${n>0?'+':''}${n}${key==='weight'?' kg':''}</span>`;
  }).join('');
}
function renderFeedback(){
  if(!lastReport){$('feedback-panel').innerHTML='';return;}
  const r=lastReport;
  const compare=branch&&branch.turn===r.turn?`<div class="comparison-note">重选之前：${esc(branch.report.title)} · 用时 ${duration(branch.report.minutes)}。<br>本次选择：${esc(r.title)} · 用时 ${duration(r.minutes)}。此前状态与故事种子相同。</div>`:'';
  $('feedback-panel').innerHTML=`<div class="feedback-heading"><strong>第 ${r.turn} 步 · ${esc(r.title)}</strong><span>+ ${duration(r.minutes)}</span></div><div class="delta-list">${deltaMarkup(r)}</div>${r.notes.length?`<ul>${r.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}${compare}`;
}
function renderJournal(){
  $('undo-button').disabled=!history.length;
  $('branch-note').innerHTML=branch?`<div class="branch-note">已从第 ${branch.turn} 步重选。原先选择「${esc(branch.report.title)}」${branch.outcome?`，原分支结局为「${esc(branch.outcome.title)}」`:''}。</div>`:'';
  const entries=allLog?history:history.slice(-12),offset=history.length-entries.length;
  $('journal').innerHTML=entries.length?entries.map((e,i)=>({e,i:i+offset})).reverse().map(({e,i},n)=>`<div class="journal-entry"><div class="journal-time"><b>${String(e.report.turn).padStart(2,'0')}</b><span>${esc(timeLabel(e.before))}</span></div><details ${n===0?'open':''}><summary>${esc(e.report.title)}<small>${esc(e.report.location)} · ${duration(e.report.minutes)}</small></summary><div class="delta-list">${deltaMarkup(e.report)}</div>${e.report.notes.length?`<ul>${e.report.notes.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}</details><button class="rewind-button" data-rewind="${i}">从此重选 ↶</button></div>`).join(''):'<div class="empty-journal">山路还没留下脚印。每次选择之后，这里会记录你做了什么、发生了什么。</div>';
  $('more-log').hidden=allLog||history.length<=12;
  $('more-log').textContent=`显示全部 ${history.length} 步记录 ↓`;
}
function renderBag(){
  const actions=getActions(state);
  $('bag-summary').textContent=`${weightOf(state).toFixed(2)} / ${BACKPACKS[state.backpack].capacity} kg · 剩余预算 ¥${state.money.toLocaleString()} · 备用电源用尽后仍计入重量`;
  $('bag-items').innerHTML=CATEGORIES.map(([cat,name])=>{
    const items=Object.entries(ITEMS).filter(([id,item])=>item.category===cat&&(state.inventory[id]||0)>0);
    if(!items.length)return '';
    return `<h3 class="bag-group">${name}</h3>${items.map(([id,item])=>{
      const a=actions.find(a=>a.id===`use:${id}`),drop=actions.find(a=>a.id===`drop:${id}`);
      return `<div class="bag-row"><span class="item-icon">${item.icon}</span><div class="bag-info"><strong>${item.name}</strong><p>${item.desc} · ${item.weight} kg / 件</p></div><div class="bag-controls"><span>×${state.inventory[id]}</span>${item.usable?`<button class="bag-use" data-do="use:${id}" ${!a||a.disabled?'disabled':''} title="${esc(a?.disabled||'')}">使用</button>`:'<span class="subtle">已携带</span>'}<button class="bag-drop" data-do="drop:${id}" ${!drop?'disabled':''}>放弃</button></div></div>`;
    }).join('')}`;
  }).join('')||'<p class="subtle">背包已经空了。</p>';
  if(state.cargo)$('bag-items').innerHTML+=`<div class="bag-row"><span class="item-icon">♧</span><div class="bag-info"><strong>带下山的垃圾</strong><p>${state.cargo.toFixed(1)} kg · 这是你决定留下的责任。</p></div></div>`;
  if(state.emptyBatteries)$('bag-items').innerHTML+=`<div class="bag-row"><span class="item-icon">ϟ</span><div class="bag-info"><strong>用尽的备用电源 ×${state.emptyBatteries}</strong><p>${(state.emptyBatteries*.25).toFixed(2)} kg · 仍计入负重。</p></div></div>`;
}
function render(){renderScene();renderRoute();renderStory();renderStatus();renderFeedback();renderJournal();renderBag();}
function execute(id=selected){
  if(!started||state.outcome)return;
  const before=structuredClone(state),result=step(state,id);
  if(result.error){toast(result.error);return;}
  state=result.state;lastReport=result.report;history.push({before,report:result.report});selected='';
  if(state.outcome)unlocked=[...new Set([...unlocked,...state.outcome.achievements])];
  save();render();
  if(state.outcome){$('bag-dialog').close();showResult();}
}
function rewind(index){
  if(!Number.isInteger(index)||!history[index])return;
  const entry=history[index];branch={turn:entry.report.turn,report:structuredClone(entry.report),outcome:state.outcome?structuredClone(state.outcome):null};
  state=structuredClone(entry.before);history=history.slice(0,index);lastReport=history.at(-1)?.report||null;selected='';started=true;
  $('result-dialog').close();$('bag-dialog').close();save();render();
  $('story-title').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  toast(`回到第 ${entry.report.turn} 步之前，试试另一种选择。`);
}
function showResult(){
  const o=state.outcome;if(!o)return;
  const q=state.quest,people=q?.status==='rescued'?'许舟等到了救援。你的物资与消息，改变了他的归途。':q?.status==='failed'?'许舟的等待窗口已错过。留下多少物资、何时报告、停留多久，影响了这一段。':q?.status==='reported'?'许舟的救援已经出发，但本次结束时还没有获救确认。':q?.status==='waiting'||q?.status==='found'?'许舟的位置尚未送到救援人员手中。他的故事仍停在等待里。':state.flags.voiceClue?'你带回了哨音线索，许舟的下落尚未确认。':'你没有在这次行程里找到许舟。他的故事仍藏在另一条分支里。';
  $('result-content').innerHTML=`<div class="dialog-heading"><span class="eyebrow">THE STORY YOU BROUGHT BACK</span><button class="close-button" data-close="result-dialog" aria-label="关闭结局">×</button></div><div class="result-art">${o.kind==='critical'?'◈':o.kind==='rescued'?'◎':'△'}</div><h2>${esc(o.title)}</h2><p class="result-text">${esc(o.text)}</p><div class="result-metrics"><div><b>${state.turn}</b><span>次决定</span></div><div><b>${state.clock.toFixed(1)}</b><span>游戏小时</span></div><div><b>${Math.round(state.health)}</b><span>剩余生命</span></div><div><b>${state.merit}</b><span>善意记录</span></div></div><div class="ending-people"><b>关于山里的其他人</b>${people}${state.flags.escort?'<br>鹿宁和你一起回到了山脚。':state.flags.helpedCompanion?'<br>鹿宁记住了你曾经给过的帮助。':''}</div><div class="result-achievements">${o.achievements.map(id=>{const a=ACHIEVEMENTS.find(a=>a.id===id);return a?`<span class="achievement-chip">${a.icon} ${a.name}</span>`:'';}).join('')}</div>${branch?.outcome?`<div class="branch-note">原分支：${esc(branch.outcome.title)}<br>这次：${esc(o.title)}</div>`:''}<div class="result-actions"><button class="outline-button" data-review>回看每一步 ↶</button><button class="primary-button" data-new>重新准备 <span>→</span></button></div><p class="subtle">种子 ${state.seed} · 改变配装或重选一段，故事会走向不同的地方。</p>`;
  openDialog('result-dialog');
}
function renderAchievements(){
  $('achievement-list').innerHTML=ACHIEVEMENTS.map(a=>`<div class="achievement ${unlocked.includes(a.id)?'unlocked':''}"><span>${a.icon}</span><div><b>${a.name}</b><p>${a.desc}</p><small>${unlocked.includes(a.id)?'已经留下这段回声':'尚未解锁'}</small></div></div>`).join('');
}
function canAdd(id){
  const next=structuredClone(cart);next.items[id]=(next.items[id]||0)+1;
  const sum=cartSummary(next);return !sum.error&&sum.weight<=sum.capacity&&sum.price<=SCENARIOS[scenario].budget;
}
function renderSetup(){
  $('scenario-options').innerHTML=Object.entries(SCENARIOS).map(([id,s])=>`<button type="button" class="scenario-option ${id===scenario?'selected':''}" data-scenario="${id}" aria-pressed="${id===scenario}"><span class="option-tag">${s.tag}</span><strong>${s.name}</strong><p>${s.desc}</p></button>`).join('');
  $('backpack-options').innerHTML=Object.entries(BACKPACKS).map(([id,p])=>`<button type="button" class="backpack-option ${id===cart.backpack?'selected':''}" data-backpack="${id}" aria-pressed="${id===cart.backpack}"><span class="backpack-icon">▱</span><div><strong>${p.name}</strong><small>¥${p.price.toLocaleString()} · ${p.weight} kg</small></div><b>${p.capacity}<small>kg</small></b></button>`).join('');
  $('presets').innerHTML=Object.entries(PRESETS).map(([id,p])=>`<button class="preset-button" type="button" data-preset="${id}">${p.name}</button>`).join('');
  $('shop-tabs').innerHTML=CATEGORIES.map(([id,name])=>`<button class="shop-tab ${id===category?'selected':''}" data-category="${id}" aria-pressed="${id===category}">${name}</button>`).join('');
  $('shop-items').innerHTML=Object.entries(ITEMS).filter(([,item])=>item.category===category).map(([id,item])=>{
    const n=cart.items[id]||0;
    const control=item.max===1?`<button class="equip-button ${n?'equipped':''}" data-equip="${id}" aria-pressed="${!!n}" ${!n&&!canAdd(id)?'disabled':''}>${n?'已装入 ✓':'装入背包 +'}</button>`:`<div class="quantity"><button data-cart="${id}" data-delta="-1" ${!n?'disabled':''} aria-label="减少${item.name}">−</button><span aria-label="${item.name}数量">${n}</span><button data-cart="${id}" data-delta="1" ${!canAdd(id)?'disabled':''} aria-label="增加${item.name}">＋</button></div>`;
    return `<div class="shop-item"><div class="shop-item-head"><span class="item-icon">${item.icon}</span><h3>${item.name}</h3><small>${item.weight} kg</small></div><p>${item.desc}</p><div class="shop-item-bottom"><span><small>¥</small>${item.price.toLocaleString()}</span>${control}</div></div>`;
  }).join('');
  $('packing-list').innerHTML=CATEGORIES.map(([cat,name])=>{
    const items=Object.entries(ITEMS).filter(([id,item])=>item.category===cat&&(cart.items[id]||0)>0);
    return items.length?`<div class="packing-row pack-group">${name}</div>${items.map(([id,item])=>`<div class="packing-row"><span>${item.name}</span><b>×${cart.items[id]}</b></div>`).join('')}`:'';
  }).join('')||'<p class="subtle">还没有装入物品。选择分类逐件添加。</p>';
  const notes=[];
  if(!cart.items.tent)notes.push('没有帐篷，无法扎营。');if(!cart.items.down)notes.push('缺少保温中层，寒冷消耗更快。');if(!cart.items.satellite)notes.push('无卫星通信，求援需要到有信号的节点。');
  if((cart.items.ration||0)+(cart.items.meal||0)<6)notes.push('口粮偏少，途中会影响恢复与援助选项。');
  if(!cart.items.water)notes.push('背包里还没有饮水。');
  $('packing-notes').textContent=notes.length?notes.join(' '):'装备已留出多种处理方式。途中捡到物资、分享食物或丢弃装备，都会改变负重。';
  const sum=cartSummary(cart),remaining=SCENARIOS[scenario].budget-sum.price,valid=!sum.error&&remaining>=0&&sum.weight<=sum.capacity;
  $('cart-money').textContent=`¥${remaining.toLocaleString()}`;$('cart-money').className=remaining<0?'error':'';
  $('cart-weight').textContent=`${sum.weight.toFixed(2)} / ${sum.capacity} kg`;$('cart-weight').className=sum.weight>sum.capacity?'error':'';
  $('cart-weight-fill').style.width=`${clamp(sum.weight/sum.capacity*100)}%`;
  $('cart-error').textContent=sum.error||(remaining<0?'预算不足，请减少物品。':sum.weight>sum.capacity?'超过容量，换背包或减少物品。':'装备能解锁途中选项');
  $('start-button').disabled=!valid;
  $('resume-panel').hidden=!saved;
  if(saved)$('resume-panel').innerHTML=`<div><b>还有一段故事，停在${nodeAt(saved.state).name}。</b>${timeLabel(saved.state)} · ${saved.state.turn} 次决定 · ${saved.state.outcome?'已有结局':'已自动保存'}</div><button class="outline-button" data-resume>${saved.state.outcome?'查看上次旅程':'继续上次旅程'} →</button>`;
}
function openSetup(fresh=false){
  if(fresh)$('seed-input').value=randomSeed();
  $('close-setup').hidden=!started;renderSetup();openDialog('setup-dialog');
}
function randomSeed(){const n=new Uint32Array(1);crypto.getRandomValues(n);return n[0]%1000000000;}
function start(){
  try{state=createGame({scenario,backpack:cart.backpack,items:cart.items,seed:$('seed-input').value});}
  catch(e){toast(e.message);return;}
  history=[];branch=null;lastReport=null;selected='';allLog=false;started=true;
  $('setup-dialog').close();save();render();window.scrollTo({top:0,behavior:'instant'});
}
function resume(){
  if(!saved)return;state=structuredClone(saved.state);history=structuredClone(saved.history);branch=saved.branch||null;
  lastReport=history.at(-1)?.report||null;started=true;selected='';$('setup-dialog').close();render();
  if(state.outcome)showResult();
}
function exportRun(){
  if(!started){toast('开始旅程之后，可以导出完整记录。');return;}
  const blob=new Blob([JSON.stringify({title:'鳌太 · 每一步 / 风雪之间',version:2,exportedAt:new Date().toISOString(),state,history,branch},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`aotai-story-${state.seed}-${state.turn}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('start-button').addEventListener('click',start);
$('commit-button').addEventListener('click',()=>execute());
$('restart-button').addEventListener('click',()=>openSetup(true));
$('close-setup').addEventListener('click',()=>$('setup-dialog').close());
$('setup-dialog').addEventListener('cancel',e=>{if(!started)e.preventDefault();});
$('random-seed').addEventListener('click',()=>$('seed-input').value=randomSeed());
$('bag-button').addEventListener('click',()=>openDialog('bag-dialog'));
$('help-button').addEventListener('click',()=>openDialog('help-dialog'));
$('achievements-button').addEventListener('click',()=>{renderAchievements();openDialog('achievements-dialog');});
$('export-button').addEventListener('click',exportRun);
$('undo-button').addEventListener('click',()=>rewind(history.length-1));
$('journal-button').addEventListener('click',()=>$('journal-section').scrollIntoView({behavior:'smooth'}));
$('more-log').addEventListener('click',()=>{allLog=true;renderJournal();});
$('clear-cart').addEventListener('click',()=>{cart.items={};renderSetup();});
document.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button||button.disabled)return;
  const d=button.dataset;
  if(d.main){selected=d.main;renderStory();document.querySelector(`[data-main="${selected}"]`)?.focus({preventScroll:true});}
  if(d.do)execute(d.do);
  if(d.close)$(d.close).close();
  if(d.open)openDialog(d.open);
  if(d.rewind!==undefined)rewind(Number(d.rewind));
  if('result' in d)showResult();
  if('review' in d){$('result-dialog').close();$('journal-section').scrollIntoView({behavior:'smooth'});}
  if('new' in d){$('result-dialog').close();openSetup(true);}
  if('resume' in d)resume();
  let setupChanged=false,focus='';
  if(d.scenario){scenario=d.scenario;setupChanged=true;focus=`[data-scenario="${d.scenario}"]`;}
  if(d.backpack){cart.backpack=d.backpack;setupChanged=true;focus=`[data-backpack="${d.backpack}"]`;}
  if(d.preset){cart=structuredClone(PRESETS[d.preset]);setupChanged=true;focus=`[data-preset="${d.preset}"]`;}
  if(d.category){category=d.category;setupChanged=true;focus=`[data-category="${d.category}"]`;}
  if(d.cart){cart.items[d.cart]=clamp((cart.items[d.cart]||0)+Number(d.delta),0,ITEMS[d.cart].max);setupChanged=true;focus=`[data-cart="${d.cart}"][data-delta="${d.delta}"]`;}
  if(d.equip){cart.items[d.equip]=cart.items[d.equip]?0:1;setupChanged=true;focus=`[data-equip="${d.equip}"]`;}
  if(setupChanged){renderSetup();document.querySelector(focus)?.focus({preventScroll:true});}
});
document.addEventListener('keydown',e=>{
  if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||document.querySelector('dialog[open]')||!started)return;
  if(/^[1-5]$/.test(e.key)){
    const a=getActions(state).filter(a=>a.kind==='choice'||a.kind==='travel')[Number(e.key)-1];
    if(a&&!a.disabled){e.preventDefault();selected=a.id;renderStory();$('commit-button').focus();}
  }
  if(e.key.toLowerCase()==='b'){e.preventDefault();openDialog('bag-dialog');}
  if(e.key.toLowerCase()==='r'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();rewind(history.length-1);}
});
render();openSetup();
