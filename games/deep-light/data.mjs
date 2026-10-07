export const W=64,H=148,SURFACE=6,TILE=40,VERSION=3;
export const BIOMES=[
 {name:'风根浅层',tag:'01 · ROOTLIGHT',from:7,to:33,soil:'#b58456',stone:'#977c63',wall:'#574638',light:'#ebc98e',ore:[10,11,12],desc:'风车的根，伸进了大地。'},
 {name:'沉钟水脉',tag:'02 · TIDEBELL',from:34,to:63,soil:'#577c85',stone:'#678e98',wall:'#243f4d',light:'#7ce2e7',ore:[11,12,13,14],desc:'被遗忘的钟声，藏在蓝色岩层里。'},
 {name:'菌光花园',tag:'03 · SPOREGLOW',from:64,to:94,soil:'#8e739d',stone:'#787192',wall:'#302d49',light:'#d8f397',ore:[12,14,15],desc:'黑暗里，也有一整座会发光的花园。'},
 {name:'赤炉遗城',tag:'04 · EMBERWORKS',from:95,to:125,soil:'#a65c4e',stone:'#8b6964',wall:'#442e35',light:'#ffb072',ore:[13,15,16],desc:'旧工厂停止了呼吸，齿轮却仍在转。'},
 {name:'风暴心室',tag:'05 · STORMHEART',from:126,to:147,soil:'#496873',stone:'#658591',wall:'#192b3d',light:'#99ecdf',ore:[15,16,17],desc:'云海的心跳，就在这里。'},
];
export const biome=y=>BIOMES.find(b=>y<=b.to)||BIOMES.at(-1);
export const ORES={
 10:{name:'赤铜',color:'#f6b27c',value:18,weight:1},11:{name:'锡银',color:'#cddfe3',value:32,weight:1},
 12:{name:'月银',color:'#eee1b2',value:65,weight:2},13:{name:'蜜珀',color:'#ffca60',value:110,weight:2},
 14:{name:'潮蓝石',color:'#6fdfea',value:160,weight:3},15:{name:'萤月晶',color:'#c6a6f8',value:250,weight:3},
 16:{name:'焰心石',color:'#ff9977',value:390,weight:4},17:{name:'星纹矿',color:'#a6f3d6',value:650,weight:4},
};
export const EQUIPMENT={
 drill:{name:'钻头',icon:'钻',names:['旋叶钻','青铜锯钻','钴钢螺钻','焰心钻','星纹钻'],costs:[180,480,1100,2400],desc:'更快挖掘，提高近战伤害；解锁更硬的岩层。'},
 tank:{name:'氧气瓶',icon:'氧',names:['小气瓶','双罐气瓶','潮汐气瓶','循环气瓶','云鲸气瓶'],costs:[130,350,850,1700],desc:'氧气容量每级增加 50，可探索更远的支路。'},
 bag:{name:'矿袋',icon:'袋',names:['帆布袋','加固矿袋','折叠矿箱','磁悬矿箱','云鲸货舱'],costs:[100,280,700,1400],desc:'载重每级增加 16，矿物按重量占用容量。'},
 armor:{name:'护具',icon:'盾',names:['矿工夹克','铜叶护甲','钴钢护甲','焰心护甲','星纹护甲'],costs:[180,450,1000,2000],desc:'每级增加 25 点生命，并减少受到的伤害。'},
 jet:{name:'喷气背包',icon:'翼',names:['小风背包','双叶风机','潮汐涡轮','焰心涡轮','云鲸引擎'],costs:[150,400,900,1800],desc:'燃料每级增加 30；在地面自动充能。'},
};
export const SUPPLIES={
 med:{name:'急救包',icon:'✚',price:40,key:'1',desc:'恢复 70 点生命。'},
 air:{name:'氧气胶囊',icon:'◒',price:35,key:'2',desc:'恢复 85 点氧气。'},
 bomb:{name:'岩爆球',icon:'●',price:55,key:'3',desc:'1.3 秒后爆炸，开采岩层并伤害附近目标。小心靠得太近。'},
 beacon:{name:'风铃信标',icon:'⌂',price:75,key:'4',desc:'带着矿物返回最近已点亮的驿站。'},
 sonar:{name:'探矿声呐',icon:'◎',price:30,key:'5',desc:'揭示周围矿物和未探索的洞穴，持续 12 秒。'},
};
export const MONSTERS={
 grub:{name:'铜背毛虫',hp:38,damage:10,color:'#b6cc6c',speed:.55,kind:'walk'},
 bat:{name:'潮翼蝠',hp:42,damage:12,color:'#81cad6',speed:.4,kind:'fly'},
 snail:{name:'钟壳蜗牛',hp:70,damage:16,color:'#8bc3b6',speed:.75,kind:'walk'},
 spore:{name:'弹簧菇',hp:55,damage:14,color:'#db9bcc',speed:.6,kind:'walk'},
 orb:{name:'萤灯妖',hp:48,damage:13,color:'#b8e792',speed:.45,kind:'fly'},
 crab:{name:'炉钳蟹',hp:90,damage:22,color:'#ea9c76',speed:.65,kind:'walk'},
 sentinel:{name:'废城巡逻球',hp:105,damage:24,color:'#b5c3d4',speed:.5,kind:'fly'},
};
export const BOSSES=[
 {id:'bell',name:'沉钟守卫',x:16,y:45,hp:210,color:'#8bd7dd',reward:500,subtitle:'锈蚀的钟壳，仍守着第一枚风印。'},
 {id:'garden',name:'菌园织梦者',x:49,y:83,hp:340,color:'#d4a5e2',reward:1000,subtitle:'听见花园的呼吸，再穿过它的孢子雨。'},
 {id:'storm',name:'风暴织机',x:32,y:137,hp:560,color:'#ffb96e',reward:1800,subtitle:'没有谁被困在地底——是整座城失去了风。'},
];
export const RELAYS=[
 {id:'root',name:'根灯驿站',x:32,y:27},
 {id:'tide',name:'沉钟驿站',x:13,y:59},
 {id:'garden',name:'菌光驿站',x:48,y:98},
 {id:'ember',name:'赤炉驿站',x:32,y:122},
];
export const QUESTS=[
 {id:'copper',title:'第一封矿站来信',body:'卖出 6 块赤铜，帮老狸修好矿站的风叶。',need:6,reward:120,kind:'soldCopper'},
 {id:'relay',title:'给地底留一盏灯',body:'找到并点亮第一座地下驿站。',need:1,reward:160,kind:'relays'},
 {id:'depth',title:'云海之下',body:'抵达 300 米深处，记录沉钟水脉。',need:300,reward:250,kind:'depth'},
 {id:'fungi',title:'会发光的种子',body:'采集 6 株萤光菌，为驿站培育灯园。',need:6,reward:350,kind:'samples'},
 {id:'letters',title:'旧城的回信',body:'打开 4 只旧城信匣，找回失落的矿工笔记。',need:4,reward:450,kind:'logs'},
 {id:'hunter',title:'矿团的巡路员',body:'击退 12 只地底生物，保护驿站之间的路。',need:12,reward:400,kind:'kills'},
];
export const LETTERS=[
 '一号信匣：风不会凭空消失。我们把过剩的风储存在了地下，等到漫长的静风季，再把它送还天空。',
 '二号信匣：沉钟的声音沿水脉传递。驿站的灯亮起来时，请停一会儿。也许另一端有人正等你的回信。',
 '三号信匣：菌园不是杂草，是旧矿团种下的灯。它们照亮过很多人的回家路。',
 '四号信匣：织机失去控制后，风印散落了。停下它，风就会回来。别摧毁心室——我们需要给它一个新的节拍。',
 '五号信匣：如果你读到了这里，请把风铃挂回矿站。那是云上的人知道我们平安的信号。',
];
export const STORIES={
 intro:{who:'阿零',portrait:'drone',title:'最后一封来自云上的信',text:'一场静风让云上的浮岛停止了航行。小芒和阿零落在废弃矿站，发现风被困在地下的旧机器里。挖出矿物，修好装备，点亮驿站，带回三枚风印。让云海重新流动。'},
 copper:{who:'老狸',portrait:'mechanic',title:'风叶终于转起来了',text:'第一批赤铜够用了。你看，矿站已经听见地底的声音。往下走吧，小芒；记得留足氧气，给自己留一条回家的路。'},
 relay:{who:'阿零',portrait:'drone',title:'灯与灯之间，是回家的路',text:'驿站已经接上了风脉。这里能补满生命、氧气和燃料。风铃信标会把你带回最近点亮的驿站，也可以从驿站间传送。'},
 bell:{who:'老狸',portrait:'mechanic',title:'第一枚风印 · 潮汐',text:'钟声回来了！这不是怪物的巢穴，是旧矿团的风库。守卫已经沉睡。带着风印穿过菌光花园，第二座风库就在下面。'},
 garden:{who:'阿零',portrait:'drone',title:'第二枚风印 · 生长',text:'花园接受了新的节拍。云上的种子还能发芽。我们已经有两枚风印，去赤炉遗城找到织机，把它从漫长的风暴里唤醒。'},
 storm:{who:'小芒',portrait:'miner',title:'把风送还天空',text:'风暴织机安静下来。三枚风印重新咬合，第一缕风穿过驿站与矿站，云上的浮岛开始移动。小芒把风铃挂在门口：这一趟，我们给天空送了一封回信。'},
};
