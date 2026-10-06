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
  globalThis.document={getElementById(id){assert.ok(elements.has(id),`unknown DOM ID ${id}`);return elements.get(id);},addEventListener(){},querySelector(){return null;}};
  globalThis.localStorage={getItem(){return '{broken JSON';},setItem(){}};
  await import('./app.mjs?bootstrap-test');
  assert.ok(elements.get('setup-dialog').open);
  assert.equal(elements.get('start-button').disabled,false);
  assert.equal(elements.get('close-setup').hidden,true);
  assert.equal(elements.get('resume-panel').hidden,true);
  assert.match(elements.get('cart-money').textContent,/821/);
  assert.match(elements.get('story-title').textContent,/寻人/);
  assert.match(elements.get('choices').innerHTML,/记住名字/);
  assert.match(elements.get('shop-items').innerHTML,/防水外套/);
  assert.match(elements.get('stats').innerHTML,/aria-valuenow/);
  assert.equal(elements.get('commit-button').disabled,true);
  delete globalThis.document;delete globalThis.localStorage;
});
