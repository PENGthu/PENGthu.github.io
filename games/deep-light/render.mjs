import {W,H,SURFACE,TILE,biome,ORES,MONSTERS,BOSSES,RELAYS} from './data.mjs?v=cloud-1';
import {clamp,tile,depth} from './engine.mjs?v=cloud-1';
const INK='#233d35';
function ellipse(c,x,y,rx,ry,color,stroke=INK,width=2){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function box(c,x,y,w,h,r,color,stroke=INK){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function path(c,points,color,stroke=INK,width=2){c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
const hash=(x,y)=>Math.abs(Math.sin(x*12.9898+y*78.233)*43758.5453)%1;
function gem(c,x,y,r,color,time=0){
 const glow=c.createRadialGradient(x,y,0,x,y,r*2.6);glow.addColorStop(0,color+'80');glow.addColorStop(1,color+'00');c.fillStyle=glow;c.fillRect(x-r*3,y-r*3,r*6,r*6);
 path(c,[[x,y-r],[x+r*.85,y-r*.3],[x+r*.6,y+r*.55],[x,y+r],[x-r*.7,y+r*.3],[x-r*.85,y-r*.35]],color,'#324a4a',1.5);
 path(c,[[x,y-r],[x+r*.25,y],[x,y+r],[x-r*.25,y]],'#ffffff55',null);
 c.strokeStyle='#fffbe8aa';c.lineWidth=1;c.beginPath();c.moveTo(x,y-r);c.lineTo(x-r*.85,y-r*.35);c.stroke();
 if(Math.sin(time*2+x)>0.8){c.fillStyle='#fffbd3';c.fillRect(x-r-4,y-r-5,7,1);c.fillRect(x-r-1,y-r-8,1,7);}
}
function cloud(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#f9ffffd9';c.beginPath();c.ellipse(0,5,55,18,0,0,Math.PI*2);c.fill();ellipse(c,-28,-4,23,22,'#ffffffd9',null);ellipse(c,7,-17,31,31,'#ffffffdf',null);ellipse(c,35,-4,25,22,'#ffffffd9',null);c.restore();}
function mineStation(c,x,y,time,relay=false){
 c.save();c.translate(x,y);if(relay){box(c,-48,-64,96,76,14,'#d9c88e');box(c,-39,-50,78,61,9,'#2d6764');ellipse(c,0,-54,12,12,'#ffe7a0');box(c,-23,-31,46,43,18,'#293f40');ellipse(c,0,-12,12,17,'#8ce1c7');c.strokeStyle='#a3edcf';c.lineWidth=3;c.beginPath();c.moveTo(-28,13);c.lineTo(28,13);c.stroke();}
 else{
  box(c,-97,-90,176,101,15,'#edcc92');box(c,-87,-77,156,74,10,'#c59063');path(c,[[-117,-87],[-84,-123],[56,-123],[99,-84]],'#448f85');path(c,[[-118,-87],[101,-84],[101,-76],[-119,-78]],'#246b66');
  box(c,-48,-60,55,72,25,'#324d48');ellipse(c,-20,-24,15,27,'#8fc5ad',INK,2);box(c,21,-57,35,28,5,'#91c6c8');c.strokeStyle=INK;c.beginPath();c.moveTo(38,-56);c.lineTo(38,-30);c.moveTo(23,-42);c.lineTo(54,-42);c.stroke();
  box(c,-93,-26,34,29,5,'#896746');c.fillStyle='#e8c184';c.font='bold 11px sans-serif';c.fillText('工具',-87,-8);
  box(c,-5,-117,82,23,4,'#f2d496');c.fillStyle=INK;c.font='bold 14px sans-serif';c.fillText('云下矿团',3,-100);
  path(c,[[-77,-121],[-67,-195],[-46,-195],[-34,-121]],'#dac599');ellipse(c,-57,-184,8,8,'#cfac6c');
  c.save();c.translate(-57,-184);c.rotate(time*.8);for(let i=0;i<4;i++){c.rotate(Math.PI/2);path(c,[[0,-5],[11,-12],[16,-67],[4,-75],[-3,-16]],'#edf0d1',INK,2);}ellipse(c,0,0,7,7,'#d4a65c');c.restore();
  c.strokeStyle='#596961';c.beginPath();c.moveTo(67,-111);c.lineTo(67,-154);c.stroke();path(c,[[67,-154],[99,-147],[67,-138]],'#ef8b52');
 }
 c.restore();
}
export function drawMiner(c,x,y,scale=1,{face=1,moving=false,flying=false,digging=false,down=false,attack=false,time=0,flash=0}={}){
 c.save();c.translate(x,y);c.scale(scale*face,scale);if(flash>0)c.globalAlpha=Math.sin(time*30)>.2?.5:1;
 const walk=moving?Math.sin(time*14)*5:0,lean=digging?3:0;c.rotate(digging&&down?.1:0);
 ellipse(c,0,24,17,5,'#163c3b35',null);
 // Twin cylinders, braid and scarf define the original silhouette.
 box(c,-19,-7,13,25,6,'#297f7b');box(c,-21,-1,6,20,3,'#70c3b0');ellipse(c,-14,-23,6,9,'#a76142');ellipse(c,-15,-12,5,7,'#b36c45');ellipse(c,-13,-1,5,7,'#955138');path(c,[[-18,3],[-8,3],[-12,12]],'#e56642');
 if(flying){path(c,[[-19,21],[-14,36+Math.sin(time*28)*5],[-8,22]],'#ffd884',null);path(c,[[-17,21],[-14,30],[-11,22]],'#fff4ce',null);}
 box(c,-11,10+walk,10,16,4,'#6d6457');box(c,2,10-walk,10,16,4,'#6d6457');box(c,-14,21+walk,16,8,3,'#365456');box(c,0,21-walk,16,8,3,'#365456');
 box(c,-13,-8,28,26,10,'#ffe4a5');path(c,[[-12,4],[14,4],[14,14],[-11,14]],'#cca95c',null);box(c,-8,5,9,8,2,'#e3b566');ellipse(c,4,-23,15,17,'#f5cc9d');ellipse(c,14,-23,6,5,'#f6d9ad');
 ellipse(c,8,-23,2,3,INK,null);c.strokeStyle='#874a38';c.lineWidth=1.5;c.beginPath();c.arc(9,-17,4,0,1.3);c.stroke();ellipse(c,6,-18,3,2,'#e89172',null);
 path(c,[[-9,-11],[14,-12],[13,-4],[-10,-5]],'#e56642');path(c,[[-10,-7],[-26,-4-Math.sin(time*5)*2],[-22,1],[-6,-2]],'#ee8252');
 c.beginPath();c.moveTo(-14,-29);c.bezierCurveTo(-14,-52,20,-53,20,-29);c.closePath();c.fillStyle='#27a69d';c.fill();c.lineWidth=2.5;c.strokeStyle=INK;c.stroke();path(c,[[-17,-31],[24,-31],[25,-26],[-16,-26]],'#16736f');c.strokeStyle='#8de3cb';c.lineWidth=2;c.beginPath();c.moveTo(-7,-36);c.bezierCurveTo(-6,-43,3,-47,10,-43);c.stroke();ellipse(c,19,-34,6,6,'#476e62');ellipse(c,20,-34,3.5,3.5,'#fff4b5',null);
 const reach=digging||attack?8+Math.sin(time*34)*2:0;ellipse(c,12,-2,6,9,'#ffe0a1');box(c,13+reach,-1,18,9,4,'#436f73');
 c.save();c.translate(30+reach,2);if(down&&digging)c.rotate(Math.PI/2);box(c,-4,-7,11,14,3,'#b9d7d3');path(c,[[7,-7],[24,0],[7,7]],'#a9b9b7');c.strokeStyle='#54797a';c.lineWidth=2;for(let i=5;i<21;i+=5){c.beginPath();c.moveTo(i,-6+i/4);c.lineTo(i+3,5-i/4);c.stroke();}c.restore();
 if(attack){c.strokeStyle='#fff1b4';c.lineWidth=4;c.beginPath();c.arc(8,-2,38,-1,.9);c.stroke();}
 c.restore();
}
function drawMonster(c,e,time){
 const m=MONSTERS[e.kind];c.save();c.translate((e.px+.5)*TILE,(e.py+.5)*TILE);c.scale(e.face,1);if(e.hit>0)c.globalAlpha=.55;
 ellipse(c,0,16,17,4,'#0004',null);
 if(e.kind==='bat'||e.kind==='orb'||e.kind==='sentinel'){
  if(e.kind==='bat'){const f=Math.sin(time*12)*6;path(c,[[-5,-5],[-29,-18-f],[-23,5],[-13,1]],'#63789f');path(c,[[5,-5],[29,-18-f],[23,5],[13,1]],'#63789f');}
  if(e.kind==='orb'){const g=c.createRadialGradient(0,0,1,0,0,34);g.addColorStop(0,'#e4ffa280');g.addColorStop(1,'#e4ffa200');c.fillStyle=g;c.fillRect(-34,-34,68,68);}
  ellipse(c,0,Math.sin(time*4+e.phase)*3,15,15,m.color);
  if(e.kind==='sentinel'){box(c,-17,-10,34,20,6,'#9cb3bd');box(c,-13,-5,26,10,4,'#2c5464');ellipse(c,5,0,4,4,'#ffc575',null);c.strokeStyle='#799497';c.beginPath();c.moveTo(-7,-14);c.lineTo(-14,-23);c.moveTo(7,-14);c.lineTo(14,-23);c.stroke();}
 }else if(e.kind==='spore'){box(c,-7,0,14,18,5,'#ffe1bd');ellipse(c,0,-3,22,13,m.color);ellipse(c,-9,-7,4,3,'#fff6d5',null);ellipse(c,8,-4,4,3,'#fff6d5',null);}
 else if(e.kind==='crab'){for(let i=-1;i<=1;i+=2){c.strokeStyle='#aa6a56';c.lineWidth=4;c.beginPath();c.moveTo(i*8,8);c.lineTo(i*24,18);c.stroke();ellipse(c,i*23,-7,9,11,m.color);};ellipse(c,0,2,19,13,m.color);}
 else{ellipse(c,0,6,22,13,m.color);if(e.kind==='snail'){ellipse(c,-5,-4,15,17,'#d4c195');c.strokeStyle='#968b69';c.beginPath();c.arc(-5,-4,8,0,Math.PI*1.7);c.stroke();}else for(let i=-12;i<=6;i+=7)ellipse(c,i,5,8,10,m.color);}
 if(e.kind!=='sentinel'){ellipse(c,7,-1,4,5,'#fff6db');ellipse(c,9,-1,1.8,2.8,INK,null);}
 if(e.hp<m.hp){box(c,-20,-29,40,4,2,'#1d3038',null);box(c,-20,-29,40*e.hp/m.hp,4,2,'#ef9c77',null);}
 c.restore();
}
function drawBoss(c,b,time){
 c.save();c.translate((b.x+.5)*TILE,(b.y+2)*TILE);const bob=Math.sin(time*2)*3;if(b.dead){c.translate(0,16);c.globalAlpha=.55;box(c,-48,18,96,45,12,'#637d76');ellipse(c,0,13,30,25,'#9cae9b');c.strokeStyle='#526c63';c.beginPath();c.moveTo(-13,8);c.lineTo(13,17);c.stroke();gem(c,0,-16,15,b.color,time);c.restore();return;}
 c.translate(0,bob);if(b.hit>0)c.globalAlpha=.65;
 if(b.id==='bell'){
  box(c,-46,41,32,41,12,'#557d89');box(c,16,41,32,41,12,'#557d89');box(c,-52,-25,104,81,28,'#bca87b');box(c,-39,-12,78,61,22,'#517d86');ellipse(c,0,-20,32,24,'#e7d2a0');ellipse(c,0,-20,17,16,'#759792');c.strokeStyle='#bcaa70';c.lineWidth=7;c.beginPath();c.arc(0,-28,39,Math.PI,0);c.stroke();ellipse(c,-63,18,18,22,'#acc5bd');ellipse(c,63,18,18,22,'#acc5bd');box(c,-27,6,54,16,5,'#243f4c');ellipse(c,-13,14,6,5,'#ffe7a0',null);ellipse(c,13,14,6,5,'#ffe7a0',null);
 }else if(b.id==='garden'){
  for(let i=-2;i<=2;i++){const px=i*25;c.strokeStyle='#607b72';c.lineWidth=7;c.beginPath();c.moveTo(px,39);c.quadraticCurveTo(px*1.5,66,px*1.9,77);c.stroke();}
  ellipse(c,0,11,37,47,'#b4be8d');ellipse(c,0,-15,66,34,'#b98aca');ellipse(c,-28,-21,10,7,'#e7ddb2',null);ellipse(c,19,-28,12,8,'#e7ddb2',null);ellipse(c,41,-12,7,5,'#e7ddb2',null);ellipse(c,-13,17,6,8,'#304c45',null);ellipse(c,13,17,6,8,'#304c45',null);
 }else{
  for(let i=-1;i<=1;i+=2){box(c,i<0?-72:41,30,31,49,8,'#697c84');ellipse(c,i*85,5,24,29,'#ddaa70');box(c,i<0?-80:50,-3,30,24,4,'#82999e');}
  box(c,-59,-34,118,101,20,'#8d9da0');box(c,-42,-18,84,65,14,'#304b61');gem(c,0,9,25,'#8fead5',time);c.save();c.translate(0,-44);c.rotate(time*.9);for(let i=0;i<6;i++){c.rotate(Math.PI/3);path(c,[[0,-7],[12,-30],[-1,-44],[-8,-19]],'#efbd77');}ellipse(c,0,0,17,17,'#b2d6c4');c.restore();ellipse(c,-23,-7,7,5,'#f7c873',null);ellipse(c,23,-7,7,5,'#f7c873',null);
 }
 if(b.windup>0){c.strokeStyle='#ffdf9f';c.lineWidth=3;c.setLineDash([6,6]);c.beginPath();c.ellipse(0,82,110,12,0,0,Math.PI*2);c.stroke();c.setLineDash([]);c.fillStyle='#ffeba1';c.font='bold 14px sans-serif';c.textAlign='center';c.fillText('准备闪避',0,-73);}
 c.restore();
}
export class Renderer{
 constructor(canvas,map){this.canvas=canvas;this.c=canvas.getContext('2d');this.map=map;this.mc=map.getContext('2d');this.cam={x:0,y:0};this.initial=false;}
 draw(s,time,input={}){
  const c=this.c,cw=this.canvas.width,ch=this.canvas.height;
  const targetX=clamp((s.p.px+.5)*TILE-cw*.5,0,W*TILE-cw),targetY=clamp((s.p.py+.5)*TILE-ch*.53,-ch*.25,H*TILE-ch);
  if(!this.initial){this.cam.x=targetX;this.cam.y=targetY;this.initial=true;}this.cam.x+=(targetX-this.cam.x)*.12;this.cam.y+=(targetY-this.cam.y)*.15;
  const cx=this.cam.x,cy=this.cam.y,b=biome(s.p.y),above=s.p.y<13;
  const sky=c.createLinearGradient(0,0,0,ch);sky.addColorStop(0,'#5baeca');sky.addColorStop(.62,'#a6ddd6');sky.addColorStop(1,'#edf3c9');c.fillStyle=above?sky:b.wall;c.fillRect(0,0,cw,ch);
  if(above){for(let i=0;i<6;i++)cloud(c,(i*240-cx*.25+time*7)%1450-100,60+i%3*55,1+i%2*.3);for(let i=0;i<9;i++){const x=i*180-cx*.15;path(c,[[x,ch*.8],[x+80,ch*.3+Math.sin(i)*40],[x+180,ch*.8]],i%2?'#87b8ab':'#78ada5',null);}}
  else{
   for(let i=0;i<18;i++){const x=(i*97-cx*.18)%1100,y=(i*67-cy*.22)%700;c.strokeStyle=b.light+'12';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+40,y+60,x-25,y+150,x+15,y+230);c.stroke();}
  }
  c.save();c.translate(-cx+(s.shake?Math.sin(time*130)*s.shake*13:0),-cy+(s.shake?Math.cos(time*98)*s.shake*8:0));
  const x0=Math.max(0,Math.floor(cx/TILE)-1),x1=Math.min(W-1,Math.ceil((cx+cw)/TILE)+1),y0=Math.max(0,Math.floor(cy/TILE)-1),y1=Math.min(H-1,Math.ceil((cy+ch)/TILE)+1);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const t=tile(s,x,y),px=x*TILE,py=y*TILE,bb=biome(y),n=hash(x,y);
   if(t&&t!==7){
    c.fillStyle=t===6?'#e26e3f':t===5?'#5e6e72':bb.soil;c.fillRect(px,py,TILE+.5,TILE+.5);
    if(t===6){c.fillStyle='#ffd578';c.beginPath();c.moveTo(px,py+9);c.bezierCurveTo(px+9,py+17+Math.sin(time*4+x)*5,px+27,py+2,px+40,py+8);c.lineTo(px+40,py+24);c.lineTo(px,py+24);c.fill();continue;}
    c.fillStyle=t===5?'#879496':bb.stone;c.globalAlpha=.35+n*.2;c.beginPath();c.ellipse(px+12+n*19,py+16,9+n*7,6+n*5,n*4,0,Math.PI*2);c.fill();c.globalAlpha=1;
    c.strokeStyle='#29372c26';c.lineWidth=1.3;c.beginPath();c.moveTo(px+8,py+8);c.lineTo(px+17,py+4);c.lineTo(px+32,py+12);c.moveTo(px+5,py+31);c.lineTo(px+13,py+35);c.lineTo(px+28,py+30);c.stroke();
    if(t===3||t===4||t===5){path(c,[[px+5,py+9],[px+17,py+3],[px+34,py+13],[px+31,py+29],[px+13,py+36],[px+3,py+24]],t===4?'#627c82':t===5?'#7f9293':'#9e9285','#354c4966',1.3);c.strokeStyle='#dbe4ce44';c.beginPath();c.moveTo(px+17,py+4);c.lineTo(px+33,py+13);c.stroke();}
    if(ORES[t]){gem(c,px+19,py+19,10+n*3,ORES[t].color,time);gem(c,px+31,py+29,5,ORES[t].color,time);}
    if(t===18){box(c,px+16,py+18,5,16,2,'#c6db98',null);ellipse(c,px+18,py+17,11,6,'#d7f39e','#68876c',1);ellipse(c,px+31,py+25,6,4,'#91e0b6',null);}
    if(tile(s,x,y-1)===0){c.fillStyle=y===SURFACE+1?'#74a65b':bb.light+'66';c.fillRect(px,py,TILE,3);if(y===SURFACE+1)for(let i=0;i<5;i++)path(c,[[px+i*8,py+2],[px+i*8+3,py-5-n*6],[px+i*8+7,py+3]],'#8ac16b',null);}
   }else if(t===7){c.fillStyle='#a0d78a35';ellipse(c,px+20+Math.sin(time*2+x)*7,py+17,23,16,'#b4d58d25',null);}
  }
  // Surface is an illustrated place, rather than an abstract upgrade menu.
  if(cy<600){mineStation(c,27*TILE,(SURFACE+1)*TILE,time);box(c,36*TILE-24,(SURFACE+1)*TILE-30,48,30,5,'#927450');c.fillStyle='#ffe1a7';c.font='bold 13px sans-serif';c.fillText('矿脉 ↓',36*TILE-20,(SURFACE+1)*TILE-10);}
  for(const a of s.relays)if(Math.abs(a.y*TILE-cy)<ch+150&&Math.abs(a.x*TILE-cx)<cw+100){mineStation(c,(a.x+.5)*TILE,(a.y+2)*TILE,time,true);if(a.active){const g=c.createRadialGradient((a.x+.5)*TILE,(a.y+.5)*TILE,1,(a.x+.5)*TILE,(a.y+.5)*TILE,95);g.addColorStop(0,'#a6ebc83f');g.addColorStop(1,'#a6ebc800');c.fillStyle=g;c.fillRect((a.x+.5)*TILE-95,(a.y+.5)*TILE-95,190,190);}c.font='12px sans-serif';c.fillStyle='#f0dfb3';c.textAlign='center';c.fillText(a.active?'● '+a.name:'○ '+a.name,(a.x+.5)*TILE,(a.y-1)*TILE);c.textAlign='left';}
  for(const chest of s.chests)if(Math.abs(chest.y*TILE-cy)<ch+80){const xx=(chest.x+.5)*TILE,yy=(chest.y+.75)*TILE;box(c,xx-15,yy-17,30,23,4,chest.opened?'#675d4c':'#c9a06b');box(c,xx-17,yy-22,34,9,3,'#e1bc7b');box(c,xx-3,yy-17,6,14,2,'#e8c681');if(!chest.opened){c.font='16px sans-serif';c.fillStyle='#fff0bc';c.fillText(chest.letter?'✉':'✦',xx-7,yy-27);}}
  for(const e of s.enemies)if(e.hp>0&&Math.abs(e.y*TILE-cy)<ch+80&&Math.abs(e.x*TILE-cx)<cw+80)drawMonster(c,e,time);
  for(const b of s.bosses)if(Math.abs(b.y*TILE-cy)<ch+200)drawBoss(c,b,time);
  for(const d of s.drops)gem(c,(d.x+.5)*TILE,(d.y+.6)*TILE,7,ORES[d.tile].color,time);
  for(const b of s.bombs){ellipse(c,(b.x+.5)*TILE,(b.y+.65)*TILE,10,10,'#415052');c.strokeStyle='#e9be76';c.beginPath();c.moveTo((b.x+.5)*TILE,(b.y+.4)*TILE);c.lineTo((b.x+.6)*TILE,(b.y+.24)*TILE);c.stroke();ellipse(c,(b.x+.6)*TILE,(b.y+.24)*TILE,3,3,Math.sin(time*28)>0?'#fff3a6':'#fb9a62',null);}
  for(const p of s.shots){ellipse(c,p.x*TILE,p.y*TILE,p.kind==='spore'?8:15,p.kind==='spore'?9:5,p.kind==='spore'?'#ddb9dc':'#ffdf91','#684f3f',1);}
  for(const b of s.bosses)if(b.awake&&b.windup>0&&b.id==='storm'){c.fillStyle='#ffde9538';c.fillRect((b.targetX-.6)*TILE,(b.y-5)*TILE,1.2*TILE,9*TILE);}
  const moving=Math.abs(s.p.px-s.p.x)>.05,flying=input.up&&s.p.fuel>3;
  const actorScale=tile(s,s.p.x,s.p.y-1)===0?.85:.5;
  drawMiner(c,(s.p.px+.5)*TILE,(s.p.py+1)*TILE-29*actorScale,actorScale,{face:s.p.face,moving,flying,digging:Boolean(s.dig&&!s.dig.blocked),down:s.dig&&s.dig.y>s.p.y,attack:s.attackTimer>.2,time,flash:s.p.inv});
  // The lantern companion keeps a visual thread between the surface and deep caves.
  const droneX=(s.p.px+.5)*TILE-s.p.face*31,droneY=(s.p.py+.2)*TILE-22+Math.sin(time*3)*4;
  ellipse(c,droneX,droneY,10,12,'#fff0bb');ellipse(c,droneX+2,droneY,6,5,'#69bdb3');c.strokeStyle='#d8b77e';c.beginPath();c.moveTo(droneX,droneY-11);c.lineTo(droneX,droneY-18);c.stroke();ellipse(c,droneX,droneY-19,3,3,'#f6c174',null);
  for(const p of s.particles){c.globalAlpha=Math.min(1,p.life*2);ellipse(c,p.x*TILE,p.y*TILE,2.5,2.5,p.color,null);}c.globalAlpha=1;
  if(s.dig){const xx=s.dig.x*TILE,yy=s.dig.y*TILE;c.strokeStyle=s.dig.blocked?'#ee947b':'#fff1bd';c.lineWidth=2;c.strokeRect(xx+3,yy+3,TILE-6,TILE-6);if(!s.dig.blocked){c.fillStyle='#243e4666';c.fillRect(xx+5,yy+TILE-10,TILE-10,4);c.fillStyle='#fff0ae';c.fillRect(xx+5,yy+TILE-10,(TILE-10)*s.dig.progress,4);}}
  c.restore();
  if(!above){const light=c.createRadialGradient((s.p.px+.5)*TILE-cx,(s.p.py+.3)*TILE-cy,100,(s.p.px+.5)*TILE-cx,(s.p.py+.3)*TILE-cy,680);light.addColorStop(0,'#07131e00');light.addColorStop(.7,'#07131e20');light.addColorStop(1,'#07131e99');c.fillStyle=light;c.fillRect(0,0,cw,ch);}
  c.fillStyle=above?'#244b47':'#f1dfb9';c.font='bold 13px sans-serif';c.fillText(above?'风车矿站 · 云海起点':b.tag+' / '+b.name,18,ch-17);
  if(s.sonar>0){c.strokeStyle='#b3efe666';c.lineWidth=2;c.beginPath();c.arc(cw/2,ch/2,(time*140)%400,0,Math.PI*2);c.stroke();}
  this.minimap(s);
 }
 minimap(s){const c=this.mc,w=this.map.width,h=this.map.height;const sx=w/W,sy=h/H;c.fillStyle='#183834';c.fillRect(0,0,w,h);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(s.seen[y*W+x]){const t=s.world[y*W+x];c.fillStyle=ORES[t]?.color||(!t?'#426961':t===6?'#e79a65':biome(y).stone);c.fillRect(x*sx,y*sy,Math.ceil(sx),Math.ceil(sy));}
  for(const b of s.bosses)if(s.seen[idxSafe(b.x,b.y)]){c.fillStyle=b.dead?'#97d7b8':'#ea9f82';c.fillRect(b.x*sx-2,b.y*sy-2,4,4);}
  for(const a of s.relays){c.strokeStyle=a.active?'#dff6b1':'#a6b3a0';c.strokeRect(a.x*sx-2,a.y*sy-2,4,4);}
  c.fillStyle='#fff1b0';c.beginPath();c.arc((s.p.x+.5)*sx,(s.p.y+.5)*sy,3,0,Math.PI*2);c.fill();
 }
}
function idxSafe(x,y){return Math.floor(y)*W+Math.floor(x);}
