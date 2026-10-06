// Dives the player can choose. Characters, items and events are fictional.

export const RELICS = [
  {id:'float', name:'塑料浮球', x:-7.5, y:4.4, desc:'渔网上掉下来的，被水草缠在平台边。'},
  {id:'fossil', name:'贝壳化石', x:38, y:40.3, desc:'嵌在洞顶的石灰岩里。几亿年前，这里是海底。'},
  {id:'reel', name:'旧线轮', x:39.5, y:35.6, desc:'线轮还剩半圈线，线头断在支洞里。没人记得是谁的。'}
];

export const MISSIONS = {
  basin: {
    name:'天窗水潭', tag:'训练', depthLabel:'0–30 m', mix:'空气',
    brief:'测水温的记录仪绑在斜坡 28 米的岩壁上，该换电池了。顺便熟悉一下手电、放线和摸线。',
    from:'向导阿吉', quote:'水清得骗人。你看着觉得不深，其实已经三十米了。别往洞口那边去。',
    gases:[{name:'空气', o2:.21, he:0, vol:12, bar:200, role:'back'}],
    reel:45, gf:[40,85], sac:16, start:[-2,.2],
    items:[{id:'logger', name:'水温记录仪', x:18.5, y:28, desc:'绑在岩壁的螺栓上，外壳上贴着测绘队的标签。', goal:true}],
    objectives:[
      {id:'tie', text:'在 5 米平台附近的岩壁上系好主线'},
      {id:'get:logger', text:'取回 28 米处的水温记录仪'},
      {id:'exit', text:'带着记录仪回到水面'}
    ],
    tips:['WASD / 方向键游动，鼠标指哪手电照哪。','靠近岩壁按 R 系线，之后游动会自动放线。','按住空格抓线，沿线回去。']
  },
  mouth: {
    name:'洞口平洞', tag:'洞穴', depthLabel:'40–50 m', mix:'Tx 21/35 + EAN50',
    brief:'测绘队在竖井口留了一块标签，要拿回来对数据。从开放水域放线接上永久线，穿过平洞，到竖井口就回头。',
    from:'测绘队老韦', quote:'平洞底下全是细泥，脚蹼别往下踢。气用掉三分之一就回头，标签拿不到也回头。',
    gases:[{name:'Tx 21/35', o2:.21, he:.35, vol:24, bar:220, role:'back'},
      {name:'EAN50', o2:.5, he:0, vol:11, bar:200, role:'stage'}],
    reel:40, gf:[30,80], sac:18, start:[-2,.2],
    items:[{id:'tag', name:'测绘标签', x:45.5, y:44.5, desc:'塑料牌扎在永久线上，写着站号 J-17。', goal:true}],
    objectives:[
      {id:'tie', text:'系主线，接上 24 米的永久线'},
      {id:'get:tag', text:'取回竖井口的测绘标签'},
      {id:'exit', text:'带着标签出水'}
    ],
    events:{siltFall:{x0:27, x1:38, needs:'tag', at:[31.5,41]}},
    tips:['Shift 游得快，但会把泥踢起来。','能见度归零时按住空格摸线。线上的箭头指向出口。','减压上限出现时，在它下面停着，按住 Q 调整呼吸、等它降下来。']
  },
  shaft: {
    name:'竖井 120', tag:'技术', depthLabel:'120 m', mix:'Tx 10/70 + 三瓶减压气',
    brief:'120 米厅里放着一台深度记录仪，已经记了半年。下竖井取回来。85 米有一段窄口，侧挂瓶多了过不去。',
    from:'测绘队老韦', quote:'减压气可以在去程放在线上，回来再挂。底气是低氧的，二十米以上别吸它。',
    gases:[{name:'Tx 21/35', o2:.21, he:.35, vol:11, bar:200, role:'stage'},
      {name:'Tx 10/70', o2:.1, he:.7, vol:36, bar:230, role:'back'},
      {name:'EAN50', o2:.5, he:0, vol:11, bar:200, role:'stage'},
      {name:'氧气', o2:1, he:0, vol:7, bar:200, role:'stage'}],
    reel:40, gf:[30,75], sac:18, start:[-2,.2],
    items:[{id:'logger120', name:'深度记录仪', x:50, y:125.6, desc:'固定在 120 米厅底部的岩石上，指示灯还在闪。', goal:true}],
    objectives:[
      {id:'tie', text:'系主线，接上 24 米的永久线'},
      {id:'get:logger120', text:'取回 120 米厅的深度记录仪'},
      {id:'exit', text:'带着记录仪出水'}
    ],
    events:{lightFail:{below:70, delay:[60,600]}},
    tips:['先用 Tx 21/35 下潜，二十米以下按 X 换到底气。','窄口前按 G 把侧挂瓶放在线上，回程再按 G 挂回。','卡住时连按 F 往前挤；越慌越卡，先按住 Q 稳住呼吸。']
  }
};
