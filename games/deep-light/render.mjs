import {W,H,SURFACE,ORES,CORES,at,depth,clamp} from './engine.mjs';
const T=32;
function hash(x,y,n=0){let h=Math.imul(x+137,374761393)^Math.imul(y+337,668265263)^Math.imul(n+11,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
const palettes=[['#705843','#9a7653','#574837'],['#485658','#62757a','#354549'],['#674749','#946153','#47343c'],['#3d4848','#617270','#273333']];
function palette(y){return palettes[y<36?0:y<69?1:y<103?2:3];}
function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);}
function line(c,x,y,ex,ey,col,width=1){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.stroke();}
function gem(c,x,y,color,size=15,t=0){c.save();c.translate(x,y);c.fillStyle=color;c.beginPath();c.moveTo(0,-size*.65);c.lineTo(size*.45,-size*.2);c.lineTo(size*.5,size*.2);c.lineTo(0,size*.65);c.lineTo(-size*.5,size*.2);c.lineTo(-size*.45,-size*.2);c.closePath();c.fill();c.fillStyle='#ffffff70';c.beginPath();c.moveTo(0,-size*.65);c.lineTo(0,size*.65);c.lineTo(-size*.5,size*.2);c.closePath();c.fill();line(c,-size*.45,-size*.2,size*.45,-size*.2,'#ffffff55');line(c,0,-size*.6,size*.45,-size*.2,'#ffffffc0');c.restore();}
function tree(c,x,y,scale=1,shade=0){c.save();c.translate(x,y);c.scale(scale,scale);rect(c,-3,-5,6,40,'#50594a');const cols=shade?['#36534b','#36554b','#3a5e51']:['#234d43','#2e6550','#468365'];cols.forEach((col,i)=>{c.fillStyle=col;c.beginPath();c.moveTo(0,-77+i*19);c.lineTo(-25+i*2,-25+i*20);c.lineTo(25-i*2,-25+i*20);c.closePath();c.fill();});c.restore();}
function cloud(c,x,y,s){c.fillStyle='#f0edcf55';[[0,0,52,10],[12,-7,24,7],[37,3,26,7]].forEach(([a,b,w,h])=>c.fillRect(x+a*s,y+b*s,w*s,h*s));}
function mountain(c,x,y,w,h,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y);c.lineTo(x+w*.25,y-h*.62);c.lineTo(x+w*.43,y-h*.39);c.lineTo(x+w*.67,y-h);c.lineTo(x+w*.75,y-h*.76);c.lineTo(x+w,y);c.closePath();c.fill();}
function station(c,x,y,time){
  // Workshop, solar lamps, ore crates and a small wooden mine entrance.
  rect(c,x-72,y-72,132,66,'#695943');rect(c,x-76,y-76,140,8,'#a38b61');
  for(let i=0;i<6;i++)rect(c,x-71,y-66+i*10,130,2,'#473f31');
  c.fillStyle='#3a4540';c.beginPath();c.moveTo(x-82,y-78);c.lineTo(x-61,y-107);c.lineTo(x+45,y-107);c.lineTo(x+70,y-78);c.closePath();c.fill();
  for(let i=0;i<8;i++)line(c,x-64+i*15,y-104,x-76+i*18,y-78,'#73816a',2);
  rect(c,x-50,y-55,38,45,'#273b35');rect(c,x-47,y-53,32,42,'#354638');rect(c,x-45,y-51,12,17,'#d3a66a');rect(c,x-30,y-51,12,17,'#8cb19c');rect(c,x-49,y-32,34,3,'#a28a56');
  rect(c,x+6,y-49,33,43,'#29352e');rect(c,x+8,y-48,29,40,'#25312a');rect(c,x+13,y-43,18,12,'#8fa68c');rect(c,x+30,y-27,3,3,'#eac784');
  rect(c,x-44,y-88,92,18,'#d3c09a');c.fillStyle='#4b5745';c.font='bold 10px sans-serif';c.textAlign='center';c.fillText('松 风 矿 站',x+2,y-75);
  for(let i=0;i<3;i++){rect(c,x+65+i*20,y-21,19,17,'#91774b');rect(c,x+65+i*20,y-21,19,3,'#b79b65');line(c,x+66+i*20,y-16,x+81+i*20,y-6,'#d0b579',2);}
  rect(c,x-103,y-37,5,33,'#566452');rect(c,x-105,y-43,9,8,'#ffdc8b');
  const glow=c.createRadialGradient(x-100,y-39,1,x-100,y-39,35);glow.addColorStop(0,'#ffe29d44');glow.addColorStop(1,'#ffe29d00');c.fillStyle=glow;c.fillRect(x-135,y-75,70,70);
  // NPC leaning on the mine counter.
  rect(c,x-13,y-27,12,16,'#657c69');rect(c,x-10,y-37,8,9,'#dfb883');rect(c,x-13,y-39,14,4,'#d0bd86');rect(c,x-11,y-11,4,7,'#374333');rect(c,x-3,y-11,4,7,'#374333');
  rect(c,x-129,y-9,49,9,'#7a6343');rect(c,x-125,y-39,5,33,'#786147');rect(c,x-87,y-39,5,33,'#786147');rect(c,x-129,y-44,49,8,'#ac8654');rect(c,x-119,y-35,31,3,'#171e19');
}
function miner(c,x,y,s,time,input){
  c.save();c.translate(Math.round(x),Math.round(y));if(s.p.face<0)c.scale(-1,1);
  if(s.p.invincible>0 && Math.sin(time*30)>0)c.globalAlpha=.45;
  const stride=(input.left||input.right||input.down)?Math.sin(time*19)*2:0;
  // Backpack and jet exhaust.
  rect(c,-13,-2,8,15,'#6c8b83');rect(c,-12,0,3,10,'#b6b7a0');
  if(input.up){rect(c,-13,13,6,5,'#ffe7a1');rect(c,-12,18,4,6+Math.floor(Math.sin(time*40)*3),'#f29a63');}
  rect(c,-7,12,6,6+Math.round(stride),'#293b3e');rect(c,3,12,6,6-Math.round(stride),'#293b3e');rect(c,-9,17+stride,9,3,'#152a2d');rect(c,3,17-stride,9,3,'#152a2d');
  rect(c,-8,-2,17,16,s.upgrades.armor>1?'#718f93':'#bd8452');rect(c,-7,2,15,2,'#edb776');rect(c,-2,-2,4,14,'#644e3b');rect(c,-4,13,10,2,'#d6bb80');
  rect(c,-6,-15,14,12,'#e7bc8a');rect(c,-8,-18,19,7,'#d6a343');rect(c,-5,-23,14,8,'#f7c65a');rect(c,-5,-23,4,8,'#a77c38');rect(c,8,-16,5,5,'#f1efc6');rect(c,2,-10,2,3,'#354139');rect(c,6,-5,3,2,'#ad794f');
  const digging=!!s.dig || s.attackTimer>0;const arm=digging?Math.sin(time*40)*2:0;
  rect(c,6,0+arm,10,5,'#d19b62');rect(c,14,-1+arm,9,7,'#91a7a0');rect(c,22,1+arm,8,3,'#ded8bb');rect(c,26,arm,3,5,'#a9b7aa');
  if(digging){rect(c,29,arm-2,2,2,'#fff1bc');rect(c,30,arm+5,2,2,'#f4c779');}
  c.restore();
}
function tile(c,x,y,t,wx,wy,time){
  const [base,light,dark]=palette(wy);
  if(t===0){rect(c,x,y,T,T,wy<36?'#27302c':wy<69?'#1b292e':wy<103?'#2c222a':'#17282a');if(hash(wx,wy)<.3)rect(c,x+5+Math.floor(hash(wx,wy,7)*20),y+8,2,2,'#ffffff08');return;}
  if(t===10){rect(c,x,y,T,T,'#3e2b28');rect(c,x,y+13,T,19,'#ba603e');rect(c,x,y+12,32,4,'#f3a75b');for(let i=0;i<3;i++)rect(c,x+((time*12+i*13+wx*3)%30),y+14+i*5,5,2,'#ffd186');return;}
  if(t===14){rect(c,x,y,T,T,'#23312b');rect(c,x+7,y+12,18,18,'#5c7462');rect(c,x+10,y+6,12,17,'#c3b781');rect(c,x+13,y-4,6,16,'#8cf0d7');const g=c.createRadialGradient(x+16,y+5,1,x+16,y+5,38);g.addColorStop(0,'#a3ffcc44');g.addColorStop(1,'#a3ffcc00');c.fillStyle=g;c.fillRect(x-24,y-24,80,80);return;}
  rect(c,x,y,T,T,base);rect(c,x,y,T,2,light);rect(c,x,y,2,T,light+'90');rect(c,x,y+T-2,T,2,dark);rect(c,x+T-2,y,2,T,dark);
  // Deterministic texture avoids shimmering when the camera moves.
  for(let i=0;i<6;i++){const rx=Math.floor(hash(wx,wy,i)*24)+3,ry=Math.floor(hash(wx+8,wy,i)*24)+3;rect(c,x+rx,y+ry,2+Math.floor(hash(wx,wy,i+9)*4),2,i%2?dark:light+'80');}
  line(c,x+4,y+29,x+12,y+25,dark);line(c,x+21,y+3,x+25,y+8,dark);
  if(t===2||t===8||t===9){const col=t===9?'#283739':t===8?'#3b4850':'#5c6460';rect(c,x+4,y+7,22,18,col);rect(c,x+7,y+4,16,24,col);line(c,x+9,y+7,x+20,y+7,t===9?'#567279':'#839081',2);line(c,x+16,y+10,x+12,y+17,dark,2);}
  if(ORES[t]){
    const color=ORES[t].color;
    if(t>=6){gem(c,x+16,y+17,color,18);gem(c,x+7,y+24,color,7);}
    else {[[9,12,7,5],[18,8,6,6],[19,20,7,5],[9,23,5,3]].forEach(([a,b,w,h])=>{rect(c,x+a,y+b,w,h,color);rect(c,x+a,y+b,w,1,'#ffffff88');});}
    if(Math.sin(time*2+wx+wy)> .92){rect(c,x+21,y+7,1,7,'#fff4d1');rect(c,x+18,y+10,7,1,'#fff4d1');}
  }
  const ci=CORES.findIndex(q=>q.tile===t);
  if(ci>=0){rect(c,x,y,T,T,'#203630');const glow=c.createRadialGradient(x+16,y+16,0,x+16,y+16,60);glow.addColorStop(0,CORES[ci].color+'88');glow.addColorStop(1,CORES[ci].color+'00');c.fillStyle=glow;c.fillRect(x-44,y-44,120,120);gem(c,x+16,y+16+Math.sin(time*2)*2,CORES[ci].color,25);}
}
export class Renderer {
  constructor(canvas,map){this.canvas=canvas;this.c=canvas.getContext('2d');this.map=map;this.mc=map.getContext('2d');this.cam={x:9,y:0};}
  resize(){const box=this.canvas.getBoundingClientRect();this.canvas.width=Math.round(box.width);this.canvas.height=Math.round(box.height);this.c.imageSmoothingEnabled=false;}
  draw(s,time,input={}) {
    const c=this.c,w=this.canvas.width,h=this.canvas.height,p=s.p;
    const targetX=clamp((p.px+.5)*T-w*.5,0,W*T-w),targetY=clamp((p.py+.5)*T-h*.48,0,H*T-h);
    this.cam.x+=(targetX-this.cam.x)*.13;this.cam.y+=(targetY-this.cam.y)*.14;
    if(Math.abs(targetX-this.cam.x)>w || Math.abs(targetY-this.cam.y)>h)this.cam={x:targetX,y:targetY};
    let cx=Math.round(this.cam.x),cy=Math.round(this.cam.y);
    if(s.noise>0){cx+=Math.round(Math.sin(time*83)*s.noise*9);cy+=Math.round(Math.cos(time*91)*s.noise*6);}
    c.clearRect(0,0,w,h);rect(c,0,0,w,h,'#172a2c');
    const ground=(SURFACE+1)*T-cy;
    if(cy<ground+cy){
      const sky=c.createLinearGradient(0,-cy,0,ground);sky.addColorStop(0,'#70968e');sky.addColorStop(.65,'#c4c6a1');sky.addColorStop(1,'#e3c79b');c.fillStyle=sky;c.fillRect(0,-cy,w,ground+cy);
      const sunX=w*.72-cx*.04;const sunY=60-cy;
      c.fillStyle='#f5df9e';c.beginPath();c.arc(sunX,sunY,23,0,Math.PI*2);c.fill();
      cloud(c,((time*3+90)%(w+150))-80,32-cy,1.2);cloud(c,w*.6+30-time%100,82-cy,.8);
      for(let i=-1;i<5;i++)mountain(c,i*280-cx*.13,ground-16,380,116+(i%2)*33,'#778d76');
      for(let i=-1;i<8;i++)mountain(c,i*190-cx*.25,ground-1,260,75+(i%3)*14,'#587b64');
      for(let i=0;i<17;i++)tree(c,i*97-cx*.48,ground-26,.65+(i%3)*.1,1);
      rect(c,0,ground-7,w,9,'#5d784e');rect(c,0,ground-3,w,4,'#aeb56c');
      for(let x=0;x<W;x++) {if(x<16||x>31)tree(c,x*T-cx,ground-16,.8+(hash(x,0)*.5));}
      station(c,19*T-cx,ground-1,time);
      // Signpost to the excavation.
      const sign=29*T-cx;rect(c,sign,ground-44,4,40,'#5f6047');rect(c,sign-15,ground-46,44,18,'#c4ad7c');c.font='9px sans-serif';c.textAlign='center';c.fillStyle='#425442';c.fillText('矿区 ↓',sign+7,ground-34);
      const entrance=24*T-cx;rect(c,entrance-18,ground-7,70,7,'#4e4631');for(let i=0;i<5;i++)rect(c,entrance-15+i*14,ground-5,10,4,'#ac8550');
    }
    const x0=Math.max(0,Math.floor(cx/T)),x1=Math.min(W-1,Math.ceil((cx+w)/T));
    const y0=Math.max(SURFACE+1,Math.floor(cy/T)),y1=Math.min(H-1,Math.ceil((cy+h)/T));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)tile(c,x*T-cx,y*T-cy,at(s,x,y),x,y,time);
    // Roots, small cave props and deep stone pillars are procedural scenery.
    for(let x=x0;x<=x1;x++){if(at(s,x,6)!==0){rect(c,x*T-cx+7,ground+4,2,12,'#342d23');rect(c,x*T-cx+9,ground+13,7,2,'#342d23');}}
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(at(s,x,y)===0&&at(s,x,y+1)!==0&&hash(x,y)<.2){
      const xx=x*T-cx,yy=y*T-cy;c.fillStyle=y<69?'#709b86':'#a77f7e';rect(c,xx+8,yy+25,2,7,c.fillStyle);rect(c,xx+4,yy+22,10,4,c.fillStyle);if(y>103){rect(c,xx+19,yy+10,6,22,'#394e4a');rect(c,xx+16,yy+8,12,4,'#617062');}
    }
    for(const e of s.enemies){if(e.hp<=0 || Math.abs(e.y-p.y)>20)continue;const xx=(e.x+.5)*T-cx,yy=(e.y+.65)*T-cy;const col=e.hit>0?'#fff0c2':e.kind==='ember'?'#d87e5c':'#83a77b';c.save();c.translate(xx,yy);rect(c,-12,-7,24,14,col);rect(c,-9,-11,18,4,col);rect(c,-14,4,28,6,col);rect(c,-5,-4,3,4,'#203c32');rect(c,5,-4,3,4,'#203c32');rect(c,-3,4,9,2,'#46624c');if(e.kind==='ember'){rect(c,-7,-15,3,5,'#ffc077');rect(c,6,-17,3,7,'#ffc077');}if(e.hp<e.maxHp){rect(c,-13,-19,26,2,'#172a28');rect(c,-13,-19,Math.max(0,26*e.hp/e.maxHp),2,'#e8b07d');}c.restore();}
    const b=s.boss;
    if(!b.dead && y1>=105){const bx=(b.x+.5)*T-cx,by=(b.y+.5)*T-cy;c.save();c.translate(bx,by);rect(c,-25,-30,50,39,b.flash>0?'#cfb98a':'#61756d');rect(c,-19,-43,38,15,'#7d8e7a');rect(c,-29,-34,9,18,'#3c5751');rect(c,21,-34,9,18,'#3c5751');rect(c,-18,6,12,14,'#3b514b');rect(c,8,6,12,14,'#3b514b');rect(c,-30,-23,9,25,'#4c665c');rect(c,22,-23,9,25,'#4c665c');rect(c,-14,-33,7,5,'#ffbd6b');rect(c,8,-33,7,5,'#ffbd6b');gem(c,0,-12,s.cores.every(Boolean)?'#ffbc73':'#95e4c5',18);if(!s.cores.every(Boolean)){c.strokeStyle='#9ce9d380';c.lineWidth=2;c.beginPath();c.ellipse(0,-12,44,52,0,0,Math.PI*2);c.stroke();}if(b.phase===1){c.fillStyle='#ff745a25';c.fillRect(-145,18,290,5);line(c,-145,by>0?20:20,145,20,'#e5805966',2);}c.restore();}
    for(const b of s.bombs){const bx=(b.x+.5)*T-cx,by=(b.y+.65)*T-cy;rect(c,bx-6,by-6,12,12,'#2b3432');rect(c,bx-4,by-9,8,4,'#8b8966');line(c,bx+1,by-10,bx+5,by-15,'#ccb77d',2);rect(c,bx+4,by-17,3,3,Math.sin(time*30)>0?'#fff3c1':'#f4a465');}
    const px=(p.px+.5)*T-cx,py=(p.py+.45)*T-cy;
    miner(c,px,py,s,time,input);
    if(s.dig){const dx=s.dig.x*T-cx,dy=s.dig.y*T-cy;rect(c,dx+3,dy+27,26,3,'#2b3429');rect(c,dx+3,dy+27,26*Math.min(1,s.dig.progress),3,'#ffce7a');c.strokeStyle='#efd693aa';c.lineWidth=1;c.strokeRect(dx+1,dy+1,30,30);}
    for(const particle of s.particles){c.globalAlpha=clamp(particle.life*2,0,1);rect(c,particle.x*T-cx,particle.y*T-cy,3,3,particle.color);}c.globalAlpha=1;
    for(const e of s.effects){const ex=(e.x+.5)*T-cx,ey=(e.y+.5)*T-cy;if(e.kind==='explosion'){c.fillStyle=`rgba(255,194,110,${e.life})`;c.beginPath();c.arc(ex,ey,(.5-e.life)*150+5,0,Math.PI*2);c.fill();}else if(e.kind==='slash'){c.strokeStyle='#ffd99b';c.lineWidth=3;c.beginPath();c.arc(ex,ey,24,-Math.PI*.65,Math.PI*.45);c.stroke();}else if(e.kind==='shock'){c.strokeStyle=`rgba(244,150,93,${e.life})`;c.lineWidth=4;c.beginPath();c.ellipse(ex,ey+17,(.6-e.life)*230,12,0,0,Math.PI*2);c.stroke();}else if(e.kind==='warning'){c.fillStyle=`rgba(239,99,74,${.08+.06*Math.sin(time*16)})`;c.fillRect(ex-150,ey+16,300,6);}}
    // Darkness is drawn over the world, with a clear pool around the headlamp.
    if(p.y>SURFACE+2){const radius=Math.min(w*.8,245)+s.upgrades.drill*12;const fog=c.createRadialGradient(px,py-8,35,px,py-8,radius);fog.addColorStop(0,'#0c162000');fog.addColorStop(.48,'#0b14201a');fog.addColorStop(1,'#081219b8');c.fillStyle=fog;c.fillRect(0,0,w,h);const glow=c.createRadialGradient(px+9*p.face,py-12,0,px+9*p.face,py-12,85);glow.addColorStop(0,'#ffe4a21b');glow.addColorStop(1,'#ffe4a200');c.fillStyle=glow;c.fillRect(px-85,py-100,170,170);}
    // A soft vignette keeps the stage separate from the surrounding dashboard.
    const vignette=c.createRadialGradient(w/2,h/2,h*.35,w/2,h/2,w*.75);vignette.addColorStop(0,'#101b2200');vignette.addColorStop(1,'#0c161944');c.fillStyle=vignette;c.fillRect(0,0,w,h);
    if(p.air<25 && !s.surface){c.strokeStyle=`rgba(235,125,83,${.3+Math.sin(time*4)*.15})`;c.lineWidth=8;c.strokeRect(0,0,w,h);}
  }
  drawMap(s,time){
    const c=this.mc,w=this.map.width,h=this.map.height,sx=w/W,sy=h/H;c.clearRect(0,0,w,h);rect(c,0,0,w,h,'#142223');
    const reveal=SURFACE+s.stats.bestDepth/4+7;
    for(let y=6;y<H;y++)for(let x=1;x<W-1;x++){
      if(y>reveal)continue;const t=at(s,x,y);c.fillStyle=t===0?'#566d5e':t===10?'#bb6c4c':ORES[t]?ORES[t].color+'88':palette(y)[0]+'90';c.fillRect(x*sx,y*sy,sx,sy+.2);
    }
    CORES.forEach((q,i)=>{if(s.cores[i])return;c.fillStyle=q.color;c.globalAlpha=.55+.35*Math.sin(time*2);c.fillRect(q.x*sx-2,q.y*sy-2,5,5);c.globalAlpha=1;});
    if(!s.boss.dead){c.fillStyle='#d9a572';c.fillRect(24*sx-2,115*sy-2,5,4);}
    c.strokeStyle='#91b295';c.lineWidth=1;c.beginPath();c.moveTo(0,6*sy);c.lineTo(w,6*sy);c.stroke();
    const px=(s.p.x+.5)*sx,py=(s.p.y+.5)*sy;c.fillStyle='#fff2b1';c.beginPath();c.arc(px,py,2.3,0,Math.PI*2);c.fill();c.strokeStyle='#ffecc577';c.beginPath();c.arc(px,py,5,0,Math.PI*2);c.stroke();
  }
}
