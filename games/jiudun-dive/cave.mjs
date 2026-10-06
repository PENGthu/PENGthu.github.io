// Cross-section of a cave inspired by public reports of the Jiudun skylight (Du'an, Guangxi).
// The geometry is invented for play, not a survey. Units are metres, y is depth (down).

export const GROUND = -6;                     // top of the land around the skylight
export const BOUNDS = {x0:-16, x1:68, y0:-10, y1:283};
export const RES = .25;                       // SDF grid spacing
export const CELL = .5;                       // silt / light / survey grid spacing
const FAR = 8;

// Water (and the air shaft above it) is the union of these shapes. `rough` is wall noise in metres.
const SHAPES = [
  {type:'poly', rough:.55, pts:[[-10.5,-8],[10,-8],[10.5,-2],[11.5,3],[13,9],[15,15],[17,21],[19,27],[21.5,33],[23,37.6],
    [25.5,38.2],[25.8,43],[21,43.8],[16,42.3],[11,38.8],[6,33.8],[2,28.2],[-2,22.4],[-5.5,16.4],[-8,10.5],[-9.5,7.4],
    [-6,6.9],[-5.4,5.7],[-6.5,5],[-10.6,4.8],[-10.9,0]]},
  {type:'capsule', a:[25,40.5], b:[44,42.3], ra:2, rb:1.8, rough:.28},              // flat passage
  {type:'capsule', a:[33,40], b:[38,35.6], ra:1, rb:1.25, rough:.2},               // side passage
  {type:'ellipse', c:[39.2,34.8], rx:2.3, ry:1.4, rough:.2},                       // dead-end room
  {type:'capsule', a:[44.5,42], b:[46.5,52], ra:1.8, rb:1.3, rough:.22},           // shaft head
  {type:'capsule', a:[46.5,52], b:[47.3,79], ra:1.3, rb:1.1, rough:.2},
  {type:'capsule', a:[47.3,79], b:[47.7,87], ra:.44, rb:.44, rough:.03},           // restriction
  {type:'capsule', a:[47.7,87], b:[49,119.5], ra:1, rb:1.2, rough:.18},
  {type:'ellipse', c:[50.5,122.5], rx:6.5, ry:4, rough:.35},                       // 120 m hall
  {type:'capsule', a:[52,125], b:[54.5,165], ra:1, rb:1.3, rough:.18},
  {type:'capsule', a:[54.5,165], b:[57.5,210], ra:1.3, rb:1.6, rough:.2},
  {type:'ellipse', c:[58.5,213], rx:3.5, ry:2.5, rough:.25},
  {type:'capsule', a:[58.5,214], b:[60,250], ra:1.1, rb:1.1, rough:.15},
  {type:'capsule', a:[60,250], b:[60.6,279], ra:.9, rb:.7, rough:.12}
];

// The permanent line, listed from the exit inwards. Arrows on it point to index 0.
export const PERMANENT_LINE = [[8.5,35.6],[14,39.8],[20,41.8],[25,40.8],[30,40.9],[36,41.4],[42,41.9],[45,43.6],
  [46.3,51],[46.9,65],[47.3,79],[47.5,83],[47.7,87],[48.2,100],[48.6,116],[50,124.5],[52.3,127],[54,155],[55,170],
  [57.5,209],[58.5,214.5]];
// A broken line someone left in the side passage. It leads nowhere.
export const OLD_LINE = [[34.6,38.7],[36.6,37],[38.4,35.9],[40.3,35.5]];

export const PLACES = [
  ['天窗水面',0,0],['5 米平台',-7,5],['水草坡',-1,14],['斜坡',12,27],['引导绳起点',8.5,35.6],['洞口',24,40.5],
  ['平洞',33,41.5],['旧线支洞',38,35.5],['竖井口',45.5,44],['竖井',47,64],['限制段',47.5,83],['竖井下段',48.2,102],
  ['120 米厅',50.5,122.5],['深井',54,150],['212 米平台',58.5,213],['无底井',60,250]
].map(([name,x,y])=>({name,x,y}));

export const SIGNS = [
  {x:21.2, y:35.6, text:'前方是洞穴。没有洞潜训练和装备，就在这里折返。'},
  {x:46.6, y:77.5, text:'下面变窄。侧挂瓶多了过不去。'}
];

// Silt available on floors and walls.
const SILT_ZONES = [
  {x0:0, x1:26, y0:30, y1:46, a:.45},
  {x0:24, x1:46, y0:39.5, y1:46, a:1},
  {x0:32, x1:43, y0:32, y1:41, a:1.4},
  {x0:43, x1:50, y0:44, y1:118, a:.3},
  {x0:43, x1:58, y0:118, y1:128, a:.9},
  {x0:50, x1:62, y0:128, y1:283, a:.4}
];

const fract = x => x-Math.floor(x);
export const hash2 = (x,y) => fract(Math.sin(x*127.1+y*311.7)*43758.5453);
function vnoise(x,y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x-ix, fy = y-iy;
  const u = fx*fx*(3-2*fx), v = fy*fy*(3-2*fy);
  const a = hash2(ix,iy), b = hash2(ix+1,iy), c = hash2(ix,iy+1), d = hash2(ix+1,iy+1);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
export const fbm = (x,y) => (vnoise(x/2.4,y/2.4)*.55+vnoise(x/.9+17,y/.9)*.3+vnoise(x/.37,y/.37+5)*.15)*2-1;

function sdPoly(px, py, pts) {
  let d = Infinity, s = 1;
  for (let i=0, j=pts.length-1; i<pts.length; j=i++) {
    const [vix,viy] = pts[i], [vjx,vjy] = pts[j];
    const ex = vjx-vix, ey = vjy-viy, wx = px-vix, wy = py-viy;
    const t = Math.min(1, Math.max(0, (wx*ex+wy*ey)/(ex*ex+ey*ey)));
    const bx = wx-ex*t, by = wy-ey*t;
    d = Math.min(d, bx*bx+by*by);
    const c1 = py>=viy, c2 = py<vjy, c3 = ex*wy>ey*wx;
    if ((c1&&c2&&c3) || (!c1&&!c2&&!c3)) s = -s;
  }
  return s*Math.sqrt(d);
}
function sdShape(sh, x, y) {
  if (sh.type==='poly') return sdPoly(x, y, sh.pts);
  if (sh.type==='ellipse') {
    const px = (x-sh.c[0])/sh.rx, py = (y-sh.c[1])/sh.ry;
    const k0 = Math.hypot(px,py), k1 = Math.hypot(px/sh.rx, py/sh.ry);
    return k1 ? k0*(k0-1)/k1 : -Math.min(sh.rx,sh.ry);
  }
  const [ax,ay] = sh.a, [bx,by] = sh.b, ex = bx-ax, ey = by-ay;
  const t = Math.min(1, Math.max(0, ((x-ax)*ex+(y-ay)*ey)/(ex*ex+ey*ey)));
  return Math.hypot(x-ax-ex*t, y-ay-ey*t) - (sh.ra+(sh.rb-sh.ra)*t);
}
function bbox(sh) {
  const xs = [], ys = [];
  if (sh.type==='poly') sh.pts.forEach(([x,y])=>{ xs.push(x); ys.push(y); });
  else if (sh.type==='ellipse') { xs.push(sh.c[0]-sh.rx, sh.c[0]+sh.rx); ys.push(sh.c[1]-sh.ry, sh.c[1]+sh.ry); }
  else { const r = Math.max(sh.ra,sh.rb); xs.push(sh.a[0]-r, sh.b[0]-r, sh.a[0]+r, sh.b[0]+r); ys.push(sh.a[1]-r, sh.b[1]-r, sh.a[1]+r, sh.b[1]+r); }
  return {x0:Math.min(...xs)-FAR, x1:Math.max(...xs)+FAR, y0:Math.min(...ys)-FAR, y1:Math.max(...ys)+FAR};
}

// Analytic distance to rock (negative in water), with noisy walls. Slow; the grid caches it.
export function exactSdf(x, y) {
  let d = FAR;
  const n = fbm(x, y);
  for (const sh of SHAPES) {
    const b = sh.box ??= bbox(sh);
    if (x<b.x0 || x>b.x1 || y<b.y0 || y>b.y1) continue;
    d = Math.min(d, sdShape(sh, x, y) + sh.rough*n);
  }
  return Math.min(FAR, d);
}

export class Cave {
  constructor() {
    const {x0,x1,y0,y1} = BOUNDS;
    this.gw = Math.round((x1-x0)/RES)+1; this.gh = Math.round((y1-y0)/RES)+1;
    this.grid = new Float32Array(this.gw*this.gh);
    for (let j=0;j<this.gh;j++) for (let i=0;i<this.gw;i++) this.grid[j*this.gw+i] = exactSdf(x0+i*RES, y0+j*RES);

    this.cw = Math.ceil((x1-x0)/CELL); this.ch = Math.ceil((y1-y0)/CELL); this.cells = this.cw*this.ch;
    this.water = new Uint8Array(this.cells);
    this.siltCap = new Float32Array(this.cells);
    this.ambient = new Float32Array(this.cells);
    this.skylit = new Uint8Array(this.cells);
    const center = i => [x0+(i%this.cw+.5)*CELL, y0+(Math.floor(i/this.cw)+.5)*CELL];
    for (let i=0;i<this.cells;i++) { const [x,y] = center(i); this.water[i] = this.sdf(x,y)<0 && y>0 ? 1 : 0; }

    // Open water: some of the skylight opening is in direct view. Daylight fades with depth.
    const opening = Array.from({length:9}, (_,k)=>[-9+k*2.25, -.2]);
    for (let i=0;i<this.cells;i++) {
      const [x,y] = center(i);
      if (y<0) { this.ambient[i] = 1; continue; }
      if (!this.water[i]) continue;
      const seen = opening.filter(([ox,oy])=>this.clear(x,y,ox,oy,0)>=1).length;
      this.skylit[i] = seen ? 1 : 0;
      this.ambient[i] = .95*Math.exp(-y/20)*Math.min(1, .35+seen/9);
    }
    // Light spills a few metres past overhangs, and onto the walls.
    const tmp = new Float32Array(this.cells);
    for (let pass=0; pass<7; pass++) {
      tmp.set(this.ambient);
      for (let cy=1; cy<this.ch-1; cy++) for (let cx=1; cx<this.cw-1; cx++) {
        const i = cy*this.cw+cx;
        const n = Math.max(tmp[i-1], tmp[i+1], tmp[i-this.cw], tmp[i+this.cw]);
        this.ambient[i] = Math.max(tmp[i], n*(this.water[i] ? .8 : .7)*(this.skylit[i] || !this.water[i] ? 1 : .9));
      }
    }
    // Silt sits where water touches rock inside a silt zone, thickest on floors.
    for (let i=0;i<this.cells;i++) {
      if (!this.water[i]) continue;
      const [x,y] = center(i), z = SILT_ZONES.find(z=>x>=z.x0 && x<=z.x1 && y>=z.y0 && y<=z.y1);
      if (!z) continue;
      const below = !this.water[i+this.cw], side = !this.water[i-1] || !this.water[i+1] || !this.water[i-this.cw];
      this.siltCap[i] = below ? z.a : side ? z.a*.35 : 0;
    }
  }

  sdf(x, y) {
    const fx = (x-BOUNDS.x0)/RES, fy = (y-BOUNDS.y0)/RES;
    if (fx<0 || fy<0 || fx>=this.gw-1 || fy>=this.gh-1) return FAR;
    const i = Math.floor(fx), j = Math.floor(fy), u = fx-i, v = fy-j, k = j*this.gw+i, g = this.grid;
    return (g[k]*(1-u)+g[k+1]*u)*(1-v) + (g[k+this.gw]*(1-u)+g[k+this.gw+1]*u)*v;
  }
  // Exact distance for the diver's body; the grid is too coarse inside narrow passages.
  body(x, y) { return y < BOUNDS.y0 || y > BOUNDS.y1 ? FAR : exactSdf(x, y); }
  bodyNormal(x, y) {
    const e = .05, nx = exactSdf(x+e,y)-exactSdf(x-e,y), ny = exactSdf(x,y+e)-exactSdf(x,y-e), l = Math.hypot(nx,ny) || 1;
    return [nx/l, ny/l];
  }
  normal(x, y) {
    const e = .12, nx = this.sdf(x+e,y)-this.sdf(x-e,y), ny = this.sdf(x,y+e)-this.sdf(x,y-e), l = Math.hypot(nx,ny) || 1;
    return [nx/l, ny/l];
  }
  // Fraction of the segment that is clear of rock (1 = fully clear).
  clear(x0, y0, x1, y1, margin=.04) {
    const len = Math.hypot(x1-x0, y1-y0);
    if (len < 1e-6) return 1;
    for (let t=0; t<len;) {
      const s = this.sdf(x0+(x1-x0)*t/len, y0+(y1-y0)*t/len);
      if (s > -margin) return t/len;
      t += Math.max(.04, -s-margin*.5);
    }
    return 1;
  }
  cellAt(x, y) {
    const cx = Math.floor((x-BOUNDS.x0)/CELL), cy = Math.floor((y-BOUNDS.y0)/CELL);
    return cx<0 || cy<0 || cx>=this.cw || cy>=this.ch ? -1 : cy*this.cw+cx;
  }
  placeName(x, y) {
    let best = PLACES[0], bd = Infinity;
    for (const p of PLACES) { const d = Math.hypot(p.x-x, p.y-y); if (d<bd) { bd = d; best = p; } }
    return best.name;
  }
  overhead(x, y) { const i = this.cellAt(x,y); return i>=0 && y>1 && !this.skylit[i]; }
}

// Nearest point on a polyline: distance along it, the point, the gap and the segment.
export function nearestOnLine(pts, x, y) {
  let best = {dist:Infinity, s:0, x:pts[0][0], y:pts[0][1], seg:0}, acc = 0;
  for (let i=0;i<pts.length-1;i++) {
    const [ax,ay] = pts[i], [bx,by] = pts[i+1], ex = bx-ax, ey = by-ay, l2 = ex*ex+ey*ey, l = Math.sqrt(l2);
    const t = l2 ? Math.min(1, Math.max(0, ((x-ax)*ex+(y-ay)*ey)/l2)) : 0;
    const px = ax+ex*t, py = ay+ey*t, dist = Math.hypot(x-px, y-py);
    if (dist < best.dist) best = {dist, s:acc+l*t, x:px, y:py, seg:i};
    acc += l;
  }
  return best;
}
export const lineLength = pts => pts.reduce((a,p,i)=>i ? a+Math.hypot(p[0]-pts[i-1][0], p[1]-pts[i-1][1]) : 0, 0);
export function pointAt(pts, s) {
  for (let i=0;i<pts.length-1;i++) {
    const [ax,ay] = pts[i], [bx,by] = pts[i+1], l = Math.hypot(bx-ax, by-ay);
    if (s <= l || i===pts.length-2) { const t = l ? Math.min(1, Math.max(0, s/l)) : 0; return {x:ax+(bx-ax)*t, y:ay+(by-ay)*t, tx:(bx-ax)/(l||1), ty:(by-ay)/(l||1)}; }
    s -= l;
  }
}
