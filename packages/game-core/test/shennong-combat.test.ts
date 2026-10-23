import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { SHENNONG as S } from '../../../content/shennong-design.js';
import { executeAttackGeometry, triggerFollowUp } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Thần Nông', () => {
  it('poisons one target and heals allies around the impact', () => {
    const state = game(), unit = deployed(state, S.id), ally = deployed(state, 'h011', 1);
    state.phase = 'combat';
    const focus = enemy(state, unit, { x: unit.x + 2, armor: 0,
      hp: 100000, maxHp: 100000, speed: 0, attack: 0 });
    const nearby = enemy(state, unit, { x: focus.x + 2, armor: 0,
      hp: 100000, maxHp: 100000, speed: 0, attack: 0 });
    ally.x = focus.x; ally.hp -= 500;
    executeAttackGeometry(state, unit, focus, (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? unit, hit, damage, penetration));
    expect(HERO_BY_ID[S.id]).toMatchObject({ hp: 8800, attack: 1080,
      armor: 30, range: 8, interval: 1, speed: 3.6 });
    expect(nearby.hp).toBe(nearby.maxHp);
    expect(focus.poison?.damagePerSecond).toBeCloseTo(S.attack * S.normalPoisonPower);
    expect(ally.hp).toBe(ally.maxHp - 320);
    unit.abilityCooldown = 100; unit.cooldown = 100;
    const before = focus.hp;
    combatStep(state, .25);
    expect(focus.hp).toBeLessThan(before);
  });

  it('erupts without rooting, keeps one healing grove and three 6000-HP blockers', () => {
    const state = game(), unit = deployed(state, S.id), ally = deployed(state, 'h011', 1, 'p2');
    state.phase = 'combat'; unit.cooldown = 100;
    const target = enemy(state, unit, { kind: 'boss', x: unit.x + 3, armor: 0,
      hp: 100000, maxHp: 100000, speed: 0, attack: 0 });
    ally.hp -= 1000;
    expect(castAbility(state, unit, target.id)).toBe(true);
    combatStep(state, .25);
    const grove = state.groundEffects?.find(ground => ground.kind === 'shennong-grove');
    const trees = Object.values(state.units).filter(value => value.summonKind === 'ancient-tree');
    expect(grove?.burnDps).toBeCloseTo(S.attack * S.zoneDpsPower);
    expect(trees).toHaveLength(3);
    expect(trees.every(tree => tree.hp === 6000 && tree.block === 8)).toBe(true);
    expect(target.root ?? 0).toBe(0);
    // 420% Công + 150% Công chuẩn; never a share of the boss's Máu.
    expect(target.maxHp - target.hp).toBeGreaterThan(S.attack * S.eruptionPower);
    expect(target.maxHp - target.hp).toBeLessThan(S.attack * (S.eruptionPower + S.eruptionTruePower) * 2);
    expect(() => triggerFollowUp(state, unit, target, 'skill')).not.toThrow();
    const before = ally.hp;
    expect(() => combatStep(state, .25)).not.toThrow();
    expect(ally.hp).toBeGreaterThan(before);
    expect(target.attackWeak?.strength).toBe(.5);
  });
});
