import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutFor,pageSlice} from './ui.mjs';

test('desktop, laptop and short phone windows use bounded page sizes',()=>{
  assert.equal(layoutFor(1920,1080).choices,4);
  assert.equal(layoutFor(1366,768).choices,2);
  assert.equal(layoutFor(375,568).scenarios,1);
  assert.equal(layoutFor(667,375).shop,2);
  assert.equal(layoutFor(667,375).utilities,4);
});
test('every option and item is reachable exactly once across pages',()=>{
  const items=Array.from({length:25},(_,i)=>i);
  for(const size of [1,2,4,6]){
    const first=pageSlice(items,0,size),all=[];
    for(let p=0;p<first.total;p++)all.push(...pageSlice(items,p,size).items);
    assert.deepEqual(all,items);
  }
  assert.deepEqual(pageSlice(['a','b','c','d','e'],2,2).items,['e']);
});
test('empty collections, changed windows and stale page indices remain navigable',()=>{
  assert.deepEqual(pageSlice([],99,4),{items:[],page:0,total:1,start:0,count:0});
  const items=[1,2,3,4,5];assert.equal(pageSlice(items,99,4).page,1);
  assert.deepEqual(pageSlice(items,-2,2).items,[1,2]);
  assert.deepEqual(pageSlice(items,2,4).items,[5]);
  assert.deepEqual(items,[1,2,3,4,5]);
});
