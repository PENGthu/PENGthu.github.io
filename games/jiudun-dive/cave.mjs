// Schematic profile of the Jiudun system, inspired by public reports. Not a survey.
// x: horizontal metres from the skylight centre, d: depth in metres, w: passage width.
// `cave` marks points inside the overhead environment.
export const POINTS = [
  {x:0, d:0, w:24, label:'天窗水面'},
  {x:3, d:10, w:22},
  {x:8, d:24, w:16, label:'引导绳起点'},
  {x:14, d:38, w:9},
  {x:17, d:40, w:6, cave:true, label:'洞口 · 40 m'},
  {x:36, d:42, w:4.5, cave:true, label:'平洞'},
  {x:40, d:50, w:2.4, cave:true, label:'竖井入口'},
  {x:41, d:85, w:1.3, cave:true, label:'限制段'},
  {x:42, d:120, w:1.7, cave:true, label:'120 m'},
  {x:47, d:160, w:4, cave:true},
  {x:52, d:212, w:5, cave:true, label:'212 m'},
  {x:55, d:250, w:3, cave:true},
  {x:57, d:277, w:2, cave:true, label:'277 m · 引导绳终点'}
];

// Cumulative distance along the line at each point.
export const STATIONS = POINTS.reduce((acc,p,i)=>{
  acc.push(i?acc[i-1]+Math.hypot(p.x-POINTS[i-1].x,p.d-POINTS[i-1].d):0);
  return acc;
},[]);
export const LINE_LENGTH = STATIONS.at(-1);

// Interpolated point on the line. `overhead` is true once both ends of the segment are in the cave.
export function caveAt(pos) {
  pos = Math.min(LINE_LENGTH, Math.max(0, pos));
  let i = 0;
  while (i < POINTS.length-2 && STATIONS[i+1] < pos) i++;
  const a = POINTS[i], b = POINTS[i+1], f = (pos-STATIONS[i])/(STATIONS[i+1]-STATIONS[i]);
  const len = STATIONS[i+1]-STATIONS[i];
  return {
    x:a.x+(b.x-a.x)*f, d:a.d+(b.d-a.d)*f, w:a.w+(b.w-a.w)*f,
    overhead:Boolean(a.cave&&b.cave) || Boolean(b.cave&&f>.5),
    dirX:(b.x-a.x)/len, dirD:(b.d-a.d)/len, segment:i
  };
}

// Distance along the line from the cave mouth, 0 outside the cave.
export const MOUTH = STATIONS[POINTS.findIndex(p=>p.cave)];
export const penetration = pos => Math.max(0, pos-MOUTH);
