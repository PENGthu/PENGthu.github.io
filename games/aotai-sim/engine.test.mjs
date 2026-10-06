import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,getActions,weatherAt,validateSave,mean,weakest} from './engine.mjs';

test('same seed and actions reproduce the full decision outcome without mutating input',()=>{
  const input=createGame({seed:1234}),copy=structuredClone(input);
  const first=step(input,'steady'),second=step(input,'steady');
  assert.deepEqual(input,copy);assert.deepEqual(first,second);
  assert.equal(first.state.tick,1);assert.equal(first.state.turn,1);assert.ok(first.state.position>input.position);
});
test('retreat is a complete, safe outcome and a finished run accepts no more actions',()=>{
  let s=createGame();for(let i=0;i<6&&!s.outcome;i++)s=step(s,'retreat').state;
  assert.equal(s.outcome.kind,'retreated');assert.equal(s.position,0);assert.ok(s.outcome.score>80);
  assert.deepEqual(getActions(s),[]);assert.ok(step(s,'steady').error);
});
test('food and water are consumed only by an allowed full-team meal',()=>{
  const s=createGame();s.members.forEach(m=>m.energy=70);s.satiety=30;s.hydration=30;
  const next=step(s,'meal').state;
  assert.equal(next.food,s.food-3);assert.ok(Math.abs(next.water-(s.water-.6))<1e-9);
  assert.ok(next.satiety>s.satiety);assert.ok(next.hydration>s.hydration);assert.ok(mean(next,'energy')>mean(s,'energy'));
  const dry={...s,water:.2};assert.ok(step(dry,'meal').error);assert.deepEqual(step(dry,'meal').state,dry);
});
test('light equipment cannot create a camp or call from a communication blind spot',()=>{
  const s=createGame({pack:'light'});s.position=3;
  assert.ok(step(s,'camp').error);assert.ok(step(s,'sos').error);
  s.position=0;assert.equal(step(s,'sos').error,undefined);
});
test('camp protects against exposure and restores energy when supplied',()=>{
  const s=createGame({scenario:'winter'});s.position=4;s.tick=8;s.members.forEach(m=>{m.energy=60;m.warmth=65;});
  const camp=step(s,'camp').state;
  let exposed=structuredClone(s);for(let i=0;i<3&&!exposed.outcome;i++)exposed=step(exposed,'care').state;
  assert.ok(mean(camp,'energy')>mean(s,'energy'));
  // Compare loss per unit time because care takes twice as long as a normal tick.
  assert.ok((mean(s,'warmth')-mean(camp,'warmth'))/3<(mean(s,'warmth')-mean(exposed,'warmth'))/6);
});
test('earlier rescue request followed by waiting can finish in rescue',()=>{
  let s=step(createGame(),'sos').state;
  for(let i=0;i<20&&!s.outcome;i++)s=step(s,'wait').state;
  assert.equal(s.outcome.kind,'rescued');assert.ok(weakest(s,'warmth')>0);
});
test('the weakest teammate limits pace, and care repairs injury',()=>{
  const healthy=createGame(),tired=createGame();tired.members[2].energy=15;tired.members[2].injury=2;
  assert.ok(step(tired,'steady').state.position<step(healthy,'steady').state.position);
  assert.equal(step(tired,'care').state.members[2].injury,1);
});
test('an unresolved navigation event requires its own decision',()=>{
  const s=createGame();s.event={title:'test',body:'test'};
  assert.ok(step(s,'steady').error);assert.ok(getActions(s).every(a=>a.id.startsWith('event_')));
  assert.equal(step(s,'event_regroup').state.event,null);
});
test('snapshot rewind supports an exact replay and a different branch',()=>{
  const before=step(createGame(),'steady').state;
  const old=step(before,'fast');assert.deepEqual(step(structuredClone(before),'fast'),old);
  const alternate=step(structuredClone(before),'shelter');assert.notEqual(alternate.state.position,old.state.position);
  assert.equal(alternate.state.tick,old.state.tick);
  assert.equal(weatherAt(alternate.state).kind,weatherAt(old.state).kind);
});
test('weather changes with time, and winter is colder than autumn at the same node',()=>{
  const s=createGame();assert.notEqual(weatherAt(s,0).kind,weatherAt(s,12).kind);
  assert.ok(weatherAt(createGame({scenario:'winter'})).temp<weatherAt(s).temp);
});
test('repeated exposure terminates and resources stay finite and bounded',()=>{
  for(const scenario of ['autumn','winter','fog'])for(const pack of ['standard','light','heavy']) {
    let s=createGame({scenario,pack});
    for(let i=0;i<150&&!s.outcome;i++) {
      const actions=getActions(s);const a=actions.find(a=>a.id==='fast'&&!a.disabled)||actions.find(a=>a.id==='steady'&&!a.disabled)||actions.find(a=>a.id==='event_guess')||actions.find(a=>!a.disabled);
      s=step(s,a.id).state;assert.ok(validateSave(s));
      for(const m of s.members){assert.ok(m.energy>=0&&m.energy<=100);assert.ok(m.warmth>=0&&m.warmth<=100);}
      assert.ok(s.food>=0&&s.water>=0&&s.battery>=0);
    }
    assert.ok(s.outcome,`${scenario}/${pack} must reach a terminal state`);
  }
});
test('invalid save state is rejected',()=>{
  assert.ok(validateSave(createGame()));assert.ok(!validateSave(null));assert.ok(!validateSave({...createGame(),tick:NaN}));assert.ok(!validateSave({...createGame(),position:11}));
});
test('a measured supply and recovery strategy can finish every scenario',()=>{
  for(const scenario of ['autumn','winter','fog']) {
    let s=createGame({scenario});
    for(let i=0;i<120&&!s.outcome;i++) {
      let id=s.rescue?'wait':s.event?'event_wait':s.satiety<48||s.hydration<45?'meal':weakest(s,'energy')<45||weakest(s,'warmth')<40?'camp':'steady';
      if(getActions(s).find(a=>a.id===id)?.disabled)id='sos';
      const next=step(s,id);assert.equal(next.error,undefined);s=next.state;
    }
    assert.ok(['completed','rescued'].includes(s.outcome?.kind),`${scenario} should allow a supplied, measured strategy to reach safety`);
  }
});
