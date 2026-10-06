import {VERSION,SCENARIOS,BACKPACKS,ITEMS,PRESETS,NODES,NODE_BY_ID,EVENTS,ARRIVAL_EVENTS,RANDOM_EVENTS} from './data.mjs?v=2';
export {VERSION,SCENARIOS,BACKPACKS,ITEMS,PRESETS,NODES,EVENTS};
export const clamp=(v,min=0,max=100)=>Math.min(max,Math.max(min,v));
const clone=x=>structuredClone(x);
const defined=(table,id)=>typeof id==='string'&&Object.hasOwn(table,id);
const has=(s,id,n=1)=>(s.inventory[id]||0)>=n;
const statKeys=['health','energy','warmth','san','satiety','hydration','wetness','battery','durability'];
const conditionNames={gastro:'肠胃不适',ankle:'脚踝疼痛',altitude:'高处不适',leak:'装备进水'};
export function roll(seed,key){
  let h=2166136261;
  for(const c of `${seed}:${key}`)h=Math.imul(h^c.charCodeAt(0),16777619);
  h^=h>>>16;h=Math.imul(h,2246822507);h^=h>>>13;
  return (h>>>0)/4294967296;
}
export function cartSummary({backpack='trek',items={}}={}){
  const bag=defined(BACKPACKS,backpack)?BACKPACKS[backpack]:null;
  if(!bag)return {error:'请选择有效背包',price:0,weight:0,capacity:0};
  let price=bag.price,weight=bag.weight,error='';
  for(const [id,n] of Object.entries(items)){
    const item=defined(ITEMS,id)?ITEMS[id]:null;
    if(!item||!Number.isInteger(n)||n<0||n>item.max){error='物品数量无效';continue;}
    price+=n*item.price;weight+=n*item.weight;
  }
  return {price,weight:+weight.toFixed(2),capacity:bag.capacity,error};
}
export const nodeAt=s=>NODE_BY_ID[s.node];
export function weightOf(s){return +(BACKPACKS[s.backpack].weight+s.cargo+s.emptyBatteries*.25+Object.entries(s.inventory).reduce((v,[id,n])=>v+ITEMS[id].weight*n,0)).toFixed(2);}
export function createGame({scenario='letter',backpack,items,seed=261006}={}){
  if(!defined(SCENARIOS,scenario))throw Error('无效故事');
  backpack??=PRESETS.balanced.backpack;items??=PRESETS.balanced.items;
  const cart=cartSummary({backpack,items});
  if(cart.error||cart.price>SCENARIOS[scenario].budget||cart.weight>cart.capacity)throw Error(cart.error||'预算或背包容量不足');
  if(!Number.isInteger(Number(seed))||Number(seed)<0||Number(seed)>999999999)throw Error('种子应为 0–999999999 的整数');
  return {version:VERSION,scenario,backpack,seed:Number(seed),inventory:clone(items),money:SCENARIOS[scenario].budget-cart.price,
    initialWeight:cart.weight,emptyBatteries:0,cargo:0,clock:0,turn:0,node:'foot',path:['foot'],visited:['foot'],returning:false,
    health:100,energy:94,warmth:94,san:90,satiety:86,hydration:90,wetness:0,battery:100,durability:100,
    companion:null,conditions:[],delayed:[],flags:{},merit:0,route:null,target:null,camped:false,rescue:null,quest:null,
    event:scenario==='search'?'briefing':'notice',eventQueue:[],seen:[],outcome:null};
}
export function timeLabel(s){
  const mins=Math.round(6*60+s.clock*60);
  return `第 ${Math.floor(mins/1440)+1} 天 ${String(Math.floor(mins/60)%24).padStart(2,'0')}:${String(Math.floor(mins%60)).padStart(2,'0')}`;
}
export function weatherAt(s,clock=s.clock,node=s.node){
  const cfg=SCENARIOS[s.scenario],loc=NODE_BY_ID[node],slot=Math.floor(clock/5),r=roll(s.seed,`weather:${slot}`);
  const inStorm=clock>=cfg.storm[0]&&clock<cfg.storm[1];
  let kind='云隙晴光',wind=2,rain=0,visibility=120,icon='☀';
  if(r>.74){kind='山间浓雾';wind=4;rain=1;visibility=18;icon='≋';}
  else if(r>.4){kind='阴云渐厚';wind=5;visibility=60;icon='☁';}
  if(inStorm){kind=cfg.cold<=0?'暴风雪':'风雪交加';wind=10;rain=3;visibility=8;icon='❄';}
  const hour=(6+clock)%24,night=hour>=18||hour<6;
  const temp=Math.round(cfg.cold-(loc.alt-1900)/240-(inStorm?7:0)-(night?4:0));
  const severity=clamp(wind*.09+Math.max(0,9-temp)*.055+rain*.2,.2,3.2);
  return {kind,wind,rain,visibility,icon,night,temp,severity,inStorm,hour};
}
export function forecast(s){return [3,6].map(h=>({hours:h,...weatherAt(s,s.clock+h)}));}
export function conditionLabel(c){return conditionNames[c.id]||c.id;}
export function riskLevel(s){
  const score=(100-s.warmth)*.3+(100-s.energy)*.2+(100-s.health)*.4+weatherAt(s).severity*12+s.conditions.length*5;
  return score>65?{name:'需要立即调整',level:3}:score>45?{name:'状态吃紧',level:2}:score>28?{name:'留意变化',level:1}:{name:'节奏尚稳',level:0};
}
export function questLabel(s){
  if(!s.quest)return s.flags.voiceClue?'尚未报告的哨音线索':'许舟的下落未明';
  const q=s.quest;
  if(q.status==='rescued')return '许舟已等到救援';
  if(q.status==='failed')return '许舟的等待窗口已错过';
  if(q.status==='reported')return `救援接近中 · 约 ${Math.ceil(q.remaining)} 小时`;
  if(q.status==='found')return '已找到许舟 · 正在决定援助方式';
  return `需要报告位置 · 剩余 ${Math.max(0,Math.ceil(q.deadline-s.clock))} 小时`;
}
function requirement(s,req={}){
  for(const [id,n] of Object.entries(req.items||{}))if(!has(s,id,n))return `需要 ${ITEMS[id].name}${n>1?` ×${n}`:''}`;
  if(req.battery&&s.battery<req.battery)return `需要至少 ${req.battery} 点电量`;
  return '';
}
function travelPlan(s,pace='steady'){
  const target=s.returning?s.path.at(-2):(s.target||nodeAt(s).next);
  if(!target)return null;
  const loc=NODE_BY_ID[target],w=weatherAt(s),base=s.returning?Math.max(1,nodeAt(s).hours*.75):loc.hours;
  const injury=s.conditions.some(c=>c.id==='ankle')?1.18:1,weakness=s.energy<30?1.2:1;
  const factor=pace==='fast'?.72:pace==='careful'?1.22:1;
  const hours=Math.max(.6,(base+(s.route?.hours||0))*factor*injury*weakness*(w.inStorm?1.15:1));
  return {target,minutes:Math.round(hours*60/5)*5,cover:clamp((loc.shelter+nodeAt(s).shelter)/4+(s.route?.cover||0),0,.9)};
}
export function getActions(s){
  if(s.outcome)return [];
  const actions=[];
  const add=(id,title,desc,minutes,disabled='',kind='utility',extra={})=>actions.push({id,title,desc,minutes,disabled,kind,...extra});
  if(s.event&&!s.returning&&!s.rescue){
    for(const c of EVENTS[s.event].choices){
      const expired=s.event==='hiker'&&s.quest?.status==='failed'&&c.id!=='report';
      add(`choice:${c.id}`,c.title,c.desc,c.minutes,expired?'许舟的等待窗口已经错过':requirement(s,c.requires),'choice');
    }
  }else if(!s.rescue){
    for(const pace of ['steady','fast','careful']){
      const p=travelPlan(s,pace);if(!p)continue;
      const titles={steady:s.returning?'继续沿来路撤离':'保持节奏前进',fast:'加快这一段',careful:'谨慎走这一段'};
      const desc={steady:`前往${NODE_BY_ID[p.target].name}，平衡时间与消耗。`,fast:'节省时间，消耗更多体力，受伤概率更高。',careful:'多花时间确认落点与方向，降低受伤概率。'};
      add(`move:${pace}`,titles[pace],desc[pace],p.minutes,s.energy<8?'体力不足，先补给或休息':'','travel',{target:p.target});
    }
  }
  add('rest','短暂休息','停留一小时。有遮蔽、睡袋和充足补给时恢复更好。',60);
  add('camp','扎营休整','休整六小时，持续消耗饱腹、补水与电量。',360,has(s,'tent')?'':'需要抗风帐篷');
  add('heat','开炉取暖','消耗 1 份燃气，恢复保温并烘干衣物。',40,requirement(s,{items:{stove:1,fuel:1}}));
  add('refill','处理水源，装满水瓶','增加最多 4 瓶水，上限 8 瓶。',45,!nodeAt(s).water?'这里没有水源':!has(s,'filter')&&!has(s,'stove')?'需要净水工具或炉具':!has(s,'filter')&&!has(s,'fuel')?'烧水需要燃气':has(s,'water',8)?'水瓶已经装满':'');
  add('repair','修整装备','完整度 +22，需要工具并停留一小时。',60,requirement(s,{items:{repair:1}}));
  const contact=(has(s,'satellite')||nodeAt(s).signal)&&s.battery>=25;
  if(s.rescue)add('wait','守在定位点等待','等待两小时；有帐篷时会利用遮蔽，仍需进食与保温。',120);
  else add('sos','发送定位，请求撤离','25 点电量，建立自己的救援请求。等待期间不能继续移动。',20,contact?'':'需要卫星通信器或手机信号，以及 25 点电量');
  if(!s.returning&&!s.rescue)add('retreat','决定沿来路撤离','改变行程目标，之后仍需逐段走回山脚。',15);
  if(nodeAt(s).signal&&s.quest?.status==='waiting')add('report','报告许舟的位置','把位置和伤情交给救援人员，等待进度将继续推进。',20,s.battery<8?'需要 8 点电量':'');
  if(s.node==='hut')add('resupply','购买小屋补给','花费 300 元，获得 3 份口粮、1 个医疗包、4 瓶水。',30,s.flags.resupplied?'已经领取过这批补给':s.money<300?'剩余预算不足 300 元':'');
  for(const [id,item] of Object.entries(ITEMS)){
    if(!item.usable||!has(s,id))continue;
    const disabled=id==='meal'?requirement(s,{items:{stove:1,fuel:1,water:1}}):'';
    add(`use:${id}`,`使用${item.name}`,item.desc,id==='meal'?35:id==='med'?30:10,disabled,'item');
  }
  for(const [id,n] of Object.entries(s.inventory))if(n>0)add(`drop:${id}`,`丢弃一件${ITEMS[id].name}`,'丢弃后无法取回，会减轻负重；记录可回溯。',0,'','drop');
  return actions;
}
function addCondition(s,id,notes){
  if(!s.conditions.some(c=>c.id===id)){s.conditions.push({id});notes.push(`出现持续状态：${conditionNames[id]}。它会影响之后的消耗，可以使用医疗包或修整处理。`);}
}
function addItems(s,items,notes){
  for(const [id,n] of Object.entries(items)){
    const before=s.inventory[id]||0;s.inventory[id]=Math.min(ITEMS[id].max,before+n);
    const gained=s.inventory[id]-before;
    if(gained)notes.push(`${ITEMS[id].name} +${gained}。`);
    if(gained<n)notes.push(`${ITEMS[id].name}已到携带数量上限，未带走多余物资。`);
  }
}
function reportQuest(s,notes){
  if(s.quest?.status==='waiting'){
    s.quest.status='reported';s.quest.remaining=weatherAt(s).inStorm?9:6;
    notes.push('许舟的位置已送达。救援已出发，但仍需要赶在他的等待窗口内接近。');
  }else if(s.flags.voiceClue&&!s.flags.clueReported){s.flags.clueReported=true;s.merit++;notes.push('你报告了哨音线索。值守员会核查，但目前没有许舟获救的确认。');}
  else if(s.quest?.status==='failed')notes.push('你送到了位置，但此前留下的等待窗口已经耗尽。消息无法改变已经错过的时间。');
}
function startRescue(s,notes){
  s.rescue={remaining:weatherAt(s).inStorm?13:9,node:s.node};s.event=null;s.eventQueue=[];
  notes.push('自己的救援请求已确认。保持定位点，预计等待 9–13 个游戏小时；强风雪会拖慢接近。');
}
function applyEffect(s,e,notes){
  for(const [id,n] of Object.entries(e.cost||{})){s.inventory[id]-=n;notes.push(`${ITEMS[id].name} −${n}。`);}
  for(const key of statKeys)if(Number.isFinite(e[key]))s[key]=clamp(s[key]+e[key]);
  if(e.grant)addItems(s,e.grant,notes);
  if(e.flags)Object.assign(s.flags,e.flags);
  if(e.condition)addCondition(s,e.condition,notes);
  if(e.remove)s.conditions=s.conditions.filter(c=>c.id!==e.remove);
  if(e.delayed){s.delayed.push({id:e.delayed,at:s.clock+4+roll(s.seed,`delay:${s.turn}`)*3});notes.push('眼前没有明显异常。你的选择已经写入后续事件。');}
  if(e.merit)s.merit+=e.merit;
  if(e.cargo)s.cargo+=e.cargo;
  if(e.target)s.target=e.target;
  if(e.route)s.route=clone(e.route);
  if(e.returning){s.returning=true;s.eventQueue=[];}
  if(e.companion==='join'){s.companion={name:'鹿宁'};notes.push('鹿宁加入同行。她会帮你核对信息，缓解精神消耗。');}
  if(e.companion==='leave'){s.companion=null;notes.push('鹿宁在营地等接应。你们把各自的下一步说清楚了。');}
  if(e.companion==='part'){
    s.companion=null;
    if(s.flags.trust){addItems(s,{med:1},notes);s.flags.helpedCompanion=true;notes.push('告别前，鹿宁把备用医疗包留给了你：“你之前帮过我。”');}
    else notes.push('你们互相道别，她沿来路下撤。');
  }
  if(e.quest&&s.quest?.status!=='failed'){
    const deadline=s.clock+({direct:32,provision:34,basic:20,bare:12,together:36}[e.quest])*(s.scenario==='search'?.82:1);
    s.quest={status:['direct','together'].includes(e.quest)?'reported':'waiting',deadline,remaining:['direct','together'].includes(e.quest)?(weatherAt(s).inStorm?11:8):null,mode:e.quest};
    notes.push(`援助已记下。${s.quest.status==='reported'?'救援已出发。':`你需要报告位置；当前等待窗口约 ${Math.round(deadline-s.clock)} 小时。`}`);
  }
  if(e.reportQuest)reportQuest(s,notes);
  if(e.rescue)startRescue(s,notes);
  if(e.random==='lost'){
    if(roll(s.seed,`lost:${s.turn}`)<.72){s.delayed.push({id:'lost',at:s.clock+.5});notes.push('你按脚印走了一段。方向仍未得到确认。');}
    else{s.san=clamp(s.san+2);notes.push('这次脚印恰好通向正确方向。');}
  }
  if(e.random==='takin'){
    if(roll(s.seed,`animal:${s.turn}`)<.75){s.health=clamp(s.health-18);s.energy=clamp(s.energy-15);addCondition(s,'ankle',notes);notes.push('它突然向前冲。慌乱后退时，你摔倒并受了伤。');}
    else notes.push('它离开了。这一次没有发生冲突。');
  }
  if(e.random==='ford'){
    if(roll(s.seed,`ford:${s.turn}`)<.68){s.wetness=clamp(s.wetness+55);s.health=clamp(s.health-7);addCondition(s,'ankle',notes);notes.push('落脚的石块转动了，你跌入冷水。');}
    else{s.wetness=clamp(s.wetness+12);notes.push('勉强跨过，鞋袜还是湿了。');}
  }
}
function summary(s){return Object.fromEntries([...statKeys,'clock'].map(k=>[k,+s[k].toFixed(1)]).concat([['weight',weightOf(s)]]));}
function end(s,kind,title,text){
  if(s.outcome)return;
  const safe=kind!=='critical',achievements=[];
  if(safe)achievements.push('home');
  if(kind==='completed')achievements.push('crossing');
  if(s.quest?.status==='rescued'&&safe)achievements.push('rescuer');
  if(kind==='retreated'&&s.flags.escort)achievements.push('escort');
  if(safe&&s.flags.litter)achievements.push('leaveNoTrace');
  if(kind==='completed'&&s.initialWeight<18)achievements.push('light');
  if(s.scenario==='snow'&&['completed','rescued'].includes(kind))achievements.push('winter');
  if(safe&&s.merit>=7)achievements.push('kindness');
  s.outcome={kind,title,text,achievements,quest:s.quest?.status||'unknown'};
}
function advanceTime(s,hours,context,notes){
  let left=hours;
  while(left>1e-6&&!s.outcome){
    const dt=Math.min(.25,left),loc=NODE_BY_ID[context.target||s.node],w=weatherAt(s,s.clock,loc.id);
    const goodGear=clamp(s.durability/70,.3,1),tent=has(s,'tent')&&s.durability>15;
    const baseCover=context.rest||s.camped?(loc.shelter>=.95?1:tent?(.48+loc.shelter*.4)*goodGear:loc.shelter*.55):loc.shelter*.45;
    const cover=clamp(context.cover??baseCover,0,1),exposure=1-cover,moving=!!context.moving,resting=!!context.rest;
    const gastro=s.conditions.some(c=>c.id==='gastro'),ankle=s.conditions.some(c=>c.id==='ankle'),altitude=s.conditions.some(c=>c.id==='altitude'),leak=s.conditions.some(c=>c.id==='leak');
    s.wetness=clamp(s.wetness+(w.rain*6*exposure*(has(s,'shell')?.28:1)+(leak?1:0)-cover*8)*dt);
    const insulation=((has(s,'down')?.55:0)+(has(s,'shell')?.22:0)+(has(s,'gloves')?.09:0))*goodGear;
    const cold=w.severity*7*(1-insulation*.92)*exposure+s.wetness*.018+(s.energy<15?1.8:0);
    const warmGain=(moving?1.1:0)+(resting&&has(s,'bag')?3.2*cover:0)+(resting&&tent?1.4*cover:0);
    s.warmth=clamp(s.warmth+(warmGain-cold)*dt);
    const load=Math.max(0,weightOf(s)-11)*.32+Math.max(0,weightOf(s)-BACKPACKS[s.backpack].capacity)*1.2;
    const work=moving?(6.5+load+(context.fast?3.2:0)+(ankle?2:0)+(altitude?2:0)-(has(s,'poles')?.6:0)):.65;
    const shortage=(s.satiety<15?2:0)+(s.hydration<15?3:0)+(gastro?1.5:0);
    const recovery=resting?(has(s,'bag')?7.5:4)*(has(s,'mat')?1.13:1)*Math.max(.3,cover)*(s.satiety>15&&s.hydration>15?1:.35):0;
    s.energy=clamp(s.energy+(recovery-work-shortage)*dt);
    s.satiety=clamp(s.satiety-((moving?4.8:2.4)+(gastro?4:0))*dt);
    s.hydration=clamp(s.hydration-((moving?6:2.7)+(gastro?5:0))*dt);
    const stress=(w.night&&moving?1.6:.5)+(s.warmth<25?2:0)+(s.energy<15?1.5:0);
    s.san=clamp(s.san+((resting?2.4:0)+(s.companion?.4:0)-stress)*dt);
    const harm=(s.warmth<15?(15-s.warmth)*.6:0)+(s.energy<=0?4:0)+(s.satiety<=0?2.5:0)+(s.hydration<=0?5:0)+(s.san<=0?3:0)+(gastro?.6:0)+(altitude&&moving?.4:0);
    s.health=clamp(s.health+(resting&&harm===0&&cover>.6?.6:-harm)*dt);
    s.battery=clamp(s.battery-(.28+(moving&&has(s,'gps')?.65:0)+(moving&&w.night&&has(s,'lamp')?.8:0))*dt);
    s.durability=clamp(s.durability-((moving?.45:0)+(w.inStorm&&tent&&resting?.8:0)+(leak?1.2:0))*dt);
    s.clock+=dt;left-=dt;
    const ready=s.delayed.filter(d=>d.at<=s.clock);s.delayed=s.delayed.filter(d=>d.at>s.clock);
    for(const d of ready){
      if(d.id==='lost'){s.energy=clamp(s.energy-14);s.san=clamp(s.san-12);s.flags.lost=true;notes.push('绕行后才发现方向判断错了。你退回确认点，体力与精神额外消耗。');left+=1.5;}
      else if(d.id==='leak')addCondition(s,'leak',notes);
      else if(roll(s.seed,`ill:${d.at.toFixed(3)}`)<.8)addCondition(s,d.id,notes);
      else notes.push('身体暂时没有出现不适。');
    }
    if(s.quest&&['waiting','reported','found'].includes(s.quest.status)){
      if(s.quest.status==='reported')s.quest.remaining=Math.max(0,s.quest.remaining-dt*(w.inStorm?.65:1));
      if(s.quest.status==='reported'&&s.quest.remaining<=0){s.quest.status='rescued';notes.push('通信里传来确认：救援已经接近许舟。他等到了。');}
      else if(s.clock>=s.quest.deadline){s.quest.status='failed';s.san=clamp(s.san-12);notes.push('许舟的等待窗口耗尽，救援未能及时接近。这一支线已经改变。');}
    }
    if(s.health<=0){end(s,'critical','没能等到天亮','身体状态耗尽，行程停在了这里。看看最早出现的风险信号，从那一步重新选择。');break;}
    if(s.rescue){
      s.rescue.remaining=Math.max(0,s.rescue.remaining-dt*(w.inStorm?.65:1));
      if(s.rescue.remaining<=0){end(s,'rescued',s.quest?.status==='rescued'?'你们一起看见了灯光':'灯光终于照到了你','你守住了定位点，也把剩余物资用在了等待上。救援完成，这次行程到此结束。');break;}
    }
    if(s.clock>=96){end(s,'critical','山里的时间用尽了','行程超过了四个游戏日，补给和行动窗口失去控制。回看绕行、停留与撤离的决定。');break;}
  }
}
function arrival(s,notes){
  const id=s.node;if(s.visited.includes(id))return;
  s.visited.push(id);let events=[];
  if(ARRIVAL_EVENTS[id])events.push(ARRIVAL_EVENTS[id]);
  if(id==='hollow')s.quest={status:'found',deadline:s.clock+12,remaining:null,mode:'found'};
  if(id==='camp'&&s.companion)events.push('companionCamp');
  const pool=(RANDOM_EVENTS[id]||[]).filter(e=>!s.seen.includes(e)&&!(e==='storm'&&!weatherAt(s).inStorm));
  if(pool.length)events.push(pool[Math.floor(roll(s.seed,`arrival:${id}`)*pool.length)]);
  if(weatherAt(s).night&&id!=='hut'&&!s.seen.includes('dusk'))events.push('dusk');
  if(s.san<36&&!s.seen.includes('hallucination'))events.unshift('hallucination');
  events=[...new Set(events)].filter(e=>!s.seen.includes(e));s.eventQueue=events.slice(1);s.event=events[0]||null;
  if(s.event)notes.push(`新的情境：${EVENTS[s.event].title}`);
}
function useItem(s,id,notes){
  s.inventory[id]--;
  const effects={ration:{satiety:46,energy:10},snack:{energy:15,satiety:18},water:{hydration:46},warmer:{warmth:20},blanket:{warmth:25},battery:{battery:45},patch:{durability:30},med:{health:10}};
  if(id==='meal')applyEffect(s,{cost:{fuel:1,water:1},satiety:65,energy:22,warmth:16,hydration:20,san:5},notes);
  else applyEffect(s,effects[id]||{},notes);
  if(id==='battery')s.emptyBatteries++;
  if(id==='patch')s.conditions=s.conditions.filter(c=>c.id!=='leak');
  if(id==='med'){
    const treat=s.conditions.find(c=>c.id!=='leak');
    if(treat){s.conditions=s.conditions.filter(c=>c!==treat);notes.push(`处理了${conditionNames[treat.id]}。`);}
    else notes.push('目前没有需要处理的病痛，医疗包用于恢复生命状态。');
  }
  notes.push(`${ITEMS[id].name} −1。`);
}
export function step(input,id){
  const a=getActions(input).find(action=>action.id===id);
  if(!a||a.disabled)return {state:clone(input),report:null,error:a?.disabled||'当前不能执行这个行动'};
  const s=clone(input),before=summary(s),notes=[],w=weatherAt(s),location=nodeAt(s).name,context={};
  const eventId=s.event;s.turn++;
  if(id.startsWith('choice:')){
    const c=EVENTS[s.event].choices.find(c=>c.id===id.slice(7));
    applyEffect(s,c.effect,notes);context.rest=!!c.effect.rest;context.cover=c.effect.cover;
    s.seen.push(eventId);s.event=s.returning||s.rescue?null:(s.eventQueue.shift()||null);
    if(context.rest)s.camped=has(s,'tent');
  }else if(id.startsWith('move:')){
    const pace=id.slice(5),p=travelPlan(s,pace);context.moving=true;context.target=p.target;context.cover=p.cover;context.fast=pace==='fast';s.camped=false;
    const nextWeather=weatherAt(s,s.clock,p.target);
    const chance=(has(s,'boots')?.025:.11)*(pace==='fast'?2.8:pace==='careful'?.3:1)*(1+nextWeather.rain*.25+(nextWeather.night&&(!has(s,'lamp')||s.battery<4)?1.5:0));
    if(roll(s.seed,`slip:${s.turn}:${s.node}`)<chance){addCondition(s,'ankle',notes);s.health=clamp(s.health-7);notes.push('湿滑的落脚点让你扭伤了脚踝。');}
  }else if(id.startsWith('use:'))useItem(s,id.slice(4),notes);
  else if(id.startsWith('drop:')){s.inventory[id.slice(5)]--;notes.push('物品已放弃，无法在本分支取回。');}
  else if(id==='rest'||id==='camp'||id==='wait'){
    context.rest=true;s.camped=has(s,'tent');
    if(id==='camp')notes.push('扎营休整。装备、地形和剩余饱腹 / 补水状态共同决定恢复。');
  }else if(id==='heat'){s.inventory.fuel--;applyEffect(s,{warmth:26,wetness:-25},notes);context.cover=.55;notes.push('消耗 1 份燃气，保温恢复，衣物得到烘干。');}
  else if(id==='refill'){if(!has(s,'filter'))s.inventory.fuel--;addItems(s,{water:4},notes);}
  else if(id==='repair'){s.durability=clamp(s.durability+22);s.conditions=s.conditions.filter(c=>c.id!=='leak');notes.push('整理裂口、背负和营地连接，装备进水状态解除。');}
  else if(id==='retreat'){s.returning=true;s.event=null;s.eventQueue=[];s.route=null;s.target=null;notes.push('目标改为沿确认过的来路撤回。每一段撤离仍会消耗时间与状态。');}
  else if(id==='sos'){s.battery-=25;startRescue(s,notes);}
  else if(id==='report'){s.battery-=8;reportQuest(s,notes);}
  else if(id==='resupply'){s.money-=300;s.flags.resupplied=true;addItems(s,{ration:3,med:1,water:4},notes);}
  advanceTime(s,a.minutes/60,context,notes);
  if(context.moving&&!s.outcome){
    s.node=context.target;s.route=null;s.target=null;
    if(s.returning)s.path.pop();else s.path.push(s.node);
    notes.push(`抵达${nodeAt(s).name}。`);
    if(s.returning&&s.node==='foot')end(s,'retreated',s.flags.escort?'两个人的归途':'你决定把自己带回家','你沿来路返回山脚。这次行程的目标改变了，安全归来没有改变。');
    else if(s.node==='exit')end(s,'completed',s.quest?.status==='rescued'?'归来的人，不止你一个':s.quest?.status==='failed'?'一条没能及时送达的消息':['waiting','found'].includes(s.quest?.status)?'留在山上的等待':'风雪之后，是人间','你抵达了山下接应点。旅程的意义留在那些停下、绕行、分享与告别的时刻。');
    else if(!s.returning)arrival(s,notes);
  }
  if(!s.outcome&&s.returning&&s.node==='foot')end(s,'retreated','从山脚重新出发的选择','你在进入山地之前重新评估了准备。这同样是一次有效的决定。');
  if(!s.outcome&&!s.event&&!s.returning&&!s.rescue&&s.san<30&&!s.seen.includes('hallucination')){s.event='hallucination';}
  if(weightOf(s)>BACKPACKS[s.backpack].capacity)notes.push('负重超过背包容量：行进消耗明显增加，可以在背包中放弃物品。');
  if(s.warmth<30)notes.push('保温状态偏低。继续暴露会开始影响生命与体力。');
  if(s.hydration<20||s.satiety<20)notes.push('身体的补水或饱腹状态不足。背包里有补给，也需要主动使用。');
  return {state:s,report:{turn:s.turn,id,title:a.title,event:eventId,minutes:+((s.clock-input.clock)*60).toFixed(0),before,after:summary(s),notes,weather:w,location,time:timeLabel(s)}};
}
export function validateSave(s){
  if(!s||s.version!==VERSION||!defined(SCENARIOS,s.scenario)||!defined(BACKPACKS,s.backpack)||!defined(NODE_BY_ID,s.node))return false;
  if(!statKeys.every(k=>Number.isFinite(s[k])&&s[k]>=0&&s[k]<=100))return false;
  if(!['clock','turn','seed','money','initialWeight','cargo','emptyBatteries','merit'].every(k=>Number.isFinite(s[k])&&s[k]>=0))return false;
  if(s.clock>100||s.turn>1000||!Number.isInteger(s.turn)||!Number.isInteger(s.seed))return false;
  if(!s.inventory||typeof s.inventory!=='object'||!Object.entries(s.inventory).every(([id,n])=>ITEMS[id]&&Number.isInteger(n)&&n>=0&&n<=ITEMS[id].max))return false;
  if(!Array.isArray(s.path)||!s.path.length||s.path[0]!=='foot'||s.path.at(-1)!==s.node||!s.path.every(id=>defined(NODE_BY_ID,id)))return false;
  if(!Array.isArray(s.visited)||!s.visited.every(id=>defined(NODE_BY_ID,id))||!Array.isArray(s.seen)||!s.seen.every(id=>defined(EVENTS,id)))return false;
  if(s.event&&!defined(EVENTS,s.event)||!Array.isArray(s.eventQueue)||!s.eventQueue.every(id=>defined(EVENTS,id)))return false;
  if(!Array.isArray(s.conditions)||!s.conditions.every(c=>c&&conditionNames[c.id])||!Array.isArray(s.delayed)||!s.delayed.every(d=>['gastro','leak','lost'].includes(d.id)&&Number.isFinite(d.at)))return false;
  if(!s.flags||typeof s.flags!=='object'||typeof s.returning!=='boolean'||typeof s.camped!=='boolean')return false;
  if(s.target&&!defined(NODE_BY_ID,s.target))return false;
  if(s.route&&(!Number.isFinite(s.route.hours)||!Number.isFinite(s.route.cover)))return false;
  if(s.companion&&s.companion.name!=='鹿宁')return false;
  if(s.rescue&&(!Number.isFinite(s.rescue.remaining)||s.rescue.remaining<0||!NODE_BY_ID[s.rescue.node]))return false;
  if(s.quest&&(!['found','waiting','reported','rescued','failed'].includes(s.quest.status)||!Number.isFinite(s.quest.deadline)||s.quest.status==='reported'&&!Number.isFinite(s.quest.remaining)))return false;
  if(s.outcome&&(!['critical','completed','retreated','rescued'].includes(s.outcome.kind)||!Array.isArray(s.outcome.achievements)))return false;
  return true;
}
