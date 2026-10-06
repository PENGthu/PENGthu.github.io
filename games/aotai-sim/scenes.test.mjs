import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {createGame} from './engine.mjs';
import {EVENTS,NODES} from './data.mjs';
import {BACKDROPS,CHARACTERS,EVENT_SCENES,NODE_SCENES,sceneFor,dialogueFor,replyFor} from './scenes.mjs';
import {PROP_IDS,propArt} from './scene-props.mjs';
import {theatreMarkup} from './cinema.mjs';
test('every authored event and location has a concrete scene, lines and observations',()=>{
 assert.deepEqual(Object.keys(EVENT_SCENES).sort(),Object.keys(EVENTS).sort());
 assert.deepEqual(Object.keys(NODE_SCENES).sort(),NODES.map(n=>n.id).sort());
 for(const scene of [...Object.values(EVENT_SCENES),...Object.values(NODE_SCENES)]){
  assert.ok(BACKDROPS[scene.background]);assert.ok(!scene.actor||CHARACTERS[scene.actor]);assert.ok(!scene.prop||PROP_IDS.includes(scene.prop));
  assert.ok(scene.dialogue.length>=2);assert.ok(scene.observations.length>=2);
  for(const line of scene.dialogue)assert.ok(line.speaker&&line.text.length>8);
 }
 for(const [id,event] of Object.entries(EVENTS))if(EVENT_SCENES[id].actor)for(const choice of event.choices)assert.ok(EVENT_SCENES[id].replies[choice.id],`${id}.${choice.id} needs a spoken reply`);
});
test('all scenery and character paths resolve to shipped assets',async()=>{
 for(const file of [...Object.values(BACKDROPS),...Object.values(CHARACTERS).map(a=>a.image)])await access(new URL(file,import.meta.url));
});
test('reading and previewing scenes leaves state and inventory unchanged',()=>{
 const state=createGame(),before=structuredClone(state),scene=sceneFor(state);
 for(let i=-1;i<10;i++)assert.ok(dialogueFor(scene,i).text);
 const reply=replyFor(state,{id:'choice:record'});assert.match(reply,/联系方式/);
 assert.match(theatreMarkup(scene,0,reply,new Set([0])),/尚未确认/);
 assert.deepEqual(state,before);
 scene.dialogue[0].text='changed';assert.notEqual(sceneFor(state).dialogue[0].text,'changed');
});
test('failed and rescued hiker states never show an active waiting hiker',()=>{
 const state=createGame();state.node='hollow';state.event='hiker';state.quest={status:'failed'};
 const failed=sceneFor(state);assert.equal(failed.actor,'');assert.match(failed.dialogue.map(l=>l.text).join(''),/窗口/);assert.equal(replyFor(state,{id:'choice:unknown'}),'');
 state.event=null;state.quest.status='rescued';const rescued=sceneFor(state);assert.equal(rescued.actor,'');assert.match(rescued.dialogue.map(l=>l.text).join(''),/获救/);
});
test('escort, rescue and equipment conditions are reflected without inventing an outcome',()=>{
 const s=createGame();s.node='camp';delete s.inventory.tent;assert.notEqual(sceneFor(s).background,'camp');
 s.returning=true;s.flags.escort=true;assert.equal(sceneFor(s).actor,'luning');
 s.returning=false;s.rescue={remaining:7.2};assert.match(sceneFor(s).dialogue[0].text,/8 个游戏小时/);
 s.node='hut';s.event=null;s.rescue=null;s.quest={status:'reported'};assert.doesNotMatch(sceneFor(s).dialogue[0].text,/已经等到了救援/);
 s.quest.status='rescued';assert.match(sceneFor(s).dialogue[0].text,/已经等到了救援/);
});
test('scene illustrations contain no repeated HTML identifiers',()=>{
 for(const id of PROP_IDS)assert.doesNotMatch(propArt(id),/\bid=/);
});
