// Original fictional chapters and game values. This is not a navigation guide.
export const VERSION = 2;
export const BUDGET = 16000;
export const SCENARIOS = {
  letter: {name:'山间来信', tag:'标准故事', desc:'从一张寻人启事开始。天气、陌生人和你的背包，会一起改写旅程。', cold:8, storm:[15,25], budget:BUDGET},
  snow: {name:'风雪将至', tag:'困难模式', desc:'寒潮比预报更早到来。保温、扎营和撤离窗口，成为每一步的重点。', cold:0, storm:[8,28], budget:BUDGET},
  search: {name:'循声而行', tag:'救援故事', desc:'你听见了山里的求救声。带回一个人的消息，比抵达终点更重要。', cold:6, storm:[20,30], budget:BUDGET}
};
export const BACKPACKS = {
  light:{name:'轻量背包', capacity:20, weight:1.1, price:800, desc:'留出机动余量，补给需要精打细算。'},
  trek:{name:'远行背包', capacity:26, weight:2, price:1500, desc:'均衡容量。装得下，也要背得动。'},
  heavy:{name:'大容量背包', capacity:32, weight:2.9, price:2300, desc:'可以多带物资，但重量会持续消耗体力。'}
};
export const CATEGORIES = [['wear','穿戴'],['camp','营地'],['tools','工具'],['supplies','补给']];
export const ITEMS = {
  shell:{name:'防水外套', icon:'♧', category:'wear', price:1600, weight:.65, max:1, desc:'减少雨雪浸湿；淋湿后保温更困难。'},
  down:{name:'保温中层', icon:'❄', category:'wear', price:1300, weight:.6, max:1, desc:'降低寒冷消耗，休息时同样生效。'},
  gloves:{name:'保温手套', icon:'♧', category:'wear', price:220, weight:.12, max:1, desc:'降低风口的保温消耗，解锁攀石选项。'},
  boots:{name:'防滑登山靴', icon:'⌁', category:'wear', price:850, weight:1.2, max:1, desc:'降低湿滑路段受伤概率。'},
  poles:{name:'双登山杖', icon:'⫽', category:'wear', price:450, weight:.5, max:1, desc:'减轻行进消耗，涉水与石坡事件可用。'},
  tent:{name:'抗风帐篷', icon:'△', category:'camp', price:2100, weight:1.8, max:1, desc:'解锁扎营；地形和完整度决定遮蔽效果。'},
  bag:{name:'保温睡袋', icon:'▱', category:'camp', price:1200, weight:1.1, max:1, desc:'提高休息时的体力与保温恢复。'},
  mat:{name:'隔热睡垫', icon:'≋', category:'camp', price:280, weight:.45, max:1, desc:'进一步提升营地休息效果。'},
  stove:{name:'便携炉具', icon:'♨', category:'camp', price:420, weight:.3, max:1, desc:'配合燃气做热食、取暖或处理水。'},
  map:{name:'地图与指北针', icon:'◇', category:'tools', price:180, weight:.12, max:1, desc:'雾中确认方向，不消耗电量。'},
  gps:{name:'定位设备', icon:'⊕', category:'tools', price:900, weight:.2, max:1, desc:'解锁定位选项，行进时会多耗电。'},
  satellite:{name:'卫星通信器', icon:'◎', category:'tools', price:2800, weight:.35, max:1, desc:'无手机信号处也能求援；需要电量。'},
  lamp:{name:'头灯', icon:'☼', category:'tools', price:160, weight:.12, max:1, desc:'降低夜行的不确定性；需要电量。'},
  filter:{name:'净水工具', icon:'◉', category:'tools', price:350, weight:.16, max:1, desc:'在水源点补充饮水。'},
  repair:{name:'修理工具', icon:'⌘', category:'tools', price:200, weight:.2, max:1, desc:'耗时修整装备，也能加固风中的营地。'},
  ration:{name:'口粮', icon:'▣', category:'supplies', price:60, weight:.4, max:24, usable:true, desc:'饱腹 +46，体力 +10。吃下去才会恢复。'},
  meal:{name:'热食包', icon:'♨', category:'supplies', price:80, weight:.35, max:12, usable:true, desc:'需要炉具、1 份燃气和 1 瓶水；恢复更多体力与保温。'},
  snack:{name:'能量棒', icon:'▬', category:'supplies', price:25, weight:.1, max:12, usable:true, desc:'体力 +15，饱腹 +18，适合临时补充。'},
  water:{name:'饮水 · 0.5 L', icon:'◉', category:'supplies', price:8, weight:.5, max:8, usable:true, desc:'补水 +46。水源点可重新装满。'},
  fuel:{name:'燃气 · 一次用量', icon:'♨', category:'supplies', price:18, weight:.09, max:16, desc:'热食、取暖与烧水消耗的燃料。'},
  med:{name:'医疗包', icon:'＋', category:'supplies', price:90, weight:.2, max:8, usable:true, desc:'处理一项病痛，生命 +10；也可以帮助别人。'},
  warmer:{name:'保温补给', icon:'❄', category:'supplies', price:22, weight:.06, max:10, usable:true, desc:'立即恢复保温 +20。'},
  battery:{name:'备用电源', icon:'ϟ', category:'supplies', price:150, weight:.25, max:6, usable:true, desc:'电量 +45；用尽后仍要背着空电源。'},
  patch:{name:'修补片', icon:'▧', category:'supplies', price:45, weight:.05, max:6, usable:true, desc:'装备完整度 +30。'},
  blanket:{name:'应急保温毯', icon:'▱', category:'supplies', price:65, weight:.15, max:3, usable:true, desc:'恢复保温 +25；给伤员可延长等待窗口。'}
};
export const PRESETS = {
  balanced:{name:'均衡出发', backpack:'trek', items:{shell:1,down:1,gloves:1,boots:1,poles:1,tent:1,bag:1,mat:1,stove:1,map:1,satellite:1,lamp:1,filter:1,repair:1,ration:8,meal:2,snack:3,water:5,fuel:5,med:3,warmer:2,battery:2,patch:1,blanket:1}},
  light:{name:'轻装取舍', backpack:'light', items:{shell:1,down:1,gloves:1,boots:1,poles:1,tent:1,bag:1,stove:1,map:1,lamp:1,filter:1,ration:9,meal:2,snack:4,water:4,fuel:4,med:2,warmer:2,battery:1,patch:1}},
  rescue:{name:'救援储备', backpack:'trek', items:{shell:1,down:1,gloves:1,boots:1,poles:1,tent:1,bag:1,mat:1,stove:1,map:1,satellite:1,lamp:1,filter:1,ration:12,meal:2,snack:2,water:5,fuel:5,med:4,warmer:3,battery:2,patch:2,blanket:2}}
};
export const NODES = [
  {id:'foot',name:'山脚驿站',alt:1900,hours:0,shelter:1,signal:true,water:true,scene:'forest',next:'forest',chapter:'一封没有寄出的信',text:'清晨的山脚还有烟火气。公告栏上的寻人启事被雨水打湿，名字旁边只写着一行字：如果看见他，请带回消息。'},
  {id:'forest',name:'密林坡',alt:2480,hours:2,shelter:.75,water:true,scene:'forest',next:'bonsai',chapter:'树影深处',text:'泥土很软，树冠挡住了远处的天。溪水的声音一直跟着你，背包带慢慢勒进肩膀。'},
  {id:'bonsai',name:'盆景园',alt:3010,hours:2.5,shelter:.45,scene:'forest',next:'ridge',chapter:'有人走在前面',text:'低矮的冷杉贴着坡面生长。一个橙色背包停在路旁，背包的主人正揉着发红的脚踝。'},
  {id:'ridge',name:'鳌山脊',alt:3476,hours:2.5,shelter:.1,scene:'ridge',next:'stone',chapter:'天空突然很近',text:'树木退到了身后，风从山梁另一侧翻上来。来时的晴朗只剩下一小片，新的云正越过远处的石峰。'},
  {id:'stone',name:'连片石海',alt:3370,hours:2.5,shelter:.15,scene:'stone',next:'camp',chapter:'脚下没有平地',text:'每块石头都像一座小岛。你要判断下一步落在哪里，也要分辨身后的声音到底是风，还是有人。'},
  {id:'camp',name:'水窝营地',alt:3220,hours:2,shelter:.8,water:true,scene:'camp',next:'saddle',chapter:'暂时停下的地方',text:'凹地里有几块平整地面。风没有消失，只是绕过了你。这里适合休整，也适合重新想一遍之后的计划。'},
  {id:'saddle',name:'雾中垭口',alt:3420,hours:2.5,shelter:.3,scene:'fog',next:'pass',chapter:'一个很轻的声音',text:'雾把道路和山体揉成了一片白色。主线继续向前，侧面的凹地却传来几声断续的哨音。'},
  {id:'hollow',name:'背风石槽',alt:3310,hours:1.2,shelter:.75,scene:'fog',next:'pass',branch:true,chapter:'名字有了面孔',text:'石壁下蜷着一个人。他的背包已经空了，脚踝肿得无法站起来。他看见你时，先问了一句：今天是几号？'},
  {id:'pass',name:'九重石坡',alt:3520,hours:2.5,shelter:.18,scene:'stone',next:'cloud',chapter:'一坡之后还有一坡',text:'抬头看到的山脊总是下一段的起点。你开始在每一次呼吸之间，计算还剩多少水，多少食物，多少力气。'},
  {id:'cloud',name:'云间山脊',alt:3610,hours:3,shelter:.08,scene:'ridge',next:'lake',chapter:'快与稳之间',text:'湖泊就在远处，却被起伏的山梁隔开。高处的路短而暴露，低处的路更长，也更安静。'},
  {id:'valley',name:'低处的山坳',alt:3180,hours:2,shelter:.85,water:true,scene:'forest',next:'lake',branch:true,chapter:'绕路也向前',text:'沿着已经确认的低处路段，你重新听见溪水。山脊藏在头顶的云里，长一点的路让心跳慢了下来。'},
  {id:'lake',name:'高山湖边',alt:3590,hours:2.5,shelter:.45,water:true,scene:'lake',next:'hut',chapter:'水面没有回答',text:'湖水冷得像一面金属镜子。远处出现了一条规整的屋顶线，终于不像石头，也不像幻觉。'},
  {id:'hut',name:'避风小屋',alt:3250,hours:1.8,shelter:1,water:true,signal:true,scene:'hut',next:'exit',chapter:'一盏灯是真的',text:'木门打开时，一股热气扑过来。值守员放下水壶，问你山上还有没有别人。窗外的雾，第一次不再那么难熬。'},
  {id:'exit',name:'山下接应点',alt:1850,hours:3,shelter:1,water:true,signal:true,scene:'forest',chapter:'把故事带下山',text:'最后一段坡路结束了。有人给你递来一杯水。此刻你想起的，是这一程中每一个决定停下的地方。'}
];
export const NODE_BY_ID=Object.fromEntries(NODES.map(n=>[n.id,n]));
const choice=(id,title,desc,minutes,effect={},requires={})=>({id,title,desc,minutes,effect,requires});
export const EVENTS = {
  briefing:{title:'最后一段信号，来自雾中垭口',category:'救援故事 / 出发前',text:'值守员把许舟最后的通信记录交给你。你负责在虚构山地中核查线索，找到人之后发送位置、留下维持等待的物资。天气正在变化，窗口比普通故事更紧。',choices:[
    choice('record','核对失联者的信息与通信方案','把求援和归来都放进这次计划。',20,{flags:{notice:true,detail:true,searchBrief:true},san:5}),
    choice('remember','记下线索，立即开始','你需要自己管理之后的补给与时间。',5,{flags:{notice:true,searchBrief:true},san:2})
  ]},
  notice:{title:'雨水打湿的寻人启事',category:'故事的起点',text:'许舟，26 岁，数日前失联。没有悬赏数字，只有一张模糊照片和家属留的联系方式。值守员提醒你：看见线索就报告，别把自己也留在山里。',choices:[
    choice('remember','记住名字与衣着','如果遇到线索，你希望把消息带回来。',10,{flags:{notice:true,promise:true},san:3}),
    choice('record','抄下联系方式和线索','多花一点时间整理信息，方便之后确认。',25,{flags:{notice:true,detail:true},san:5}),
    choice('leave','按自己的计划出发','你还不知道，这张照片会不会在路上再次出现。',5,{flags:{notice:true}})
  ]},
  stream:{title:'清澈，不等于可以直接喝',category:'水源 / 补给',text:'溪流从石缝里流下来，水看起来没有杂质。储水越来越少。处理水需要时间，直接喝似乎更方便。',choices:[
    choice('filter','用净水工具补水','补充 4 瓶饮水，需要停留处理。',40,{grant:{water:4}},{items:{filter:1}}),
    choice('boil','烧水后装瓶','补充 4 瓶饮水，消耗 1 份燃气。',60,{cost:{fuel:1},grant:{water:4},warmth:6},{items:{stove:1,fuel:1}}),
    choice('raw','直接饮用，再装两瓶','省下时间，但身体的反应可能晚一些才出现。',10,{hydration:40,grant:{water:2},delayed:'gastro'}),
    choice('skip','使用自己带的水','继续前进，背包储水不会增加。',5,{})
  ]},
  takin:{title:'林间的庞大身影',category:'野生动物',text:'一头羚牛出现在前方树影里，抬起头观察着你。道路很窄，它没有立刻离开。',choices:[
    choice('wait','保持距离，安静等待','把时间留给它，也给自己留出退路。',50,{san:3}),
    choice('detour','退回一点，绕过这片林子','绕行会增加消耗，但能拉开距离。',80,{energy:-7}),
    choice('rush','挥手驱赶，想尽快过去','它的反应无法由你的计划决定。',15,{random:'takin'})
  ]},
  fruit:{title:'脚边的红色野果',category:'食物 / 风险',text:'枝头挂着几串果子。饥饿让它们看起来比口粮更诱人，但你并不能确认品种。',choices:[
    choice('ignore','不吃无法确认的果实','保留现有补给计划。',5,{}),
    choice('eat','尝几颗补充能量','眼前能缓解饥饿，之后的反应未知。',15,{satiety:25,energy:4,delayed:'gastro'})
  ]},
  companion:{title:'“一个人走，有时太安静了。”',category:'人物 / 鹿宁',text:'橙色背包的主人叫鹿宁。她说自己昨晚睡得不好，准备在前面的营地重新评估行程。她看了看你的背包，问能不能同行一段。',choices:[
    choice('share','分一份口粮，结伴同行','食物少一份；有人可以互相照应。',25,{cost:{ration:1},companion:'join',flags:{trust:true},merit:2,san:8},{items:{ration:1}}),
    choice('join','结伴走到下一处营地','同行会带来帮助，也会带来新的责任。',15,{companion:'join',san:5}),
    choice('alone','交换路况，各自前行','鹿宁告诉你，前面的云比早上厚了很多。',20,{flags:{weatherHint:true},san:2})
  ]},
  ridge:{title:'云正在越过山梁',category:'路线 / 风口',text:'一条短路沿着暴露山脊向前。另一条确认过的绕行路低一些，但要多走一段。现在的风还没有强到站不住，云层却一直在压低。',choices:[
    choice('low','选择较低的绕行路','下一段耗时 +1 小时，暴露减少。',15,{route:{hours:1,cover:.5},flags:{lowRidge:true}}),
    choice('high','沿山脊快速通过','下一段耗时减少，但保温消耗和不确定性更高。',10,{route:{hours:-.5,cover:-.1},flags:{exposedRidge:true}}),
    choice('observe','先等一小时观察云层','时间过去后，你仍需走完这一段。',60,{warmth:-3,san:3,route:{hours:.4,cover:.25}})
  ]},
  fog:{title:'石堆标记消失了',category:'方向 / 浓雾',text:'前后都是相似的石块，刚才确认过的标记已经看不见。有人走过的痕迹并不一定通向你的目的地。',choices:[
    choice('map','停下核对地图与指北针','不依赖电量，重新确认这一段方向。',45,{san:5},{items:{map:1}}),
    choice('gps','使用定位设备交叉核对','消耗 6 点电量，缩短核对时间。',20,{battery:-6,san:3},{items:{gps:1},battery:6}),
    choice('back','退回最后确认的位置','多走一段路，重新建立方向感。',90,{energy:-5,san:2}),
    choice('guess','相信眼前的脚印','如果判断失误，之后才会发现。',10,{random:'lost'})
  ]},
  memorial:{title:'石头旁的一束旧花',category:'山里的痕迹',text:'几块石头围着一束已经褪色的花。没有人说话，风声倒显得格外清楚。你忽然想起山脚那张照片。',choices:[
    choice('silence','停一会儿，重新检查计划','这不是一场必须赢的比赛。',20,{san:9,merit:1,flags:{remembered:true}}),
    choice('continue','收起情绪，继续行程','你把剩余物资又默数了一遍。',5,{san:2})
  ]},
  cache:{title:'石缝里的一只密封袋',category:'发现 / 负重',text:'袋上写着“备用，请取所需”。里面有两份燃气和一片修补材料。多带一点会更安心，背包也会更重。',choices:[
    choice('take','拿走燃气与修补片','增加补给与重量。',15,{grant:{fuel:2,patch:1},flags:{cache:true}}),
    choice('fuel','只带一份燃气','给后来的人留一些。',10,{grant:{fuel:1},merit:1}),
    choice('leave','留下物资与位置记录','物资不变，记住此处存在备用补给。',10,{merit:2,flags:{cacheMarked:true},san:3})
  ]},
  rip:{title:'背包外层被石角划开',category:'装备 / 损坏',text:'一道裂口开始进水。看起来还能背，但如果之后继续淋雨，里面的保温装备也会受到影响。',choices:[
    choice('patch','用修补片封住裂口','消耗 1 片，装备完整度恢复。',20,{cost:{patch:1},durability:25},{items:{patch:1}}),
    choice('repair','拿出工具仔细修整','不消耗修补片，但要多花时间。',60,{durability:20,energy:-3},{items:{repair:1}}),
    choice('ignore','先走，之后再处理','裂口会在未来几小时继续影响保温。',5,{durability:-15,delayed:'leak'})
  ]},
  blister:{title:'每一步都开始疼',category:'身体 / 脚踝',text:'鞋袜摩擦的位置已经破皮。你试着换一个落脚角度，却发现这让另一条腿也更累。',choices:[
    choice('med','停下处理伤口','消耗 1 个医疗包，避免持续影响步速。',40,{cost:{med:1},health:5},{items:{med:1}}),
    choice('adjust','调整鞋袜，休息一小时','疼痛减轻一些，但仍会留下轻度影响。',60,{energy:8,condition:'ankle'}),
    choice('push','忍着继续','之后的行进会更慢、更耗体力。',5,{condition:'ankle',health:-7,san:-5})
  ]},
  scramble:{title:'结冰的石面，需要用手攀过去',category:'装备 / 攀石',text:'前面一段石坡需要手脚并用。石面上的薄冰让抓握变得困难，另一侧有一条更缓的绕行路。',choices:[
    choice('gloves','戴好手套，仔细确认抓点','手套与防滑靴让这段更容易处理。',35,{energy:-4},{items:{gloves:1,boots:1}}),
    choice('detour','选择缓坡绕行','多花时间，避免徒手攀冰。',85,{energy:-7}),
    choice('bare','直接用手攀过去','手指被冻僵，身体与装备都可能受损。',20,{warmth:-14,health:-8,durability:-8,san:-3})
  ]},
  companionCamp:{title:'鹿宁把鞋脱了下来',category:'人物 / 一起还是各自',text:'她的脚踝比之前更肿了。“我可能得回去。”她不想耽误你，语气却不像刚才那么有把握。你们都知道，下一段更难。',choices:[
    choice('escort','陪她沿确认过的路撤回','开始撤离，共同回到山脚。',20,{returning:true,flags:{escort:true},merit:4,san:12}),
    choice('treat','先处理伤势，再重新评估','消耗 1 个医疗包。她会在这里等待接应，给你留下路况笔记。',60,{cost:{med:1},companion:'leave',flags:{helpedCompanion:true,weatherHint:true},merit:3,san:8},{items:{med:1}}),
    choice('part','交换信息后分别行动','她独自下撤；之前的互信会影响这次告别。',15,{companion:'part',san:-3})
  ]},
  saddle:{title:'哨音来自主路之外',category:'分支 / 寻人',text:'侧面低处传来三声短哨，又停了很久。绕过去会多花时间，可能遇到需要帮助的人，也可能只是风穿过石缝。',choices:[
    choice('follow','沿确认的支段寻找声音','下一站改为背风石槽。',20,{target:'hollow',flags:{followedVoice:true},san:-2}),
    choice('main','继续走主路，记下声音方向','你会把这条线索带到有信号的地方。',10,{target:'pass',flags:{voiceClue:true}}),
    choice('signal','先用卫星通信报告线索，再寻找','消耗 12 点电量，提前建立联系。',30,{battery:-12,target:'hollow',flags:{clueSent:true}},{items:{satellite:1},battery:12})
  ]},
  hiker:{title:'“我叫许舟。你见过那张照片吗？”',category:'救援支线 / 许舟',text:'他脚踝受伤，无法自己离开。你需要决定留下多少物资，以及怎样把位置送出去。只给食物不会自动带来救援；通信与等待也都需要时间。',choices:[
    choice('satellite','处理伤势，立即发送定位求援','1 个医疗包、2 份口粮、20 点电量；救援仍需时间。',50,{cost:{med:1,ration:2},battery:-20,quest:'direct',merit:4,san:8},{items:{satellite:1,med:1,ration:2},battery:20}),
    choice('provision','留下充足口粮与保温毯，去报告','3 份口粮 + 1 条毯；获得较长的报告窗口。',40,{cost:{ration:3,blanket:1},quest:'provision',merit:3,san:5},{items:{ration:3,blanket:1}}),
    choice('basic','留一份口粮，尽快找到值守员','等待窗口较短，绕路和长时间休息可能来不及。',20,{cost:{ration:1},quest:'basic',merit:1,san:-3},{items:{ration:1}}),
    choice('together','留下陪护，呼叫共同撤离','2 份口粮、25 点电量。你也必须在这里等待。',60,{cost:{ration:2},battery:-25,quest:'together',rescue:true,merit:4,san:8},{items:{satellite:1,ration:2},battery:25}),
    choice('report','记下位置，带消息出去','没有留下物资。他可以等你的时间很有限。',15,{quest:'bare',flags:{leftHiker:true},san:-8})
  ]},
  storm:{title:'风雪把下一段盖住了',category:'天气 / 暴露',text:'风刮得雪粒横着飞，脚边的痕迹正在消失。强行走和长时间停留，都要消耗你不同的资源。',choices:[
    choice('camp','利用地形与帐篷等待天气窗口','休整 4 小时，同时消耗饱腹和补水状态。',240,{rest:true,cover:.8,energy:12,san:5},{items:{tent:1}}),
    choice('shelter','找遮蔽，开炉取暖后观察','2 份燃气，停留 2 小时。',120,{cost:{fuel:2},cover:.7,warmth:25,san:4},{items:{stove:1,fuel:2}}),
    choice('push','继续，赌能走出这片云','下一段更快，但暴露与装备消耗增加。',10,{route:{hours:-.4,cover:-.25},energy:-5,durability:-8,flags:{stormPush:true}})
  ]},
  hallucination:{title:'雾里似乎亮着一盏灯',category:'精神 / 判断',text:'你听见有人叫你的名字。光点在远处晃了一下，像是一间屋子的窗。疲劳和寒冷让你很难确认这是不是错觉。',choices:[
    choice('ground','停下，吃东西、检查方向','消耗 1 根能量棒，恢复判断力。',40,{cost:{snack:1},san:20,energy:8},{items:{snack:1}}),
    choice('check','核对地图，不离开确认位置','让方向判断重新回到证据上。',60,{san:13},{items:{map:1}}),
    choice('rest','不追过去，原地休息观察','时间与寒冷仍在继续。',90,{san:8,energy:3,cover:.3}),
    choice('follow','朝着光点走过去','你还不知道它到底是什么。',100,{san:-12,energy:-15,warmth:-10,health:-5,flags:{chasedLight:true}})
  ]},
  ford:{title:'融水横在路上',category:'地形 / 涉水',text:'溪流比照片上宽。几块露出水面的石头很滑，下游有一处更宽缓的浅滩。湿透之后，保温会变得更困难。',choices:[
    choice('poles','使用登山杖逐步确认落点','慢一些，减少浸湿与受伤风险。',45,{wetness:10},{items:{poles:1,boots:1}}),
    choice('detour','往下游找缓一些的位置','多花时间和体力。',90,{energy:-5,wetness:5}),
    choice('jump','直接跨过最窄的一段','更快，但可能打湿衣物或扭伤。',15,{random:'ford'})
  ]},
  litter:{title:'一只被风吹开的垃圾袋',category:'山里的痕迹 / 负重',text:'几只塑料包装卡在石缝里。它们几乎没有重量，却不会自己离开这里。捡起来之后，背包会多一点负担。',choices:[
    choice('collect','收好，带到山下','增加 0.7 kg 负重，直到归来。',20,{cargo:.7,merit:3,flags:{litter:true},san:4}),
    choice('mark','整理固定，记下位置','暂时防止它们被风吹散。',10,{merit:1}),
    choice('leave','现在先照顾自己的状态','物资与负重不变。',5,{})
  ]},
  dusk:{title:'天色比预想暗得快',category:'时间 / 夜行',text:'下一段已经进入阴影。你可以继续走，但黑暗中的石块比白天更难判断。',choices:[
    choice('lamp','检查头灯电量后继续','消耗 4 点电量，下一段更容易保持节奏。',15,{battery:-4,flags:{nightChecked:true}},{items:{lamp:1},battery:4}),
    choice('camp','扎营，等到天亮','休整 6 小时。食物与水仍会被身体消耗。',360,{rest:true,cover:.85,san:8},{items:{tent:1}}),
    choice('dark','慢慢夜行','下一段增加耗时；夜行受伤风险仍然存在。',5,{route:{hours:.8,cover:0},san:-4})
  ]},
  cloud:{title:'湖泊看得见，路还没结束',category:'路线 / 时间窗口',text:'高处的山脊路更直接。低处山坳有遮蔽与水源，却会多走一个节点。如果有人在等你的消息，时间也在这里变得更重。',choices:[
    choice('ridge','选择山脊直行','直达湖边，天气影响更明显。',10,{target:'lake',route:{hours:-.5,cover:0}}),
    choice('valley','绕到低处山坳','多经过一站，获得水源和遮蔽。',15,{target:'valley',flags:{valley:true}})
  ]},
  bird:{title:'风里的一小片羽毛',category:'短暂的平静',text:'一只鸟停在矮树上，像没有重量一样。你终于听见风之外的另一种声音。',choices:[
    choice('watch','坐一会儿，看它离开','让紧绷的精神松开一点。',25,{san:10,energy:3}),
    choice('quiet','保持安静，继续走','不打扰这段短暂的相遇。',5,{san:3,merit:1})
  ]},
  altitude:{title:'头痛让呼吸变得漫长',category:'身体 / 高处',text:'头痛和乏力开始影响判断。赶路的冲动还在，但身体并没有答应。你需要先处理状态。',choices:[
    choice('med','处理症状，停留观察','消耗 1 个医疗包，并休息两小时。',120,{cost:{med:1},rest:true,cover:.4,remove:'altitude',health:7},{items:{med:1}}),
    choice('rest','放慢节奏，停下休息','恢复一点体力，后续仍可能受症状影响。',90,{energy:10,san:4,cover:.4}),
    choice('push','忽略症状继续','状态会持续影响之后的行进。',5,{condition:'altitude',health:-8,san:-6})
  ]},
  hut:{title:'值守员等你说完',category:'小屋 / 消息与补给',text:'“先坐下，把事情一件件说清楚。”桌上的热水冒着白汽。这里可以联系山下，也有少量补给。你在山里留下的决定，现在需要一个回答。',choices:[
    choice('report','先报告山上的人和线索，再休整','许舟的救援支线会根据之前的物资与剩余时间继续。',120,{reportQuest:true,rest:true,cover:1,energy:20,warmth:25,san:18,hydration:50,satiety:45,flags:{hut:true}}),
    choice('rest','先坐下来吃一碗热粥','恢复状态；如果还有人等待，时间同样会过去。',180,{rest:true,cover:1,energy:28,warmth:30,san:20,hydration:50,satiety:60,flags:{hut:true}})
  ]}
};
export const ARRIVAL_EVENTS = {foot:'notice',bonsai:'companion',ridge:'ridge',saddle:'saddle',hollow:'hiker',cloud:'cloud',hut:'hut'};
export const RANDOM_EVENTS = {
  forest:['stream','takin','fruit','bird'],stone:['fog','rip','memorial','cache'],camp:['stream','litter','cache','bird'],pass:['blister','storm','fog','altitude','scramble'],valley:['ford','stream','bird'],lake:['ford','litter','memorial','bird']
};
export const ACHIEVEMENTS = [
  {id:'home',name:'把自己带回来',desc:'完成、撤离或获救，平安结束一程。',icon:'⌂'},
  {id:'crossing',name:'风雪之后',desc:'抵达山下接应点。',icon:'△'},
  {id:'rescuer',name:'消息送到了',desc:'许舟等到了救援。',icon:'◎'},
  {id:'escort',name:'两个人的归途',desc:'陪鹿宁安全撤回山脚。',icon:'⫽'},
  {id:'leaveNoTrace',name:'山里少了一点垃圾',desc:'把拾起的垃圾带到安全区域。',icon:'♧'},
  {id:'light',name:'轻装有备',desc:'初始负重低于 18 kg，且抵达终点。',icon:'⌁'},
  {id:'winter',name:'漫长的寒夜',desc:'风雪情境中抵达或完成救援。',icon:'❄'},
  {id:'kindness',name:'一路有回声',desc:'平安结束，途中善意记录达到 7。',icon:'✧'}
];
