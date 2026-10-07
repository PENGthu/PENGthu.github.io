const $ = (id) => document.getElementById(id);
const stage = $('stage');
let player, api, paused = false, muted = false, loading = false;
let resumeAfterGuide = false;
const held = new Map();
const keyCodes = {ArrowUp:38,ArrowLeft:37,ArrowDown:40,ArrowRight:39,a:65,s:83,d:68,f:70,g:71};

function status(text) { $('status').textContent = text; }
function releaseKeys() {
  for (const [key, entry] of held) {
    clearTimeout(entry.timer);
    sendKey('keyup', key);
    entry.button.classList.remove('held');
  }
  held.clear();
}
function sendKey(type, key) {
  player?.dispatchEvent(new KeyboardEvent(type, {key, code:key.startsWith('Arrow')?key:`Key${key.toUpperCase()}`,keyCode:keyCodes[key],which:keyCodes[key],bubbles:true,cancelable:true}));
}
function setPaused(value) {
  if (!api || loading) return;
  releaseKeys();
  paused = value;
  if (paused) api.suspend(); else api.resume();
  $('pause-screen').hidden = !paused;
  $('pause').textContent = paused ? '继续' : '暂停';
  status(paused ? '游戏已暂停' : '原版游戏');
  if (!paused) player.focus();
}
async function loadGame() {
  if (loading) return;
  loading = true;
  $('start').disabled = true;
  $('start').textContent = '正在加载原版…';
  $('load-note').textContent = '正在载入游戏和兼容运行环境，首次加载需要一些时间。';
  status('加载中…');
  try {
    if (!window.RufflePlayer?.newest) throw new Error('运行环境未加载，请检查网络后重试。');
    releaseKeys();
    player?.remove();
    player = window.RufflePlayer.newest().createPlayer();
    player.id = 'original-game';
    player.tabIndex = 0;
    player.setAttribute('aria-label','挖地小子原版游戏画面，方向键移动和挖掘，A S D F G 使用道具。');
    $('player-host').append(player);
    api = player.ruffle();
    await api.load({
      url:'./original/FSADIGBOY.swf?v=original-20261007-4',
      base:new URL('./original/',location.href).href,
      urlRewriteRules:[[ /FSADIGBOY_RES\.swf(?:\?.*)?$/, 'FSADIGBOY_RES.swf?v=pages-compat-1' ]],
    });
    api.volume = muted ? 0 : 1;
    paused = false;
    $('cover').hidden = true;
    $('pause-screen').hidden = true;
    $('pause').textContent = '暂停';
    for (const id of ['pause','sound','fullscreen','reload']) $(id).disabled = false;
    status('原版游戏');
    player.focus();
  } catch (error) {
    $('cover').hidden = false;
    $('start').textContent = '重试加载';
    $('load-note').textContent = `加载未完成：${error.message || '请检查网络后重试。'}`;
    status('加载未完成');
  } finally { loading = false; $('start').disabled = false; }
}
$('start').addEventListener('click',loadGame);
$('reload').addEventListener('click',loadGame);
$('pause').addEventListener('click',()=>setPaused(!paused));
$('resume').addEventListener('click',()=>setPaused(false));
$('sound').addEventListener('click',()=>{
  muted = !muted;
  api.volume = muted ? 0 : 1;
  $('sound').textContent = muted ? '声音：关' : '声音：开';
  $('sound').setAttribute('aria-pressed', String(muted));
  player.focus();
});
$('fullscreen').addEventListener('click',async()=>{
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.requestFullscreen();
  } catch { status('此浏览器不支持全屏'); }
  player.focus();
});
$('exit-fullscreen').addEventListener('click',async()=>{
  if (document.fullscreenElement) await document.exitFullscreen();
  player?.focus();
});
$('help').addEventListener('click',()=>{
  resumeAfterGuide = Boolean(api && !paused);
  if (resumeAfterGuide) setPaused(true);
  $('guide').showModal();
});
function closeGuide() { $('guide').close(); }
$('close-help').addEventListener('click',closeGuide);
$('guide-done').addEventListener('click',closeGuide);
$('guide').addEventListener('close',()=>{ if (resumeAfterGuide) setPaused(false); resumeAfterGuide = false; });
$('touch-toggle').addEventListener('click',()=>{
  releaseKeys();
  const show = $('touch-controls').hidden;
  $('touch-controls').hidden = !show;
  $('touch-toggle').textContent = show ? '收起触屏按键' : '显示触屏按键';
  $('touch-toggle').setAttribute('aria-expanded',String(show));
});
for (const button of document.querySelectorAll('[data-key]')) {
  const key = button.dataset.key;
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();
    if (!api || paused || loading || held.has(key)) return;
    player.focus();
    button.setPointerCapture(event.pointerId);
    button.classList.add('held');
    held.set(key,{button,time:performance.now(),timer:null});
    sendKey('keydown',key);
  });
  const release = () => {
    const entry = held.get(key);
    if (!entry || entry.timer) return;
    // A short touch lasts long enough to be sampled by the original frame loop.
    entry.timer = setTimeout(()=>{
      sendKey('keyup',key);
      button.classList.remove('held');
      held.delete(key);
    },Math.max(0,160-(performance.now()-entry.time)));
  };
  button.addEventListener('pointerup',release);
  button.addEventListener('pointercancel',release);
  button.addEventListener('lostpointercapture',release);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden) setPaused(true);});
window.addEventListener('blur',releaseKeys);
window.addEventListener('pagehide',releaseKeys);
// Prevent page scrolling while the player receives the original arrow controls.
document.addEventListener('keydown',event=>{
  if (keyCodes[event.key] && event.composedPath().includes(player)) event.preventDefault();
});
if (window.matchMedia('(pointer:coarse)').matches) $('touch-toggle').click();
