import { describe, expect, it } from 'vitest';
import { TRUONG_DAO_LANG as B } from '../../../content/truong-dao-lang-design.js';
import { CONTROL_CHANCE, controlChance, rollHardControl, tryHardControl } from '../src/crowd-control.js';
import { applyEnemyStatus } from '../src/combat-status.js';
import { castAbility, combatStep } from '../src/combat.js';
import { deployed, enemy, forceControl, game } from './fixtures.js';

describe('hard crowd control by hero tier', () => {
  it('scales from Linh to Thần with a 20% minion and 5% boss ceiling', () => {
    expect([1, 2, 3, 4, 5, 6].map(tier => controlChance(tier, false))).toEqual([...CONTROL_CHANCE.minion]);
    expect([1, 2, 3, 4, 5, 6].map(tier => controlChance(tier, true))).toEqual([...CONTROL_CHANCE.boss]);
    expect(Math.max(...CONTROL_CHANCE.minion)).toBe(.2);
    expect(Math.max(...CONTROL_CHANCE.boss)).toBe(.05);
    expect(controlChance(0, false)).toBe(0);
  });

  it('lands near the table rate over many rolls and never shifts the combat RNG', () => {
    const state = game(), caster = deployed(state, 'h01K');
    forceControl(state, undefined);
    const minion = enemy(state, caster), boss = enemy(state, caster, { kind: 'boss' });
    const seed = state.seed;
    let minionHits = 0, bossHits = 0;
    for (let i = 0; i < 4000; i++) {
      if (rollHardControl(state, caster, minion)) minionHits++;
      if (rollHardControl(state, caster, boss)) bossHits++;
    }
    expect(minionHits / 4000).toBeGreaterThan(.17);
    expect(minionHits / 4000).toBeLessThan(.23);
    expect(bossHits / 4000).toBeGreaterThan(.035);
    expect(bossHits / 4000).toBeLessThan(.065);
    expect(state.seed).toBe(seed);
    expect(state.controlStats?.h01K.rolls).toBe(8000);
  });

  it('applies nothing on a failed roll and the full duration on success', () => {
    const state = game(), caster = deployed(state, 'h00P'), target = enemy(state, caster);
    forceControl(state, 0);
    expect(tryHardControl(state, caster, target, ['stun', 'frozen'], 2)).toBe(false);
    expect(target.stun ?? 0).toBe(0);
    forceControl(state, 1);
    expect(tryHardControl(state, caster, target, ['stun', 'frozen'], 2)).toBe(true);
    expect(target).toMatchObject({ stun: 2, frozen: 2 });
  });

  it('refuses hard control through the always-landing status helper', () => {
    const state = game(), caster = deployed(state, 'h00P'), target = enemy(state, caster);
    expect(() => applyEnemyStatus(target, caster, 0, 'stun', 1, 1)).toThrow();
    applyEnemyStatus(target, caster, 0, 'slow', 1, .3);
    expect(target.slowStrength).toBe(.3);
  });

  it('rolls once per enemy for a ground zone, not every tick', () => {
    const state = game(), caster = deployed(state, B.id);
    state.phase = 'combat'; caster.cooldown = 100;
    forceControl(state, 0);
    const center = enemy(state, caster, { hp: 100000, maxHp: 100000, attack: 0, speed: 0 });
    expect(castAbility(state, caster, center.id)).toBe(true);
    for (let i = 0; i < 20; i++) combatStep(state, .1);
    expect(center.frozen ?? 0).toBe(0);
    expect(state.controlStats?.[B.id].rolls).toBe(1);
  });
});
