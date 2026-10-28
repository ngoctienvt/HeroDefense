import {describe,expect,it} from 'vitest';
import {deployed,enemy,game,summon} from './fixtures.js';
import {resolveTier3Ability} from '../src/tier3-combat.js';
import {effectiveUnitAttack} from '../src/stats.js';
describe('Triệu Công Minh authoritative mixed target contract',()=>{
  it('hits only the actual forward 8×2 line and appends exact same-owner deployed shield recipients',()=>{
    const state=game(),caster=deployed(state,'h03S');caster.x=caster.z=0;
    const ally=deployed(state,'h00J',1),ranged=deployed(state,'h00L',2),outside=deployed(state,'h007',3),foreign=deployed(state,'h008',0,'p2');
    const reserve=summon(state,'h00O');
    for(const unit of [ally,ranged,outside,foreign,reserve]) {unit.x=2;unit.z=0;unit.shield=0;}
    outside.x=8.01;
    const edge=enemy(state,caster,{x:8,z:1}),near=enemy(state,caster,{x:1,z:-1});
    const beyond=enemy(state,caster,{x:8.01,z:0}),wide=enemy(state,caster,{x:4,z:1.01}),behind=enemy(state,caster,{x:-.01,z:0});
    const hits:string[]=[];resolveTier3Ability(state,caster,{x:8,z:0},target=>{hits.push(target.id);});
    expect(hits).toEqual([edge.id,near.id]);for(const target of [edge,near])expect(target.attackWeak).toEqual({remaining:4,strength:.3});
    for(const target of [beyond,wide,behind])expect(target.attackWeak).toBeUndefined();
    expect(ally.shield).toBe(effectiveUnitAttack(caster)*2.6+ally.maxHp*.15);expect(ally.tierShield).toBeUndefined();
    expect(caster.shield).toBe(effectiveUnitAttack(caster)*2.6+caster.maxHp*.15);
    for(const unit of [ranged,outside,foreign,reserve])expect(unit.shield).toBe(0);
    const event=state.events.at(-1);expect(event).toMatchObject({skillId:'tier3-tier4-h03S',direction:{x:1,z:0},targets:[edge.id,near.id,caster.id,ally.id]});
    expect(event).not.toHaveProperty('supportTargets');expect(event).not.toHaveProperty('remaining');expect(event).not.toHaveProperty('gold');
  });
  it('keeps stronger plain shield, has no guard timer, and does not invent a reward flag for the boss bonus',()=>{
    const state=game(),caster=deployed(state,'h03S'),ally=deployed(state,'h00J',1);
    caster.x=caster.z=0;ally.x=2;ally.z=0;ally.shield=999999;
    const boss=enemy(state,caster,{x:3,z:0,kind:'boss'}),gold=state.players[caster.owner].gold;
    resolveTier3Ability(state,caster,{x:8,z:0},()=>{});
    expect(ally.shield).toBe(999999);expect(ally.tierShield).toBeUndefined();expect(state.players[caster.owner].gold).toBe(gold+25);
    const event=state.events.at(-1);expect(event?.targets).toEqual([boss.id,caster.id,ally.id]);
    expect(event).not.toHaveProperty('reward');expect(event).not.toHaveProperty('goldReward');expect(event).not.toHaveProperty('duration');
  });
});
