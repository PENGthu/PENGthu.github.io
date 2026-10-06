import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,getActions} from './engine.mjs';
import {EVENTS,ITEMS,NODES} from './data.mjs';
import {BACKDROPS,CHARACTERS} from './scenes.mjs';
import {PROP_IDS} from './scene-props.mjs';
import {CHOICE_SCENES,TRAVEL_DETAILS,UTILITY_SCENES,ITEM_SCENES,optionSceneFor} from './choice-scenes.mjs';
import {optionCardMarkup,theatreMarkup} from './cinema.mjs';

const validScene=scene=>{
 assert.ok(scene.title&&scene.summary.length>12);assert.equal(scene.dialogue.length,3);
 assert.equal(new Set(scene.dialogue.map(l=>l.text)).size,3);
 assert.ok(BACKDROPS[scene.background]);assert.ok(!scene.actor||CHARACTERS[scene.actor]);
 assert.ok(!scene.prop||PROP_IDS.includes(scene.prop)||scene.prop.startsWith('gear:')&&ITEMS[scene.prop.slice(5)]);
};
test('all 74 event options have distinct authored scenes instead of effect descriptions',()=>{
 assert.deepEqual(Object.keys(CHOICE_SCENES).sort(),Object.keys(EVENTS).sort());
 let count=0;
 for(const [eventId,event] of Object.entries(EVENTS)){
  assert.deepEqual(Object.keys(CHOICE_SCENES[eventId]).sort(),event.choices.map(c=>c.id).sort());
  const state=createGame();state.event=eventId;
  const scenes=event.choices.map(choice=>optionSceneFor(state,getActions(state).find(a=>a.id===`choice:${choice.id}`)));
  assert.equal(new Set(scenes.map(s=>s.summary)).size,scenes.length,`${eventId}: distinct actions`);
  assert.equal(new Set(scenes.map(s=>s.title)).size,scenes.length);
  for(let i=0;i<scenes.length;i++){
   validScene(scenes[i]);assert.notEqual(scenes[i].summary,event.choices[i].desc);
   assert.match(optionCardMarkup(getActions(state).find(a=>a.id===scenes[i].actionId),scenes[i],i+1),/choice-situation/);
   count++;
  }
 }
 assert.equal(count,74);
});
test('each location and travel pace has terrain context and names its actual target',()=>{
 assert.deepEqual(Object.keys(TRAVEL_DETAILS).sort(),NODES.map(n=>n.id).sort());
 for(const node of NODES){
  const state=createGame();state.node=node.id;state.event=null;
  const moves=getActions(state).filter(a=>a.kind==='travel');
  for(const action of moves){const scene=optionSceneFor(state,action);validScene(scene);assert.match(scene.summary,new RegExp(NODES.find(n=>n.id===action.target).name));}
  assert.equal(new Set(moves.map(a=>optionSceneFor(state,a).summary)).size,moves.length);
 }
 const returning=createGame();returning.node='camp';returning.event=null;returning.path=['foot','forest','camp'];returning.returning=true;
 assert.match(optionSceneFor(returning,getActions(returning)[0]).summary,/来路.*密林坡/);
});
test('utilities, consumables and every equipment drop have authored previews',()=>{
 assert.deepEqual(Object.keys(ITEM_SCENES).sort(),Object.entries(ITEMS).filter(([,i])=>i.usable).map(([id])=>id).sort());
 for(const node of NODES){
  const state=createGame();state.node=node.id;state.event=null;state.inventory=Object.fromEntries(Object.keys(ITEMS).map(id=>[id,1]));state.quest={status:'waiting'};
  for(const action of getActions(state))validScene(optionSceneFor(state,action));
 }
 assert.equal(Object.keys(UTILITY_SCENES).length,10);
 const state=createGame();state.rescue={remaining:7.2};
 const wait=optionSceneFor(state,getActions(state).find(a=>a.id==='wait'));validScene(wait);assert.match(wait.dialogue[2].text,/8 个游戏小时/);
});
test('switching, reading and observing intentions never changes state, inventory or time',()=>{
 const state=createGame(),before=structuredClone(state);
 for(const action of getActions(state)){
  const scene=optionSceneFor(state,action);
  for(let i=0;i<3;i++)assert.match(theatreMarkup(scene,i,true,new Set([0])),/尚未执行/);
  scene.dialogue[0].text='mutated preview';assert.notEqual(optionSceneFor(state,action).dialogue[0].text,'mutated preview');
 }
 assert.deepEqual(state,before);
});
test('unavailable options remain readable and expired hiker report invents no living NPC',()=>{
 const state=createGame();state.event='hiker';state.node='hollow';state.quest={status:'failed'};
 for(const action of getActions(state).filter(a=>a.kind==='choice')){
  const scene=optionSceneFor(state,action);assert.equal(scene.actor,'');
  if(action.disabled){assert.equal(scene.blocked,action.disabled);assert.doesNotMatch(optionCardMarkup(action,scene,1),/\sdisabled[\s=>]/);assert.match(scene.summary,/等待窗口已经错过/);assert.match(scene.dialogue[1].text,/现在无法执行/);}
  if(action.id==='choice:report')assert.match(scene.summary,/错过的等待窗口/);
 }
});
