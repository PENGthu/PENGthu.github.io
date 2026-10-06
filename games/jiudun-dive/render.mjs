// Canvas 2D cross-section renderer. Reads game state, never changes it.
import {POINTS, caveAt, penetration} from './cave.mjs';

const WATER = [[0,'#5fd0d6'],[15,'#1f8fa3'],[45,'#0d4f63'],[120,'#06243a'],[280,'#02070d']];
const SKY_D = -9, POOL_HALF = 12.5;
const hash = n => { const x = Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); };

// Light reaching the diver from the skylight, 0..1.
export function ambient(s) {
  const here = caveAt(s.pos), open = Math.max(0, 1-s.depth/45);
  return here.overhead ? open*Math.max(0, 1-penetration(s.pos)/10) : open;
}
// Visibility radius in metres.
export const visibility = s => Math.max(ambient(s)*30, s.battery>0 ? 9 : 1)*(1-.85*s.silt);

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d'), fog = document.createElement('canvas'), fctx = fog.getContext('2d');
  let W = 0, H = 0, dpr = 1;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio||1);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    for (const c of [canvas, fog]) { c.width = W*dpr; c.height = H*dpr; }
  }

  function draw(s, {map=false, time=0}={}) {
    if (canvas.width !== Math.round(canvas.getBoundingClientRect().width*dpr)) resize();
    const here = caveAt(s.pos), wobble = s.narcosis*.6;
    const scale = map ? Math.min(H/300, W/90) : Math.max(8, H/32);
    const cam = map ? {x:28, d:136} : {x:here.x+Math.sin(time*1.3)*wobble, d:here.d+Math.cos(time*.9)*wobble};
    const X = x => (x-cam.x)*scale+W/2, Y = d => (d-cam.d)*scale+H/2;
    ctx.setTransform(dpr,0,0,dpr,0,0);

    // Rock, strata and sky.
    ctx.fillStyle = '#16130f'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = 'rgba(255,240,210,.035)'; ctx.lineWidth = 1;
    for (let d=Math.floor((cam.d-H/2/scale)/7)*7; Y(d)<H; d+=7) {
      ctx.beginPath(); ctx.moveTo(0,Y(d)+Math.sin(d)*4); ctx.lineTo(W,Y(d)-Math.cos(d)*4); ctx.stroke();
    }
    if (Y(SKY_D) > 0) {
      const sky = ctx.createLinearGradient(0,Y(SKY_D-30),0,Y(0));
      sky.addColorStop(0,'#bfe3ee'); sky.addColorStop(1,'#eef7f2');
      ctx.fillStyle = sky; ctx.fillRect(0,0,W,Y(SKY_D));
      ctx.fillStyle = '#2f5a3a'; ctx.fillRect(0,Y(SKY_D)-3,W,3);
      ctx.beginPath();
      ctx.moveTo(X(-21),Y(SKY_D)); ctx.lineTo(X(-POOL_HALF),Y(0)); ctx.lineTo(X(POOL_HALF),Y(0)); ctx.lineTo(X(21),Y(SKY_D));
      ctx.fillStyle = sky; ctx.fill();
    }

    // Water body: the pool plus the passage stroked at its local width.
    const water = ctx.createLinearGradient(0,Y(0),0,Y(280));
    for (const [d,c] of WATER) water.addColorStop(d/280,c);
    ctx.fillStyle = water; ctx.fillRect(X(-POOL_HALF),Y(0),POOL_HALF*2*scale,6*scale);
    ctx.save(); ctx.beginPath(); ctx.rect(0,Y(0),W,H); ctx.clip();
    ctx.strokeStyle = water; ctx.lineCap = 'round';
    for (let i=0;i<POINTS.length-1;i++) {
      const a = POINTS[i], b = POINTS[i+1];
      ctx.lineWidth = Math.min(a.w,b.w)*scale;
      ctx.beginPath(); ctx.moveTo(X(a.x),Y(a.d)); ctx.lineTo(X(b.x),Y(b.d)); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(-POOL_HALF),Y(0)); ctx.lineTo(X(POOL_HALF),Y(0)); ctx.stroke();

    // Sunbeams through the skylight.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k=0;k<5;k++) {
      const x0 = -9+k*4.5+Math.sin(time*.3+k)*.8, beam = ctx.createLinearGradient(0,Y(0),0,Y(38));
      beam.addColorStop(0,'rgba(190,250,255,.16)'); beam.addColorStop(1,'rgba(190,250,255,0)');
      ctx.fillStyle = beam; ctx.beginPath();
      ctx.moveTo(X(x0),Y(0)); ctx.lineTo(X(x0+1.6),Y(0)); ctx.lineTo(X(x0+5),Y(38)); ctx.lineTo(X(x0+2.4),Y(38)); ctx.fill();
    }
    ctx.restore();

    // Guideline and markers.
    ctx.strokeStyle = '#f2d36b'; ctx.lineWidth = map ? 1.5 : 2; ctx.setLineDash([]);
    ctx.beginPath(); POINTS.slice(2).forEach((p,i)=>i ? ctx.lineTo(X(p.x),Y(p.d)) : ctx.moveTo(X(p.x),Y(p.d))); ctx.stroke();
    ctx.font = `${map?11:12}px system-ui, sans-serif`; ctx.fillStyle = 'rgba(240,230,200,.85)';
    for (const p of POINTS) if (p.label) ctx.fillText(p.label, X(p.x+p.w/2)+6, Y(p.d)+4);

    // Decompression ceiling.
    if (s.ceiling>0) {
      ctx.strokeStyle = '#ff6b5b'; ctx.lineWidth = 1.5; ctx.setLineDash([6,5]);
      ctx.beginPath(); ctx.moveTo(0,Y(s.ceiling)); ctx.lineTo(W,Y(s.ceiling)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ff8b7d'; ctx.fillText(`减压上限 ${s.ceiling.toFixed(1)} m`, W-120, Y(s.ceiling)-6);
    }

    const sx = X(here.x), sy = Y(here.d), vis = visibility(s);
    if (!map) {
      // Silt and bubbles around the diver.
      for (let i=0;i<Math.floor(s.silt*180);i++) {
        const r = hash(i)*vis*.9+1, a = hash(i+99)*Math.PI*2+time*.05*(hash(i+7)-.5);
        ctx.fillStyle = `rgba(165,135,90,${.25+hash(i+3)*.35})`;
        ctx.fillRect(sx+Math.cos(a)*r*scale, sy+Math.sin(a)*r*scale+Math.sin(time+i)*3, 2.5, 2.5);
      }
      if (s.gases[s.active].bar>0 && !s.outcome) {
        ctx.fillStyle = 'rgba(220,250,255,.7)';
        for (let k=0;k<6;k++) {
          const ph = (time*.5+k/6)%1, by = here.d-.6-ph*Math.min(8, here.d);
          ctx.beginPath(); ctx.arc(X(here.x+Math.sin(ph*9+k)*.4), Y(by), 1.5+ph*2.5, 0, Math.PI*2); ctx.fill();
        }
      }
      // Darkness with a torch-shaped hole.
      const dark = Math.min(.97, 1-ambient(s)*.85);
      fctx.setTransform(dpr,0,0,dpr,0,0); fctx.globalCompositeOperation = 'source-over';
      fctx.clearRect(0,0,W,H); fctx.fillStyle = `rgba(0,3,6,${dark})`; fctx.fillRect(0,0,W,H);
      fctx.globalCompositeOperation = 'destination-out';
      const dir = (s.move<0 ? -1 : 1), lx = sx+here.dirX*dir*vis*.3*scale, ly = sy+here.dirD*dir*vis*.3*scale;
      const hole = fctx.createRadialGradient(lx,ly,0,lx,ly,vis*scale);
      hole.addColorStop(0,'rgba(0,0,0,1)'); hole.addColorStop(.55,'rgba(0,0,0,.8)'); hole.addColorStop(1,'rgba(0,0,0,0)');
      fctx.fillStyle = hole; fctx.fillRect(0,0,W,H);
      ctx.drawImage(fog,0,0,W,H);
      if (s.narcosis>.05) {
        const v = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.7);
        v.addColorStop(0,'rgba(120,40,140,0)'); v.addColorStop(1,`rgba(120,40,140,${s.narcosis*.55})`);
        ctx.fillStyle = v; ctx.fillRect(0,0,W,H);
      }
    }

    drawDiver(ctx, sx, sy, here, s, map ? 7 : Math.max(22, 1.9*scale));
    if (map) {
      ctx.strokeStyle = '#7ff0ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, 10+Math.sin(time*4)*2, 0, Math.PI*2); ctx.stroke();
    }

    // Depth ruler.
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0,0,44,H);
    ctx.fillStyle = '#cfe6e8'; ctx.strokeStyle = 'rgba(207,230,232,.5)'; ctx.font = '11px ui-monospace, monospace';
    const stepM = map ? 25 : 5;
    for (let d=Math.max(0,Math.ceil((cam.d-H/2/scale)/stepM)*stepM); Y(d)<H; d+=stepM) {
      const major = d%(stepM*2)===0;
      ctx.beginPath(); ctx.moveTo(major?30:36,Y(d)); ctx.lineTo(44,Y(d)); ctx.stroke();
      if (major) ctx.fillText(String(d), 4, Y(d)+4);
    }
    ctx.fillStyle = '#7ff0ff'; ctx.beginPath(); ctx.moveTo(44,sy); ctx.lineTo(36,sy-5); ctx.lineTo(36,sy+5); ctx.fill();
  }
  resize();
  return {draw, resize};
}

function drawDiver(ctx, x, y, here, s, size) {
  const dir = s.move<0 ? -1 : 1;
  let ang = Math.atan2(here.dirD*dir, here.dirX*dir);
  if (here.d<1) ang = 0;
  ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
  const L = size, T = size*.22;
  ctx.fillStyle = '#c9d4d6'; ctx.fillRect(-L*.45, -T*1.25, L*.55, T*.7);            // cylinders
  ctx.fillStyle = s.outcome && s.outcome.kind!=='surfaced' ? '#6a6f73' : '#1d2a33';
  ctx.beginPath(); ctx.ellipse(0, 0, L*.42, T*.6, 0, 0, Math.PI*2); ctx.fill();      // body
  ctx.fillStyle = '#e8b04a'; ctx.beginPath(); ctx.arc(L*.47, 0, T*.5, 0, Math.PI*2); ctx.fill(); // hood
  ctx.fillStyle = '#ffd84d'; ctx.fillRect(L*.36, T*.3, T*.5, T*.35);               // torch
  ctx.fillStyle = '#1b6f8a';
  ctx.beginPath(); ctx.moveTo(-L*.4,0); ctx.lineTo(-L*.75,-T*.8); ctx.lineTo(-L*.7,T*.8); ctx.fill(); // fins
  ctx.restore();
}
