// Canvas 2D renderer: rock tiles, water, light, silt, lines, diver. Reads the sim, never changes it.
import {BOUNDS, CELL, GROUND, SIGNS, hash2, lineLength, pointAt} from './cave.mjs';
import {lightRange, radius} from './sim.mjs';

const TILE_M = 16, PX = 36, TILE_PX = TILE_M*PX;
const WATER = [[0,[79,195,201]],[8,[42,150,166]],[25,[20,96,111]],[45,[11,59,71]],[90,[6,33,43]],[200,[3,13,18]],[290,[2,8,11]]];
const clamp = (v,a=0,b=1) => Math.min(b, Math.max(a,v));
const mix = (a,b,t) => a+(b-a)*t;
function waterColor(d) {
  for (let i=1;i<WATER.length;i++) if (d<=WATER[i][0]) {
    const [d0,c0] = WATER[i-1], [d1,c1] = WATER[i], t = clamp((d-d0)/(d1-d0));
    return c0.map((v,k)=>Math.round(mix(v,c1[k],t)));
  }
  return WATER.at(-1)[1];
}

// Faceted limestone: nearest and second-nearest jittered points on a 1.4 m grid.
function facet(x, y) {
  const g = 1.4, ix = Math.floor(x/g), iy = Math.floor(y/g);
  let d1 = 9, d2 = 9, id = 0;
  for (let j=-1;j<=1;j++) for (let i=-1;i<=1;i++) {
    const cx = ix+i, cy = iy+j, px = (cx+hash2(cx,cy))*g, py = (cy+hash2(cy+7.3,cx-2.1))*g;
    const d = Math.hypot(x-px, y-py);
    if (d<d1) { d2 = d1; d1 = d; id = hash2(cx*1.7+.3, cy*.9-4.1); } else if (d<d2) d2 = d;
  }
  return [id, d2-d1];
}

export function createRenderer(canvas, cave) {
  const ctx = canvas.getContext('2d');
  const fog = document.createElement('canvas'), fctx = fog.getContext('2d');
  const low = document.createElement('canvas'), lctx = low.getContext('2d');
  const tiles = new Map();
  let W = 0, H = 0, dpr = 1, budget = 0;
  const cam = {x:0, y:0, init:false}, bubbles = [], pose = {angle:0};
  let lastBubble = 0;

  // Where to plant water weed: walls facing up into daylit water.
  const plants = [];
  for (let x=-10.6; x<23; x+=.45) for (let y=1; y<34; y+=.25) {
    if (cave.sdf(x,y)<0 && cave.sdf(x,y+.3)>=0) {
      const i = cave.cellAt(x,y);
      if (i>=0 && cave.skylit[i] && hash2(x*3.1,y)>.25) plants.push({x, y:y+.15, h:.5+hash2(x,y*2.3)*(y<14 ? 2.2 : 1.1), ph:hash2(y,x)*6, flower:y<12 && hash2(x*.7,y*1.3)>.55});
      break;
    }
  }
  const peaks = Array.from({length:16}, (_,k)=>({x:-70+k*12+hash2(k,3)*6, h:12+hash2(k,9)*26, w:7+hash2(k,1)*6, far:k%2}));

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = W*dpr; canvas.height = H*dpr;
    fog.width = Math.ceil(W*dpr/2); fog.height = Math.ceil(H*dpr/2);
  }

  function renderTile(tx, ty) {
    const c = document.createElement('canvas'); c.width = c.height = TILE_PX;
    const tc = c.getContext('2d'), img = tc.createImageData(TILE_PX, TILE_PX), d = img.data;
    const wx0 = BOUNDS.x0+tx*TILE_M, wy0 = BOUNDS.y0+ty*TILE_M;
    for (let py=0; py<TILE_PX; py++) {
      const y = wy0+(py+.5)/PX;
      for (let px=0; px<TILE_PX; px++) {
        const x = wx0+(px+.5)/PX, k = (py*TILE_PX+px)*4;
        if (y<GROUND) continue;
        const sd = cave.sdf(x, y);
        if (sd<0) continue;
        const [id, edge] = facet(x, y);
        let shade = .82+id*.32;
        if (edge<.07) shade *= .72+edge*4;
        const deep = clamp(1-(sd-.4)/5, .3, 1);
        let r = 96*shade*deep, g = 86*shade*deep, b = 74*shade*deep;
        if (sd<.24) { const t = 1-sd/.24; r = mix(r,168,t*.55); g = mix(g,160,t*.55); b = mix(b,142,t*.55); }
        if (sd<.04) { r *= .55; g *= .55; b *= .55; }
        if (y<GROUND+.45) { const t = clamp((GROUND+.45-y)/.45); r = mix(r,74,t); g = mix(g,104,t); b = mix(b,58,t); }
        d[k] = r; d[k+1] = g; d[k+2] = b; d[k+3] = 255;
      }
    }
    tc.putImageData(img, 0, 0);
    return c;
  }
  function tile(tx, ty) {
    const key = tx+','+ty;
    let t = tiles.get(key);
    if (!t && budget>0) { budget--; t = renderTile(tx, ty); tiles.set(key, t); }
    return t;
  }
  // Render tiles ahead of time (for the title screen).
  function warm(x0, y0, x1, y1) {
    for (let ty=Math.floor((y0-BOUNDS.y0)/TILE_M); ty<=Math.floor((y1-BOUNDS.y0)/TILE_M); ty++)
      for (let tx=Math.floor((x0-BOUNDS.x0)/TILE_M); tx<=Math.floor((x1-BOUNDS.x0)/TILE_M); tx++) { budget = 1; tile(tx, ty); }
  }

  function draw(s, view) {
    if (canvas.width !== Math.round(canvas.getBoundingClientRect().width*dpr)) resize();
    const {time, dt=.016, look=false} = view;
    const scale = view.scale ?? clamp(Math.min(H/19, W/12), 22, 64);
    const tx = s.x + (look ? s.aimX*4.5 : 0), ty = s.y + (look ? s.aimY*4.5 : 0) - 1;
    if (!cam.init || view.snap) { cam.x = tx; cam.y = ty; cam.init = true; }
    cam.x += (tx-cam.x)*Math.min(1, dt*3.5); cam.y += (ty-cam.y)*Math.min(1, dt*3.5);
    const wob = s.narc*.25, cx = cam.x+Math.sin(time*1.1)*wob, cy = cam.y+Math.cos(time*.8)*wob;
    const X = x => (x-cx)*scale+W/2, Y = y => (y-cy)*scale+H/2;
    const vx0 = cx-W/2/scale, vx1 = cx+W/2/scale, vy0 = cy-H/2/scale, vy1 = cy+H/2/scale;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled = true;

    // Sky, hills, water.
    const sky = ctx.createLinearGradient(0, Y(GROUND-40), 0, Y(GROUND));
    sky.addColorStop(0, '#8fb9c7'); sky.addColorStop(1, '#e6eee2');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, Math.max(0, Y(0)));
    // Karst towers far away (parallax), then trees on the rim.
    const horizon = Y(GROUND);
    if (horizon>0) {
      for (const far of [1,0]) for (const p of peaks) {
        if (p.far!==far) continue;
        const px = W/2+p.x*8-cx*(far ? 2 : 4), w = p.w*(far ? 7 : 9), h = p.h*(far ? 5.5 : 4.5);
        ctx.fillStyle = far ? '#a9c3c2' : '#86a597';
        ctx.beginPath(); ctx.moveTo(px-w, horizon);
        ctx.bezierCurveTo(px-w*.7, horizon-h*.85, px-w*.35, horizon-h, px, horizon-h);
        ctx.bezierCurveTo(px+w*.35, horizon-h, px+w*.7, horizon-h*.85, px+w, horizon);
        ctx.fill();
      }
      ctx.fillStyle = '#3d5c45';
      for (let x=-44; x<70; x+=2.3) {
        if (x>-12.5 && x<12.5) continue;
        const h = 2.5+hash2(x,7)*4, w = .9+hash2(x,3)*.8, bx = x+hash2(x,1);
        ctx.beginPath(); ctx.moveTo(X(bx-w), horizon); ctx.lineTo(X(bx), Y(GROUND-h)); ctx.lineTo(X(bx+w), horizon); ctx.fill();
      }
    }
    const wy0 = Math.max(0, vy0);
    if (Y(wy0)<H) {
      const grad = ctx.createLinearGradient(0, Y(wy0), 0, Y(vy1));
      for (let k=0;k<=6;k++) { const d = wy0+(vy1-wy0)*k/6, [r,g,b] = waterColor(d); grad.addColorStop(k/6, `rgb(${r},${g},${b})`); }
      ctx.fillStyle = grad; ctx.fillRect(0, Math.max(0, Y(wy0)), W, H);
    }
    if (vy0<40) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k=0;k<6;k++) {
        const x0 = -9+k*3.6+Math.sin(time*.25+k)*.6, beam = ctx.createLinearGradient(0, Y(0), 0, Y(36));
        beam.addColorStop(0, 'rgba(200,250,255,.13)'); beam.addColorStop(1, 'rgba(200,250,255,0)');
        ctx.fillStyle = beam; ctx.beginPath();
        ctx.moveTo(X(x0), Y(0)); ctx.lineTo(X(x0+1.4), Y(0)); ctx.lineTo(X(x0+9), Y(36)); ctx.lineTo(X(x0+6.5), Y(36)); ctx.fill();
      }
      ctx.restore();
    }

    // Rock.
    budget = view.tileBudget ?? 2;
    const t0x = Math.floor((vx0-BOUNDS.x0)/TILE_M), t1x = Math.floor((vx1-BOUNDS.x0)/TILE_M);
    const t0y = Math.floor((vy0-BOUNDS.y0)/TILE_M), t1y = Math.floor((vy1-BOUNDS.y0)/TILE_M);
    for (let j=t0y; j<=t1y; j++) for (let i=t0x; i<=t1x; i++) {
      const t = tile(i, j), x = X(BOUNDS.x0+i*TILE_M), y = Y(BOUNDS.y0+j*TILE_M), size = TILE_M*scale;
      if (t) ctx.drawImage(t, x, y, size+.5, size+.5);
      else { ctx.fillStyle = '#3a332b'; ctx.fillRect(x, y, size, size); }
    }
    if (vy0<1 && vy1>-1) {
      ctx.strokeStyle = 'rgba(235,250,250,.75)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x=-11; x<=11.5; x+=.25) { const yy = Y(Math.sin(x*1.7+time*1.6)*.05); x===-11 ? ctx.moveTo(X(x), yy) : ctx.lineTo(X(x), yy); }
      ctx.stroke();
    }

    // Water weed in the daylit basin.
    ctx.lineCap = 'round';
    for (const p of plants) {
      if (p.x<vx0-3 || p.x>vx1+3 || p.y<vy0-3 || p.y>vy1+3) continue;
      for (let k=0;k<3;k++) {
        const sway = Math.sin(time*.9+p.ph+k)*.35, h = p.h*(.7+k*.18), bx = p.x+(k-1)*.12;
        ctx.strokeStyle = k===1 ? 'rgba(86,150,92,.9)' : 'rgba(58,118,72,.85)'; ctx.lineWidth = Math.max(1, .05*scale);
        ctx.beginPath(); ctx.moveTo(X(bx), Y(p.y)); ctx.quadraticCurveTo(X(bx+sway*.4), Y(p.y-h*.55), X(bx+sway), Y(p.y-h)); ctx.stroke();
        if (p.flower && k===1) { ctx.fillStyle = '#f4f6ee'; ctx.beginPath(); ctx.arc(X(bx+sway), Y(p.y-h), Math.max(2, .12*scale), 0, 7); ctx.fill(); ctx.fillStyle = '#e8c547'; ctx.beginPath(); ctx.arc(X(bx+sway), Y(p.y-h), Math.max(1, .04*scale), 0, 7); ctx.fill(); }
      }
    }

    // Lines, signs, tanks, items.
    drawLines(s, X, Y, scale);
    for (const sign of SIGNS) {
      ctx.fillStyle = '#d9d2bd'; ctx.fillRect(X(sign.x)-.35*scale, Y(sign.y)-.22*scale, .7*scale, .44*scale);
      ctx.fillStyle = '#9a2b20'; ctx.font = `700 ${Math.max(9,.3*scale)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', X(sign.x), Y(sign.y)+1);
    }
    for (const g of s.gases) if (!g.carried) drawTank(X(g.x), Y(g.y), scale, g, 0);
    for (const it of s.items) if (it.state==='world') {
      const blink = it.goal && Math.sin(time*5)>0;
      ctx.fillStyle = it.goal ? '#f2c94c' : '#b9b2a2';
      ctx.beginPath(); ctx.roundRect(X(it.x)-.22*scale, Y(it.y)-.14*scale, .44*scale, .28*scale, 3); ctx.fill();
      if (blink) { ctx.fillStyle = '#ff5544'; ctx.beginPath(); ctx.arc(X(it.x)+.12*scale, Y(it.y)-.04*scale, Math.max(1.5,.05*scale), 0, 7); ctx.fill(); }
    }

    // Diver and bubbles.
    const speed = Math.hypot(s.vx, s.vy);
    const want = speed>.03 ? Math.atan2(s.vy, Math.abs(s.vx)+1e-6) : 0;
    pose.angle += (clamp(want, -1.4, 1.4)-pose.angle)*Math.min(1, dt*3);
    const head = {x:s.x+Math.cos(pose.angle)*s.facing*.75, y:s.y+Math.sin(pose.angle)*.75};
    if (!s.outcome && s.noGas<=0 && time-lastBubble>3.2) {
      lastBubble = time;
      for (let k=0;k<7;k++) bubbles.push({x:head.x+(Math.random()-.5)*.15, y:head.y-.1, r:.04+Math.random()*.07, v:.9+Math.random()*.5, ph:Math.random()*6, born:time+k*.06});
    }
    for (let i=bubbles.length-1;i>=0;i--) {
      const b = bubbles[i]; if (b.born>time) continue;
      b.y -= b.v*dt; b.x += Math.sin(time*4+b.ph)*.004;
      if (b.y<0 || cave.sdf(b.x, b.y-b.r)>-.02 || bubbles.length>160) { bubbles.splice(i,1); continue; }
      ctx.strokeStyle = 'rgba(225,250,255,.75)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), Math.max(1.2, b.r*scale), 0, 7); ctx.stroke();
    }
    drawDiver(s, X(s.x), Y(s.y), scale, time);

    // Silt hanging in the water, then darkness with the torch cut out of it.
    const c0x = Math.max(0, Math.floor((vx0-BOUNDS.x0)/CELL)-1), c1x = Math.min(cave.cw-1, Math.ceil((vx1-BOUNDS.x0)/CELL)+1);
    const c0y = Math.max(0, Math.floor((vy0-BOUNDS.y0)/CELL)-1), c1y = Math.min(cave.ch-1, Math.ceil((vy1-BOUNDS.y0)/CELL)+1);
    const lw = c1x-c0x+1, lh = c1y-c0y+1;
    if (low.width!==lw || low.height!==lh) { low.width = lw; low.height = lh; }
    const lx = X(BOUNDS.x0+c0x*CELL), ly = Y(BOUNDS.y0+c0y*CELL), lW = lw*CELL*scale, lH = lh*CELL*scale;
    const simg = lctx.createImageData(lw, lh);
    let anySilt = false;
    for (let j=0;j<lh;j++) for (let i=0;i<lw;i++) {
      const c = s.silt[(c0y+j)*cave.cw+c0x+i];
      if (c>0) { anySilt = true; const k = (j*lw+i)*4; simg.data[k] = 156; simg.data[k+1] = 128; simg.data[k+2] = 90; simg.data[k+3] = Math.min(240, 40+c*260); }
    }
    if (anySilt) { lctx.putImageData(simg, 0, 0); ctx.drawImage(low, lx, ly, lW, lH); }

    // The cut-away rock is lit like the scene near the surface and goes dark with depth.
    const rockLight = y => y<GROUND ? 1 : .9*Math.exp(-Math.max(0,y)/12);
    const dimg = lctx.createImageData(lw, lh);
    for (let j=0;j<lh;j++) for (let i=0;i<lw;i++) {
      const ci = (c0y+j)*cave.cw+c0x+i, y = BOUNDS.y0+(c0y+j+.5)*CELL;
      const amb = y<0 && cave.water[ci]===0 && cave.sdf(BOUNDS.x0+(c0x+i+.5)*CELL, y)<0 ? 1
        : cave.water[ci] ? cave.ambient[ci]/(1+2.5*s.silt[ci]) : Math.max(cave.ambient[ci], rockLight(y));
      dimg.data[(j*lw+i)*4+3] = Math.round(clamp(1-amb*1.05, 0, .97)*255);
    }
    lctx.putImageData(dimg, 0, 0);
    fctx.setTransform(dpr/2,0,0,dpr/2,0,0);
    fctx.globalCompositeOperation = 'source-over'; fctx.imageSmoothingEnabled = true;
    fctx.clearRect(0, 0, W, H);
    const shade = fctx.createLinearGradient(0, Y(0), 0, Y(60));
    for (let k=0;k<=24;k++) shade.addColorStop(k/24, `rgba(0,3,6,${clamp(1-rockLight(k*2.5)*1.05, 0, .97)})`);
    fctx.fillStyle = shade; fctx.fillRect(0, Math.max(0, Y(GROUND)), W, H);
    fctx.clearRect(lx, ly, lW, lH);
    fctx.drawImage(low, lx, ly, lW, lH);
    fctx.globalCompositeOperation = 'destination-out';
    const beam = torchPolygon(s, head);
    const cone = (c, pts) => { c.beginPath(); pts.forEach(([x,y],k)=>k ? c.lineTo(X(x),Y(y)) : c.moveTo(X(x),Y(y))); c.fill(); };
    if (beam) {
      for (const [pts, a] of [[beam.pts, .5], [beam.core, .62]]) {
        const g = fctx.createRadialGradient(X(head.x), Y(head.y), 0, X(head.x), Y(head.y), beam.range*scale);
        g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.5, `rgba(0,0,0,${a*.85})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        fctx.fillStyle = g; cone(fctx, pts);
      }
    }
    const halo = fctx.createRadialGradient(X(s.x), Y(s.y), 0, X(s.x), Y(s.y), 2.3*scale);
    halo.addColorStop(0, `rgba(0,0,0,${s.light.on ? .75 : .35})`); halo.addColorStop(1, 'rgba(0,0,0,0)');
    fctx.fillStyle = halo; fctx.fillRect(X(s.x)-2.5*scale, Y(s.y)-2.5*scale, 5*scale, 5*scale);
    for (const it of s.items) if (it.state==='world' && it.goal && Math.sin(time*5)>0) {
      const g = fctx.createRadialGradient(X(it.x), Y(it.y), 0, X(it.x), Y(it.y), .6*scale);
      g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      fctx.fillStyle = g; fctx.fillRect(X(it.x)-scale, Y(it.y)-scale, 2*scale, 2*scale);
    }
    ctx.setTransform(1,0,0,1,0,0);
    ctx.drawImage(fog, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    // A faint murk so a silt cloud reads even outside the light.
    if (anySilt) {
      for (let k=0;k<simg.data.length;k+=4) if (simg.data[k+3]) { simg.data[k] = 104; simg.data[k+1] = 85; simg.data[k+2] = 60; simg.data[k+3] = Math.min(190, simg.data[k+3]*.7); }
      lctx.putImageData(simg, 0, 0); ctx.drawImage(low, lx, ly, lW, lH);
    }
    if (beam) {
      const hi = cave.cellAt(head.x, head.y), c = Math.min(1, s.silt[hi] ?? 0), dark = 1-Math.min(1, cave.ambient[hi] ?? 1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(X(head.x), Y(head.y), 0, X(head.x), Y(head.y), beam.range*scale);
      g.addColorStop(0, `rgba(255,236,190,${(.1+.22*c)*dark})`); g.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = g; cone(ctx, beam.pts); cone(ctx, beam.core);
      ctx.restore();
    }
    // The line in your hand is felt even when it can't be seen.
    if (s.grip!=null) {
      const ln = s.lines[s.grip], len = lineLength(ln.pts), at = s.gripS ?? 0;
      ctx.strokeStyle = ln.kind==='perm' ? 'rgba(240,245,245,.55)' : 'rgba(255,190,90,.55)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let q=Math.max(0,at-1.5); q<=Math.min(len,at+1.5); q+=.25) { const p = pointAt(ln.pts, q); q===Math.max(0,at-1.5) ? ctx.moveTo(X(p.x),Y(p.y)) : ctx.lineTo(X(p.x),Y(p.y)); }
      ctx.stroke();
    }

    // Screen effects and depth ruler.
    if (s.narc>.05) vignette(`rgba(110,40,140,${s.narc*.5})`);
    if (s.stress>.45) vignette(`rgba(150,20,20,${(s.stress-.45)*(.6+.4*Math.sin(time*(4+s.stress*6)))})`);
    if (s.noGas>0) vignette(`rgba(40,0,0,${Math.min(.85, s.noGas/40)})`);
    ruler(s, Y, scale);
    return {scale, X, Y};
  }

  function vignette(color) {
    const v = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*.25, W/2, H/2, Math.max(W,H)*.7);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, color);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  function ruler(s, Y, scale) {
    ctx.font = '11px ui-monospace, Menlo, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const step = scale>30 ? 1 : 5;
    for (let d=Math.max(0, Math.ceil((s.y-H/2/scale-2)/step)*step); Y(d)<H; d+=step) {
      const major = d%5===0, y = Y(d);
      ctx.strokeStyle = 'rgba(220,235,235,.35)'; ctx.beginPath(); ctx.moveTo(W-(major?16:9), y); ctx.lineTo(W, y); ctx.stroke();
      if (d%10===0) { ctx.fillStyle = 'rgba(220,235,235,.55)'; ctx.fillText(String(d), W-20, y); }
    }
    const y = Y(s.y);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(W-2, y); ctx.lineTo(W-11, y-5); ctx.lineTo(W-11, y+5); ctx.fill();
    ctx.fillText(`${s.y.toFixed(0)}m`, W-14, y-11);
    if (s.ceiling>0) {
      const yc = Y(s.ceiling);
      ctx.strokeStyle = 'rgba(255,107,91,.7)'; ctx.setLineDash([6,5]); ctx.beginPath(); ctx.moveTo(W*.55, yc); ctx.lineTo(W, yc); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ff8b7d'; ctx.fillText(`减压上限 ${s.ceiling.toFixed(1)} m`, W-20, yc-9);
    }
  }

  // Rays from the torch, shortened by rock and by silt.
  function torchPolygon(s, head) {
    const range = lightRange(s);
    if (!range) return null;
    const base = Math.atan2(s.aimY, s.aimX), spread = .46, n = 48, pts = [[head.x, head.y]];
    for (let k=0;k<=n;k++) {
      const a = base-spread+2*spread*k/n, dx = Math.cos(a), dy = Math.sin(a);
      let t = 0, T = 1;
      while (t<range) {
        const x = head.x+dx*t, y = head.y+dy*t;
        if (cave.sdf(x,y)>.15 || y<0) break;
        const i = cave.cellAt(x,y); if (i>=0) T *= Math.exp(-2.6*s.silt[i]*.25);
        if (T<.06) break;
        t += .25;
      }
      pts.push([head.x+dx*t, head.y+dy*t]);
    }
    return {pts, core:[pts[0], ...pts.slice(1+Math.round(n*.22), 1+Math.round(n*.78))], range};
  }

  function drawLines(s, X, Y, scale) {
    for (const [index, ln] of s.lines.entries()) {
      const pts = index===s.laying ? [...ln.pts, [s.x, s.y]] : ln.pts;
      if (pts.length<2) continue;
      const perm = ln.kind==='perm', old = ln.kind==='old';
      ctx.strokeStyle = perm ? '#e8eef0' : old ? '#a99d82' : '#ffb340';
      ctx.lineWidth = Math.max(1.2, (perm ? .055 : .035)*scale);
      ctx.setLineDash(old ? [10,4] : []);
      ctx.beginPath(); pts.forEach(([x,y],k)=>k ? ctx.lineTo(X(x),Y(y)) : ctx.moveTo(X(x),Y(y))); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle;
      for (const [x,y] of [ln.pts[0], ...(ln.done ? [ln.pts.at(-1)] : [])]) { ctx.beginPath(); ctx.arc(X(x), Y(y), Math.max(2.5, .1*scale), 0, 7); ctx.fill(); }
      if (perm) {
        const len = lineLength(ln.pts);
        for (let q=4; q<len; q+=6) {
          const p = pointAt(ln.pts, q), ax = -p.tx, ay = -p.ty, size = Math.max(5, .22*scale);
          const cx = X(p.x), cy = Y(p.y);
          ctx.fillStyle = '#f2f6f6'; ctx.beginPath();
          ctx.moveTo(cx+ax*size, cy+ay*size); ctx.lineTo(cx-ay*size*.6, cy+ax*size*.6); ctx.lineTo(cx+ay*size*.6, cy-ax*size*.6); ctx.fill();
        }
      }
    }
  }

  function drawTank(x, y, scale, g, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    const L = .62*scale, r = .09*scale;
    ctx.fillStyle = g.o2>=.99 ? '#e9ecec' : g.o2>=.32 ? '#f0c419' : '#c9cfd2';
    ctx.beginPath(); ctx.roundRect(-L/2, -r, L, 2*r, r); ctx.fill();
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(L/2-2, -r*.5, Math.max(2,.08*scale), r);
    ctx.restore();
  }

  function drawDiver(s, x, y, scale, time) {
    const dead = s.outcome && s.outcome.how==='death', v = Math.hypot(s.vx, s.vy);
    const kick = v>.03 && !dead ? Math.sin(time*(v>.2 ? 11 : 6.5)) : Math.sin(time*1.3)*.25;
    const m = scale*1.12;
    ctx.save(); ctx.translate(x, y); ctx.scale(s.facing, 1); ctx.rotate(pose.angle);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // fins and legs
    for (const side of [-1,1]) {
      const swing = kick*.3*side;
      ctx.strokeStyle = side<0 ? '#1a252b' : '#24323a'; ctx.lineWidth = .14*m;
      ctx.beginPath(); ctx.moveTo(-.18*m, .02*m); ctx.lineTo(-.5*m, (.03+swing*.25)*m); ctx.lineTo(-.78*m, (.02+swing*.6)*m); ctx.stroke();
      ctx.save(); ctx.translate(-.8*m, (.02+swing*.6)*m); ctx.rotate(swing*.9);
      ctx.fillStyle = side<0 ? '#14537a' : '#1b6f9e';
      ctx.beginPath(); ctx.moveTo(0, -.06*m); ctx.quadraticCurveTo(-.25*m, -.16*m, -.48*m, -.14*m); ctx.lineTo(-.48*m, .13*m); ctx.quadraticCurveTo(-.25*m, .12*m, 0, .06*m); ctx.fill();
      ctx.restore();
    }
    // twinset with manifold
    ctx.fillStyle = '#9aa7ad'; ctx.beginPath(); ctx.roundRect(-.42*m, -.33*m, .84*m, .16*m, .08*m); ctx.fill();
    ctx.fillStyle = '#c3ccd0'; ctx.fillRect(-.36*m, -.31*m, .7*m, .03*m);
    ctx.fillStyle = '#5c666b'; ctx.fillRect(.4*m, -.32*m, .07*m, .12*m);
    // torso
    ctx.fillStyle = '#2a3940'; ctx.beginPath(); ctx.roundRect(-.32*m, -.19*m, .82*m, .33*m, .15*m); ctx.fill();
    ctx.fillStyle = '#3c5059'; ctx.beginPath(); ctx.roundRect(-.26*m, -.17*m, .7*m, .09*m, .05*m); ctx.fill();
    // side-mounted stages
    const stages = s.gases.filter(g=>g.role==='stage' && g.carried);
    stages.forEach((g,k)=>{
      ctx.fillStyle = g.o2>=.99 ? '#eef1f1' : g.o2>=.32 ? '#f2c230' : '#c7ced2';
      ctx.beginPath(); ctx.roundRect(-.34*m, (.1+k*.085)*m, .66*m, .11*m, .055*m); ctx.fill();
      ctx.fillStyle = '#333'; ctx.fillRect(.3*m, (.12+k*.085)*m, .05*m, .07*m);
    });
    // head, hood, mask
    ctx.fillStyle = '#1c262b'; ctx.beginPath(); ctx.ellipse(.6*m, -.05*m, .15*m, .13*m, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7fd0e0'; ctx.beginPath(); ctx.roundRect(.66*m, -.1*m, .09*m, .08*m, .02*m); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(.7*m, -.09*m, .02*m, .03*m);
    ctx.fillStyle = '#e8b04a'; ctx.fillRect(.52*m, .04*m, .1*m, .05*m);
    ctx.restore();
    // the torch arm points wherever the light is aimed
    const hx = x+Math.cos(pose.angle)*s.facing*.4*m, hy = y+Math.sin(pose.angle)*.4*m+.06*m;
    ctx.strokeStyle = '#2f3e45'; ctx.lineWidth = .09*m; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx+s.aimX*.36*m, hy+s.aimY*.36*m); ctx.stroke();
    ctx.fillStyle = '#20282c'; ctx.beginPath(); ctx.arc(hx+s.aimX*.4*m, hy+s.aimY*.4*m, .06*m, 0, 7); ctx.fill();
    if (s.light.on) { ctx.fillStyle = '#fff6cf'; ctx.beginPath(); ctx.arc(hx+s.aimX*.45*m, hy+s.aimY*.45*m, .035*m, 0, 7); ctx.fill(); }
    if (s.stuck>.6) { ctx.strokeStyle = 'rgba(255,120,90,.8)'; ctx.lineWidth = 2; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(x, y, radius(s)*scale+6, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }

  // Survey map: only what the diver has seen, plus lines and the diver.
  function drawMap(c, s, {whole=false, track=false, events=null}={}) {
    const g = c.getContext('2d'), w = c.width, h = c.height;
    const x0 = -14, x1 = 66, y0 = -8, y1 = Math.max(60, Math.min(285, s.stats.maxDepth+(whole ? 45 : 25)));
    const sc = Math.min(w/(x1-x0), h/(y1-y0)), ox = (w-(x1-x0)*sc)/2;
    const MX = x => ox+(x-x0)*sc, MY = y => (y-y0)*sc;
    g.fillStyle = '#0c1418'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#183038'; g.fillRect(0, 0, w, MY(GROUND));
    for (let cy=0; cy<cave.ch; cy++) for (let cx=0; cx<cave.cw; cx++) {
      const i = cy*cave.cw+cx; if (!cave.water[i] || !(whole || s.seen[i])) continue;
      const x = BOUNDS.x0+cx*CELL, y = BOUNDS.y0+cy*CELL; if (y>y1) continue;
      g.fillStyle = cave.skylit[i] ? '#2b7f8c' : '#1f5562'; g.fillRect(MX(x), MY(y), CELL*sc+.6, CELL*sc+.6);
    }
    g.lineWidth = 1.2;
    for (const ln of s.lines) { if (ln.pts.length<2 || ln.kind==='old' && !whole) continue;
      g.strokeStyle = ln.kind==='perm' ? '#e8eef0' : ln.kind==='old' ? '#a99d82' : '#ffb340'; g.beginPath(); ln.pts.forEach(([x,y],k)=>k ? g.lineTo(MX(x),MY(y)) : g.moveTo(MX(x),MY(y))); g.stroke(); }
    if (track && s.track.length>1) {
      const T = s.track.at(-1)[0] || 1;
      for (let k=1;k<s.track.length;k++) {
        const [t,x,y] = s.track[k], [,px,py] = s.track[k-1];
        g.strokeStyle = `hsl(${30+170*t/T},90%,62%)`; g.lineWidth = 2; g.beginPath(); g.moveTo(MX(px),MY(py)); g.lineTo(MX(x),MY(y)); g.stroke();
      }
    }
    g.font = '11px system-ui'; g.fillStyle = 'rgba(220,235,235,.7)'; g.textAlign = 'left';
    for (let d=0; d<=y1; d+=d<60 ? 20 : 40) { g.fillText(`${d} m`, 4, MY(d)+4); g.fillStyle = 'rgba(220,235,235,.15)'; g.fillRect(36, MY(d), w, 1); g.fillStyle = 'rgba(220,235,235,.7)'; }
    if (events) events.forEach((e,k)=>{ g.fillStyle = e.level==='danger' ? '#ff6b5b' : e.level==='good' ? '#6fdc9a' : '#f2c94c';
      g.beginPath(); g.arc(MX(e.x), MY(e.y), 7, 0, 7); g.fill(); g.fillStyle = '#081014'; g.font = '700 9px system-ui'; g.textAlign = 'center'; g.fillText(String(k+1), MX(e.x), MY(e.y)+3); });
    g.fillStyle = '#ffb347'; g.beginPath(); g.arc(MX(s.x), MY(s.y), 4, 0, 7); g.fill();
  }

  resize();
  return {draw, resize, warm, drawMap};
}
