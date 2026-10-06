import {createGame,step,getActions,weatherAt,forecast,nodeAt,NODES,SCENARIOS,PACKS,mean,weakest,timeLabel,riskLevel,validateSave,clamp} from './engine.mjs';

const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='aotai-every-step-v1';
const symbols={steady:'↗',fast:'⇈',shelter:'⌂',camp:'△',meal:'◒',care:'＋',water:'◉',retreat:'↙',sos:'◎',wait:'◷',event_wait:'◷',event_regroup:'↙',event_guess:'↗'};
let state=createGame(),history=[],selected='',started=false,branch=null,lastReport=null,toastTimer;
let saved=null;
try {
  const value=JSON.parse(localStorage.getItem(STORAGE));
  if(validateSave(value?.state)&&Array.isArray(value.history)&&value.history.length<=300&&value.history.every(e=>validateSave(e.before)&&e.report&&Array.isArray(e.report.notes)))saved=value;
} catch {}
function save() {
  if(!started)return;
  try{localStorage.setItem(STORAGE,JSON.stringify({state,history,branch}));}catch{toast('浏览器无法保存进度，可使用导出复盘保存记录。');}
}
function toast(message) {clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function meter(label,value,inverse=false,compact=false) {
  const v=Math.round(clamp(value)),danger=inverse?100-v:v;
  return `<div class="stat-row"><div><span>${esc(label)}</span><b>${v}${compact?'':' / 100'}</b></div><div class="stat-track"><div class="stat-fill ${danger<25?'critical':danger<45?'bad':''}" style="width:${v}%"></div></div></div>`;
}
function deltas(report) {
  if(!report)return '';
  const metrics=[['energy','体力'],['warmth','保温'],['cohesion','联系'],['food','口粮'],['water','储水'],['battery','电量']];
  return metrics.map(([key,label])=>{
    const n=Math.round((report.after[key]-report.before[key])*10)/10;
    if(!n)return '';
    return `<span class="${n>0?'positive':'negative'}">${label} ${n>0?'+':''}${n}${key==='water'?' L':''}</span>`;
  }).join('');
}
function map() {
  const ys=[98,78,57,41,30,47,24,37,60,81,100];
  const pts=NODES.map((n,i)=>({x:40+i*74,y:ys[i]}));
  const idx=Math.min(9,Math.floor(state.position)),fraction=state.position-idx;
  const current={x:pts[idx].x+(pts[idx+1].x-pts[idx].x)*fraction,y:pts[idx].y+(pts[idx+1].y-pts[idx].y)*fraction};
  const path=pts.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ');
  const travelled=pts.slice(0,idx+1).map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')+`L${current.x} ${current.y}`;
  $('route-map').innerHTML=`<path d="${path}L780 117L40 117Z" fill="#e3e7da"/><path d="${path}" stroke="#bdc8b2" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/><path d="${travelled}" stroke="#6f8f6d" stroke-width="2" fill="none"/>${pts.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${NODES[i].shelter>.5?3.6:2.3}" fill="${NODES[i].shelter>.5?'#86a07a':'#b7c0ab'}"/><text x="${p.x}" y="${p.y+16}" text-anchor="middle" fill="#828b79" font-size="8.2">${NODES[i].name}</text>`).join('')}<circle cx="${current.x}" cy="${current.y}" r="10" fill="#d9884830"/><circle cx="${current.x}" cy="${current.y}" r="4.3" fill="#d37b3f" stroke="#f5f3ec" stroke-width="1.7"/>`;
}
function render() {
  const w=weatherAt(state),node=nodeAt(state),risk=riskLevel(state),pack=PACKS[state.pack];
  $('session-label').innerHTML=`${esc(SCENARIOS[state.scenario].name)}<br>SEED ${esc(state.seed)}`;
  $('location-name').textContent=node.name;
  $('location-detail').textContent=`模拟海拔 ${node.alt.toLocaleString()} m · ${state.returning?'返回方向':'前行方向'}`;
  $('weather-pill').textContent=`${w.night?'☾':'◌'} ${w.kind}`;
  $('weather-metrics').innerHTML=`<span><strong>${w.temp}°</strong>气温</span><span><strong>${w.wind}</strong>模拟风力</span><span><strong>${w.visibility}</strong>视距 m</span>`;
  $('terrain-chip').textContent=state.camp?'△ 营地遮蔽中':state.cover>0?'⌂ 短期遮蔽中':node.shelter>.5?'林木 / 地形遮蔽':'开阔地形 · 风雨暴露';
  $('landscape').classList.toggle('storm',w.inStorm);$('landscape').classList.toggle('night',w.night);
  $('progress-label').textContent=`${Math.round(state.position*10)}% 行程位置`;
  $('direction-label').textContent=state.rescue?'救援请求已建立':state.returning?'向山脚撤离':'向接应点前行';map();
  $('turn-tag').textContent=`第 ${state.turn+1} 次决策`;
  $('clock').textContent=timeLabel(state);
  $('risk-badge').className=`risk-badge risk-${risk.level}`;$('risk-badge').textContent=`环境风险 ${risk.name}`;
  $('team-stats').innerHTML=meter('平均体力',mean(state,'energy'))+meter('平均保温',mean(state,'warmth'))+meter('队伍联系',state.cohesion)+meter('衣物湿度',state.wetness,true);
  $('condition-line').innerHTML=`<span>饱食 ${Math.round(state.satiety)}</span><span>补水 ${Math.round(state.hydration)}</span><span>装备完好 ${Math.round(state.gear)}</span>`;
  $('members').innerHTML=state.members.map(m=>{
    const status=m.injury?`扭伤 ${m.injury} 级`:Math.min(m.warmth,m.energy)<25?'需要照顾':Math.min(m.warmth,m.energy)<45?'状态下降':'状态稳定';
    return `<div class="member"><div class="member-heading"><span class="avatar">${esc(m.name[0])}</span><div><strong>${esc(m.name)}</strong><div class="member-role">${esc(m.role)}</div></div><span class="member-status ${Math.min(m.warmth,m.energy)<25?'negative':''}">${status}</span></div><div class="member-bars">${meter('体力',m.energy,false,true)}${meter('保温',m.warmth,false,true)}</div></div>`;
  }).join('');
  $('pack-name').textContent=`${pack.weight} kg`;
  $('resources').innerHTML=`<div><div class="resource-value ${state.food<6?'negative':''}">${state.food}<small>份</small></div><div class="resource-label">全队口粮</div></div><div><div class="resource-value ${state.water<1?'negative':''}">${state.water.toFixed(1)}<small>L</small></div><div class="resource-label">储水</div></div><div><div class="resource-value ${state.battery<20?'negative':''}">${Math.round(state.battery)}<small>单位</small></div><div class="resource-label">通信电量</div></div><div><div class="resource-value">${pack.tent?'有':'无'}<small>帐篷</small></div><div class="resource-label">${pack.satellite?'卫星通信可用':'仅手机通信'}</div></div><div class="resource-details">${esc(pack.name)} · 保温效能 ${Math.round(pack.insulation*100)}%</div>`;
  $('rescue-panel').innerHTML=state.rescue?`<div class="rescue-active"><b>◎ 救援请求已建立</b>尚需约 ${state.rescue.remaining*20} 分钟的有效接近时间${w.inStorm?' · 风雪可能延迟':''}。保温和位置仍会影响结果。</div>`:'';
  $('forecast').innerHTML=forecast(state).map(f=>`<div class="forecast-item"><span>${f.label} · ${esc(f.kind)}</span><strong>${f.temp}°</strong><small>${esc(f.confidence)}</small></div>`).join('');
  $('decision-title').textContent=state.outcome?'这一程，值得回看。':state.event?'先处理眼前的不确定。':'这一刻，你如何决定？';
  $('event-panel').hidden=!state.event;
  $('event-panel').innerHTML=state.event?`<div class="event-box"><b>◈ ${esc(state.event.title)}</b><p>${esc(state.event.body)}</p></div>`:'';
  const actions=getActions(state);
  if(!actions.some(a=>a.id===selected&&!a.disabled))selected=actions.find(a=>!a.disabled)?.id||'';
  $('action-grid').innerHTML=state.outcome?`<div class="outcome-inline" style="grid-column:1/-1"><h3>${esc(state.outcome.title)}</h3><p>${esc(state.outcome.body)}</p><button class="outline-button" data-result>查看本次评估</button></div>`:actions.map((a,i)=>`<button class="action-card ${a.id===selected?'selected':''}" data-action="${a.id}" aria-pressed="${a.id===selected}" ${a.disabled?'disabled':''} ${a.disabled?`title="${esc(a.disabled)}"`:''}><div class="action-top"><span class="action-symbol">${symbols[a.id]}</span><strong>${esc(a.title)}</strong></div><p>${esc(a.disabled||a.desc)}</p><div class="action-tags"><span>${a.minutes} 分钟</span>${a.tags.filter(t=>!t.includes('分')).map(t=>`<span>${esc(t)}</span>`).join('')}</div></button>`).join('');
  renderSelection();renderFeedback();renderJournal();
}
function renderSelection() {
  const a=getActions(state).find(a=>a.id===selected);
  $('commit-button').disabled=!started||!a||!!a.disabled||!!state.outcome;
  $('selected-label').textContent=state.outcome?'在下方复盘里，试试另一种选择':a?`${a.title} · ${a.minutes} 分钟`:'先选择一个行动';
  $('selected-description').textContent=state.outcome?'点击任意记录的「从此处重选」，回到那个决策发生前。':a?a.desc:'每一步先观察，再决定。';
  document.querySelectorAll('[data-action]').forEach(b=>{b.classList.toggle('selected',b.dataset.action===selected);b.setAttribute('aria-pressed',String(b.dataset.action===selected));});
}
function renderFeedback() {
  if(!lastReport){$('feedback-panel').innerHTML='';return;}
  const r=lastReport;
  let comparison='';
  if(branch&&r.turn===branch.turn){
    const old=branch.report;
    comparison=`<div class="branch-note">同一时刻的另一种选择：原先执行「${esc(old.title)}」，平均体力变化 ${Math.round(old.after.energy-old.before.energy)}、保温变化 ${Math.round(old.after.warmth-old.before.warmth)}。现在执行「${esc(r.title)}」，见本步变化。两种行动耗时可能不同。</div>`;
  }
  $('feedback-panel').innerHTML=`${comparison}<div class="feedback-header"><strong>第 ${r.turn} 步 · ${esc(r.title)}</strong><span>+ ${r.minutes} 分钟</span></div><div class="delta-list">${deltas(r)}</div><ul>${r.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`;
}
function renderJournal() {
  $('log-count').textContent=history.length?`${history.length} 步决策 · 可从任一步重选`:'尚未做出决策';
  $('journal').innerHTML=(branch?`<div class="branch-note">已从第 ${branch.turn} 步分支。原决策为「${esc(branch.report.title)}」${branch.outcome?`，原结局「${esc(branch.outcome.title)}」，评估 ${branch.outcome.score} 分`:''}。情境种子和之前的状态已保留。</div>`:'')+(history.length?history.slice().reverse().map((entry,reverseIndex)=>{
    const i=history.length-1-reverseIndex,r=entry.report;
    return `<div class="journal-entry"><div class="journal-time"><b>${String(r.turn).padStart(2,'0')}</b>${esc(timeLabel(entry.before).replace('第 1 天 ',''))}</div><details class="journal-body" ${reverseIndex===0?'open':''}><summary>${esc(r.title)} <span class="neutral">／ ${r.minutes} 分钟 · ${esc(r.weather.kind)}</span></summary><div class="delta-list">${deltas(r)}</div><ul>${r.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details><button class="rewind-button" data-rewind="${i}">从此处重选 ↶</button></div>`;
  }).join(''):'<div class="empty-journal">还没有脚印。做出第一个决策后，这里会记录状态变化和原因。</div>');
}
function execute() {
  if(!started||state.outcome)return;
  const before=structuredClone(state),result=step(state,selected);
  if(result.error){toast(result.error);return;}
  state=result.state;lastReport=result.report;history.push({before,report:result.report});selected='';save();render();
  if(state.outcome)showResult();
}
function rewind(index) {
  const entry=history[index];if(!entry)return;
  branch={turn:entry.report.turn,report:structuredClone(entry.report),outcome:state.outcome?structuredClone(state.outcome):null};
  state=structuredClone(entry.before);history=history.slice(0,index);lastReport=history.at(-1)?.report||null;selected='';started=true;
  $('result-dialog').close();save();render();toast(`已回到第 ${entry.report.turn} 步之前，重新选择下一步。`);
  $('decision-title').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
}
function showResult() {
  if(!state.outcome)return;
  const o=state.outcome;
  $('result-content').innerHTML=`<div class="modal-top"><span class="eyebrow">THE JOURNEY / REVIEW</span><button class="icon-button" data-close="result-dialog" aria-label="关闭结局评估">×</button></div><div class="result-symbol">${o.kind==='critical'?'◈':'△'}</div><h2>${esc(o.title)}</h2><p>${esc(o.body)}</p><div class="score-block"><strong>${o.score}<small style="font-size:16px"> / 100</small></strong><span>决策评估 · 优先考虑全队状态</span></div><p>${state.turn} 次决策 · ${state.tick*20} 分钟<br>最弱队员体力 ${Math.round(weakest(state,'energy'))} / 保温 ${Math.round(weakest(state,'warmth'))}</p>${branch?.outcome?`<div class="branch-note" style="margin-top:17px">原分支：${esc(branch.outcome.title)} · ${branch.outcome.score} 分<br>本分支：${esc(o.title)} · ${o.score} 分</div>`:''}<div class="result-actions" style="margin-top:22px"><button class="outline-button" data-review>回看每一步</button><button class="primary-button" data-new>新的推演 →</button></div><p class="help-small">安全撤离与救援完成同样是有效结局。<br>模型分数不代表真实环境中的安全概率。</p>`;
  if(!$('result-dialog').open)$('result-dialog').showModal();
}
function openSetup() {
  $('close-start').hidden=!started;$('resume-button').hidden=!saved;
  if(started){const form=$('setup-form');form.elements.scenario.value=state.scenario;form.elements.pack.value=state.pack;form.elements.seed.value=state.seed;}
  if(!$('start-dialog').open)$('start-dialog').showModal();
}
function exportRun() {
  if(!started){toast('先开始一场推演，才能导出记录。');return;}
  const payload={title:'鳌太 · 每一步',exportedAt:new Date().toISOString(),model:'fictional-mountain-v1',state,history,branch};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`aotai-${state.seed}-step-${state.turn}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出完整决策记录。');
}
$('setup-form').addEventListener('submit',e=>{
  e.preventDefault();const data=new FormData(e.currentTarget);
  state=createGame({scenario:data.get('scenario'),pack:data.get('pack'),seed:data.get('seed')});history=[];branch=null;lastReport=null;selected='';started=true;saved=null;
  $('start-dialog').close();save();render();toast('推演开始。目标：带所有队员安全回家。');
});
$('resume-button').addEventListener('click',()=>{if(!saved)return;state=saved.state;history=saved.history;branch=saved.branch||null;lastReport=history.at(-1)?.report||null;started=true;selected='';$('start-dialog').close();render();toast('已恢复上次的推演。');});
$('start-dialog').addEventListener('cancel',e=>{if(!started)e.preventDefault();});
$('close-start').addEventListener('click',()=>$('start-dialog').close());
$('restart-button').addEventListener('click',()=>{saved=started?{state,history,branch}:saved;openSetup();});
$('help-button').addEventListener('click',()=>$('help-dialog').showModal());
$('export-button').addEventListener('click',exportRun);
$('commit-button').addEventListener('click',execute);
document.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]');if(action&&!action.disabled){selected=action.dataset.action;renderSelection();}
  const rewindButton=e.target.closest('[data-rewind]');if(rewindButton)rewind(Number(rewindButton.dataset.rewind));
  const closer=e.target.closest('[data-close]');if(closer)$(closer.dataset.close).close();
  if(e.target.closest('[data-result]'))showResult();
  if(e.target.closest('[data-review]')){$('result-dialog').close();$('journal').scrollIntoView({behavior:'smooth',block:'start'});}
  if(e.target.closest('[data-new]')){$('result-dialog').close();saved={state,history,branch};openSetup();}
});
document.addEventListener('keydown',e=>{
  if(!started||document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  if(/^[1-9]$/.test(e.key)){const a=getActions(state)[Number(e.key)-1];if(a&&!a.disabled){e.preventDefault();selected=a.id;renderSelection();$('commit-button').focus();}}
  if(e.key==='Enter'&&e.target===document.body){e.preventDefault();execute();}
});
render();openSetup();
