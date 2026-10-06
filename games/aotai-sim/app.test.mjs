// This verifies module bootstrap against a DOM substitute, not a real browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
const source=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
test('every direct DOM reference exists exactly once in HTML',()=>{
  assert.equal(new Set(ids).size,ids.length,'duplicate HTML IDs');
  for(const [,id] of source.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(id),`missing ${id}`);
});
test('the page bootstraps with a valid cart and rejects malformed stored data',async()=>{
  const elements=new Map(ids.map(id=>[id,{id,innerHTML:'',textContent:'',className:'',hidden:false,disabled:false,open:false,value:id==='seed-input'?'261006':'',style:{},
    addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},scrollIntoView(){},focus(){}}]));
  globalThis.document={getElementById(id){assert.ok(elements.has(id),`unknown DOM ID ${id}`);return elements.get(id);},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}};
  globalThis.localStorage={getItem(){return '{broken JSON';},setItem(){}};
  await import('./app.mjs?bootstrap-test');
  assert.ok(elements.get('home-dialog').open);
  assert.equal(elements.get('setup-dialog').open,false);
  assert.equal(elements.get('start-button').disabled,false);
  assert.equal(elements.get('close-setup').hidden,false);
  assert.equal(elements.get('resume-panel').hidden,true);
  assert.match(elements.get('cart-money').textContent,/821/);
  assert.match(elements.get('story-title').textContent,/寻人/);
  assert.match(elements.get('choices').innerHTML,/记住名字/);
  assert.match(elements.get('shop-items').innerHTML,/防水外套/);
  assert.match(elements.get('stats').innerHTML,/aria-valuenow/);
  assert.equal(elements.get('commit-button').disabled,true);
  assert.equal(elements.get('prep-story').hidden,false);
  assert.equal(elements.get('prep-equipment').hidden,true);
  assert.equal(elements.get('start-button').hidden,true);
  delete globalThis.document;delete globalThis.localStorage;
});
test('small-window preparation and navigation preserve every item and the game clock',async()=>{
  const elements=new Map(ids.map(id=>[id,{id,innerHTML:'',textContent:'',className:'',hidden:false,disabled:false,open:false,value:id==='seed-input'?'261006':'',style:{},events:{},
    addEventListener(name,fn){this.events[name]=fn;},showModal(){this.open=true;},close(){this.open=false;},focus(){}}]));
  const events={};globalThis.innerWidth=375;globalThis.innerHeight=568;
  globalThis.document={getElementById(id){assert.ok(elements.has(id),`unknown ${id}`);return elements.get(id);},addEventListener(name,fn){events[name]=fn;},querySelector(){return null;},querySelectorAll(){return [];}};
  globalThis.localStorage={getItem(){return null;},setItem(){}};
  await import('./app.mjs?compact-flow-test');
  const click=dataset=>events.click({target:{closest(){return {disabled:false,dataset};}}});
  elements.get('home-start').events.click();
  assert.equal(elements.get('home-dialog').open,false);
  assert.equal(elements.get('setup-dialog').open,true);
  assert.equal((elements.get('scenario-options').innerHTML.match(/data-scenario=/g)||[]).length,1);
  elements.get('prep-next').events.click();assert.equal(elements.get('prep-backpack').hidden,false);
  assert.match(elements.get('backpack-options').innerHTML,/远行背包/,'default selected backpack stays visible');
  elements.get('prep-next').events.click();assert.equal(elements.get('prep-equipment').hidden,false);assert.equal(elements.get('start-button').hidden,false);
  click({category:'supplies'});
  const seen=new Set();
  for(let page=0;page<5;page++){
    click({page:'shop',index:String(page)});
    for(const [,id] of elements.get('shop-items').innerHTML.matchAll(/data-item="([^"]+)"/g))seen.add(id);
  }
  assert.equal(seen.size,10,'all supply items remain reachable');
  assert.match(elements.get('cart-money').textContent,/821/,'navigation does not buy or discard anything');
  elements.get('start-button').events.click();assert.equal(elements.get('setup-dialog').open,false);
  const before=elements.get('clock').textContent;
  click({page:'choices',index:'1'});assert.match(elements.get('choices').innerHTML,/按自己的计划出发/);
  click({main:'choice:leave'});assert.equal(elements.get('commit-button').disabled,false);
  assert.equal(elements.get('clock').textContent,before,'paging and selecting do not advance time');
  elements.get('commit-button').events.click();assert.notEqual(elements.get('clock').textContent,before);
  assert.equal(elements.get('feedback-button').disabled,false);
  elements.get('journal-button').events.click();assert.equal(elements.get('journal-dialog').open,true,'review opens in its own view');
  assert.match(elements.get('journal').innerHTML,/按自己的计划出发/);
  delete globalThis.document;delete globalThis.localStorage;delete globalThis.innerWidth;delete globalThis.innerHeight;
});
