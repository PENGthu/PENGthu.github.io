// A fictional mountain decision model. Values are game units, not medical forecasts.
export const VERSION = 1;
export const NODES = [
  {name:'山脚', alt:1900, shelter:1, signal:true, water:true},
  {name:'密林', alt:2520, shelter:.8, signal:false, water:true},
  {name:'林线', alt:3010, shelter:.45, signal:false, water:false},
  {name:'风口', alt:3280, shelter:.05, signal:false, water:false},
  {name:'石海', alt:3430, shelter:.1, signal:false, water:false},
  {name:'避风凹地', alt:3260, shelter:.65, signal:false, water:true},
  {name:'高山垭口', alt:3540, shelter:.05, signal:false, water:false},
  {name:'开阔山脊', alt:3460, shelter:.1, signal:false, water:false},
  {name:'下行山坡', alt:3050, shelter:.4, signal:false, water:false},
  {name:'谷地', alt:2440, shelter:.7, signal:true, water:true},
  {name:'接应点', alt:1850, shelter:1, signal:true, water:true}
];
export const SCENARIOS = {
  autumn:{name:'秋日骤变',subtitle:'晴天出发，天气会变。',base:10, storm:9, difficulty:1},
  winter:{name:'冬季风雪',subtitle:'低温、强风与短暂的窗口。',base:-6, storm:5, difficulty:1.2},
  fog:{name:'雾中同行',subtitle:'能见度下降，最慢的队员决定速度。',base:7, storm:7, difficulty:1.05}
};
export const PACKS = {
  standard:{name:'完整装备',weight:22,tent:true,satellite:true,insulation:1,food:24,water:8,battery:100},
  light:{name:'轻装出行',weight:12,tent:false,satellite:false,insulation:.7,food:15,water:5,battery:80},
  heavy:{name:'冗余装备',weight:29,tent:true,satellite:true,insulation:1.15,food:30,water:10,battery:120}
};
export const clamp=(v,a=0,b=100)=>Math.min(b,Math.max(a,v));
const clone=x=>structuredClone(x);
export function roll(seed,key) {
  let h=2166136261;
  for (const c of `${seed}:${key}`) h=Math.imul(h^c.charCodeAt(0),16777619);
  h^=h>>>16; h=Math.imul(h,2246822507); h^=h>>>13;
  return (h>>>0)/4294967296;
}
export const nodeAt=s=>NODES[Math.min(10,Math.max(0,Math.round(s.position)))];
export const mean=(s,k)=>s.members.reduce((v,m)=>v+m[k],0)/s.members.length;
export const weakest=(s,k)=>Math.min(...s.members.map(m=>m[k]));
export function createGame({scenario='autumn',pack='standard',seed=261006}={}) {
  scenario=SCENARIOS[scenario]?scenario:'autumn'; pack=PACKS[pack]?pack:'standard';
  seed=Number.isFinite(Number(seed))?Math.trunc(Number(seed)):261006;
  return {version:VERSION,scenario,pack,seed,tick:0,turn:0,position:.65,returning:false,
    food:PACKS[pack].food,water:PACKS[pack].water,battery:PACKS[pack].battery,
    satiety:88,hydration:92,wetness:0,cohesion:94,gear:100,cover:0,camp:false,
    rescue:null,event:null,outcome:null,everCritical:false,careCount:0,unsafeCount:0,
    members:[
      {name:'林岚',role:'领队 · 状态均衡',energy:94,warmth:93,injury:0,resistance:1},
      {name:'阿川',role:'队员 · 体能较好',energy:100,warmth:90,injury:0,resistance:1.08},
      {name:'小满',role:'队员 · 恢复较慢',energy:86,warmth:88,injury:0,resistance:.88}
    ]};
}
export function weatherAt(s,tick=s.tick) {
  const cfg=SCENARIOS[s.scenario],slot=Math.floor(tick/3),shift=Math.floor(roll(s.seed,'shift')*3);
  let phase=slot+shift, kind='晴间多云',rain=0,wind=2,visibility=120;
  if (phase>=2) {kind='云层增厚';wind=4;visibility=70;}
  if (phase>=4) {kind='雨雾';rain=2;wind=6;visibility=25;}
  const inStorm=tick>=cfg.storm && tick<cfg.storm+15;
  if (inStorm) {kind=s.scenario==='winter'?'暴风雪':'风雪交加';rain=4;wind=9+Math.floor(roll(s.seed,`wind:${slot}`)*3);visibility=8;}
  else if(tick>=cfg.storm+15) {
    const r=roll(s.seed,`weather:${slot}`);
    kind=r>.7?'浓雾':r>.4?'阴天':'云隙微光';rain=r>.7?1:0;wind=r>.7?6:3;visibility=r>.7?15:80;
  }
  if(s.scenario==='fog' && !inStorm) {kind='山地浓雾';visibility=15;rain=1;wind=4;}
  const hour=(8+tick/3)%24,night=hour>=18||hour<6;
  const temp=Math.round(cfg.base-(nodeAt(s).alt-1900)/220-(inStorm?7:0)-(night?5:0));
  const severity=clamp((6-temp)*.045+wind*.065+rain*.14,.2,2.8);
  return {kind,rain,wind,visibility,temp,night,severity,inStorm,hour};
}
export function forecast(s) {
  return [3,6].map(offset=>{
    const w=weatherAt(s,s.tick+offset);
    return {offset,label:`${offset*20} 分钟后`,kind:w.kind,temp:w.temp,confidence:w.inStorm?'存在强风雪可能':'趋势估计'};
  });
}
export function timeLabel(s) {
  const min=480+s.tick*20,day=Math.floor(min/1440)+1;
  return `第 ${day} 天 ${String(Math.floor(min/60)%24).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
}
export function riskLevel(s) {
  const w=weatherAt(s);
  const value=w.severity*18+(100-weakest(s,'warmth'))*.35+(100-weakest(s,'energy'))*.25+s.wetness*.12+(100-s.cohesion)*.15;
  return value>72?{name:'很高',level:3}:value>48?{name:'高',level:2}:value>25?{name:'中',level:1}:{name:'低',level:0};
}
function canContact(s) {return (PACKS[s.pack].satellite&&s.battery>=18)||(nodeAt(s).signal&&s.battery>=8);}
export function getActions(s) {
  const w=weatherAt(s),node=nodeAt(s),pack=PACKS[s.pack],minE=weakest(s,'energy');
  const make=(id,title,desc,minutes,tags,disabled='')=>({id,title,desc,minutes,tags,disabled});
  if(s.outcome)return [];
  if(s.event)return [
    make('event_wait','停下核对位置','暂不推进，核对离线地图并等待雾隙。',40,['耗时 40 分','减少走散风险']),
    make('event_regroup','回到最后确认点','退回一小段，清点人数，重新建立队伍联系。',20,['进度 −','凝聚力 +']),
    make('event_guess','按直觉继续走','节省核对时间，但可能偏离路线、加重疲劳。',20,['不确定性高','方向误判风险'])
  ];
  return [
    make('steady',s.returning?'恢复前行':'稳步前进','按最慢队员的速度推进，保持队伍联系。',20,['进度 +','体力 −'],minE<12?'队员体力不足，先恢复或求援':''),
    make('fast','加快行进','更快推进，也更消耗体力，雨雾中容易走散。',20,['进度 ++','滑坠风险 +'],minE<25?'最弱队员无法保持快行':''),
    make('shelter','寻找避风处','小范围寻找遮蔽，减少接下来约 40 分钟的风雨暴露。',20,['短期遮蔽 +','停止推进']),
    make('camp',s.camp?'在营地休整':'扎营休整',s.camp?'保持遮蔽，缓慢恢复体力与保温状态。':'搭建帐篷，换下湿衣，获得持续遮蔽。',60,['体力 +','消耗时间'],!pack.tent?'当前装备没有帐篷':s.gear<15?'装备损坏，先修整':''),
    make('meal','进食与补水','全队各消耗一份口粮，共饮用 0.6 L 水。',20,['口粮 −3','饮水 −0.6 L'],s.food<3?'全队口粮不足':s.water<.6?'储水不足':''),
    make('care','照顾队员 / 修整','处理扭伤、调整背负、修复装备，重新清点全队。',40,['伤势 −','凝聚力 +']),
    make('water','过滤补水','在模拟水源点过滤补水，增加 3 L 储水。',40,['饮水 +3 L','停止推进'],!node.water?'这里没有模拟水源':s.water>=12?'储水已充足':''),
    make('retreat','向山脚撤离','调整方向，沿已经确认的路段逐步返回。',20,['进度 −','撤离仍消耗体力']),
    s.rescue?make('wait','留在定位点等救援','保持位置，利用现有遮蔽等待救援队接近。',40,['救援进度 +','仍需保温']):make('sos','联系救援','发送位置与队员状况，建立救援请求。',20,['电量 −','等待不等于获救'],!canContact(s)?'无可用通信：需要卫星通信电量或到达有信号节点':'')
  ];
}
function end(s,kind,title,body) {
  const health=(mean(s,'energy')+mean(s,'warmth'))/2;
  const score=Math.round(kind==='critical'?clamp(health*.5,0,35):clamp(65+health*.35-s.unsafeCount*2-(s.everCritical?8:0)));
  s.outcome={kind,title,body,score};
}
function summary(s) {
  return {energy:Math.round(mean(s,'energy')),warmth:Math.round(mean(s,'warmth')),wetness:Math.round(s.wetness),cohesion:Math.round(s.cohesion),food:s.food,water:+s.water.toFixed(1),battery:Math.round(s.battery),position:+s.position.toFixed(2)};
}
export function step(input,id) {
  const action=getActions(input).find(a=>a.id===id);
  if(!action || action.disabled)return {state:clone(input),report:null,error:action?.disabled||'当前无法执行这个决策'};
  const s=clone(input),before=summary(s),notes=[],startWeather=weatherAt(s),pack=PACKS[s.pack];
  const eventAction=id.startsWith('event_'),moving=['steady','fast','retreat','event_guess','event_regroup'].includes(id);
  const activeCamp=s.camp;
  s.turn++; if(eventAction)s.event=null;
  if(moving){s.camp=false;s.cover=0;}
  if(id==='steady'||id==='fast')s.returning=false;
  if(id==='retreat')s.returning=true;
  if(id==='shelter'){s.cover=3;notes.push('找到短期遮蔽。移动会离开遮蔽，继续停留约 40 分钟后也会失效。');}
  if(id==='camp'){s.camp=true;s.cover=0;notes.push(nodeAt(s).shelter<.2?'这里暴露于强风，帐篷只能提供部分保护。':'帐篷和地形共同提供遮蔽，但保温恢复仍取决于天气与装备。');}
  if(id==='meal'){
    s.food-=3;s.water-=.6;s.satiety=clamp(s.satiety+42);s.hydration=clamp(s.hydration+35);
    s.members.forEach(m=>m.energy=clamp(m.energy+11));notes.push('全队完成进食补水。口粮储量与身体饱食度是两项独立状态。');
  }
  if(id==='care'){
    s.gear=clamp(s.gear+20);s.cohesion=clamp(s.cohesion+18);s.careCount++;
    s.members.forEach(m=>{m.injury=Math.max(0,m.injury-1);m.energy=clamp(m.energy+5);});notes.push('调整装备、照顾伤员并统一计划。持续保温同样需要遮蔽。');
  }
  if(id==='water'){s.water=Math.min(15,s.water+3);notes.push('补充 3 L 储水；过滤和寻找水源占用 40 分钟。');}
  if(id==='sos'){
    s.battery=Math.max(0,s.battery-(pack.satellite?18:8));
    s.rescue={remaining:5+(startWeather.inStorm?4:0),position:s.position,calledAt:s.tick};
    s.cohesion=clamp(s.cohesion+8);notes.push('救援请求已建立。强风雪会拖慢接近；自行移动后必须再次确认位置。');
  }
  if(id==='event_regroup'){s.position=Math.max(0,s.position-.22);s.cohesion=clamp(s.cohesion+16);notes.push('退回最后确认点，队伍重新集合。');}
  if(id==='event_wait'){s.cohesion=clamp(s.cohesion+9);s.cover=Math.max(s.cover,2);notes.push('核对离线信息，避开方向不明时的继续推进。');}
  let progress=0;
  if(['steady','fast','retreat'].includes(id)) {
    const weakestFactor=clamp((weakest(s,'energy')+40)/115,.4,1.15);
    const injuryFactor=1/(1+Math.max(...s.members.map(m=>m.injury))*.24);
    const cohesionFactor=s.cohesion<40?.75:1;
    progress=(id==='fast'?.92:.59)*weakestFactor*injuryFactor*cohesionFactor/(1+startWeather.severity*.18);
    if(id==='retreat')progress*=-1;
    s.position=clamp(s.position+progress,0,10);
    s.cohesion=clamp(s.cohesion+(id==='fast'?-7-startWeather.rain:-1));
    if(id==='fast')s.unsafeCount++;
    const slip=roll(s.seed,`slip:${input.tick}`);
    if(nodeAt(s).shelter<.4 && slip<(id==='fast'?.12:.025)*(1+startWeather.rain*.2)){
      const m=s.members[Math.floor(roll(s.seed,`member:${input.tick}`)*3)];m.injury=Math.min(3,m.injury+1);m.energy=clamp(m.energy-7);
      notes.push(`${m.name}踩在湿滑岩面上扭伤。伤势会拖慢全队速度，可通过照顾队员减轻。`);
    }
    notes.push(`${id==='retreat'?'撤离':'前进'} ${Math.abs(progress).toFixed(2)} 个抽象路段；速度受到最弱队员、天气和伤势影响。`);
  }
  if(id==='event_guess'){
    s.unsafeCount++;
    if(roll(s.seed,`guess:${input.tick}`)<.7){s.position=Math.max(0,s.position-.2);s.cohesion=clamp(s.cohesion-19);s.members.forEach(m=>m.energy=clamp(m.energy-10));notes.push('方向判断失误，绕行后回到原处附近，消耗体力并拉大队伍距离。');}
    else {s.position=Math.min(10,s.position+.4);notes.push('这次恰好选对了方向。一次成功不能证明同类选择没有风险。');}
  }
  for(let i=0;i<action.minutes/20;i++) {
    const w=weatherAt(s),node=nodeAt(s),resting=id==='camp'||id==='wait';
    const cover=s.camp?(node.shelter<.2?.56:.83):(s.cover>0?.65:0);
    const exposure=(1-cover)*(1-node.shelter*.42);
    s.wetness=clamp(s.wetness+w.rain*exposure*2.5-(cover>0?5:0));
    const depletion=(moving?(id==='fast'?7:4.3):1.8)+(pack.weight-12)*.1;
    s.satiety=clamp(s.satiety-(moving?6:4));s.hydration=clamp(s.hydration-(moving?5:3));
    s.members.forEach(m=>{
      const shortage=(s.satiety<25?2.5:0)+(s.hydration<25?2.5:0);
      const recovery=resting&&s.satiety>25&&s.hydration>25?8.2:0;
      m.energy=clamp(m.energy-(depletion+shortage+m.injury*.8)/m.resistance+recovery);
      const cold=w.severity*2.8*exposure/pack.insulation+s.wetness*.023+(m.energy<25?1.7:0);
      const warmthGain=(s.camp?3.1:s.cover>0?1.6:0)+(moving?.75:0);
      m.warmth=clamp(m.warmth-cold/m.resistance+warmthGain);
    });
    if(s.camp && w.wind>=9)s.gear=clamp(s.gear-3);
    if(s.gear<15 && s.camp){s.camp=false;notes.push('帐篷装备损坏，持续遮蔽失效。');}
    s.battery=Math.max(0,s.battery-(w.temp<0?1.15:.5));
    s.tick++;if(s.cover>0)s.cover--;
    if(s.rescue){
      if(!w.inStorm || roll(s.seed,`rescue:${s.tick}`)>.72)s.rescue.remaining=Math.max(0,s.rescue.remaining-1);
      if(s.rescue.remaining===0 && Math.abs(s.position-s.rescue.position)>.6){s.rescue.remaining=2;s.rescue.position=s.position;notes.push('队伍离开最初定位点，救援队需要重新接近当前位置。');}
    }
    if(weakest(s,'warmth')<20 || weakest(s,'energy')<12)s.everCritical=true;
    if(weakest(s,'warmth')<=0 || weakest(s,'energy')<=0){end(s,'critical','失去自主行动能力','一名队员的状态降至危急阈值，推演终止。回看最早的风险信号，尝试更早调整计划。');break;}
  }
  if(!s.outcome){
    if(s.rescue && s.rescue.remaining<=0)end(s,'rescued','救援队接近了你们','你们保持了足够的保温与体力，并等待到了救援。救援完成是这次推演的有效结局。');
    else if(s.position<=0 && (s.returning||id==='event_regroup'))end(s,'retreated','全队安全撤回山脚','你们及时调整了目标，带所有队员回到接应区域。');
    else if(s.position>=10)end(s,'completed','全队抵达接应点','你们完成了这次虚构山地行程。决定成绩的是队伍状态，而不只是抵达。');
    else if(s.tick>=144)end(s,'critical','行程失去可控窗口','推演已超过 48 小时。继续停留无法解决当前困境，回看补给与撤离决策。');
  }
  if(!s.outcome && moving && !eventAction && !s.returning && !s.rescue && s.position>1.8 && weatherAt(s).visibility<30 && (s.cohesion<35||roll(s.seed,`event:${s.tick}`)<.23)){
    s.event={title:'雾里，路线变得不确定',body:'前方的石堆标记消失在雾中。小满落后了一段，阿川认为可以沿着眼前的山梁继续。你要先做什么？'};
    notes.push('新的决策情境：路线不明且队员距离拉大，必须先处理这一情况。');
  }
  if(activeCamp && moving)notes.push('离开营地后，帐篷不再提供遮蔽。');
  if(weakest(s,'warmth')<35)notes.push('保温状态偏低：最弱队员已经不能承受长时间暴露。');
  if(s.satiety<25||s.hydration<25)notes.push('饱食或补水状态不足，体力下降开始加快。');
  return {state:s,report:{turn:s.turn,id,title:action.title,minutes:action.minutes,before,after:summary(s),notes,weather:startWeather,time:timeLabel(s)}};
}
export function validateSave(s) {
  return !!s&&s.version===VERSION&&SCENARIOS[s.scenario]&&PACKS[s.pack]&&Array.isArray(s.members)&&s.members.length===3&&
    ['tick','turn','position','food','water','battery','satiety','hydration','wetness','cohesion','gear'].every(k=>Number.isFinite(s[k]))&&
    s.position>=0&&s.position<=10&&s.members.every(m=>['energy','warmth','injury','resistance'].every(k=>Number.isFinite(m[k])));
}
