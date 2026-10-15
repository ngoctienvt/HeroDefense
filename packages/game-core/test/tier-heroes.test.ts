import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import { combatStep } from '../src/combat.js';
import { handleCommand } from '../src/commands.js';
import { command, deployed, enemy, game } from './fixtures.js';

describe('Linh basic attack traits', () => {
  it('has no active skill or Q cooldown on all eight Linh heroes', () => {
    expect(HEROES.filter(hero => hero.tier === 1)).toHaveLength(8);
    for (const hero of HEROES.filter(hero => hero.tier === 1)) {
      const state = game(), unit = deployed(state, hero.id);
      expect(hero.ability).toBeNull();
      expect(hero.trait?.name).toBeTruthy();
      expect(handleCommand(state, 'p1', { type: 'cast', unitId: unit.id }).ok).toBe(false);
      expect(unit.abilityCooldown).toBe(0);
    }
  });

  it('penetrates armor and sunders on crit for Thiên Lý Nhãn', () => {
    const state = game(), unit = deployed(state, 'h001');
    const target = enemy(state, unit, { armor: 10, attack: 0, cooldown: 999 });
    for (let n = 0; n < 8; n++) {
      unit.cooldown = 0;
      combatStep(state, .05);
      if (target.sunder) break;
    }
    expect(target.sunder).toMatchObject({ amount: 3 });
  });

  it('bounces Thuận Phong Nhĩ attacks and applies poison and slow to all targets', () => {
    const state = game(), unit = deployed(state, 'h002');
    const first = enemy(state, unit, { attack: 0, cooldown: 999 });
    const second = enemy(state, unit, { x: first.x + 2, attack: 0, cooldown: 999 });
    combatStep(state, .05);
    expect(first.poison?.damagePerSecond).toBe(15);
    expect(second.poison?.damagePerSecond).toBe(15);
    expect(first.slowStrength).toBeCloseTo(.10);
    expect(second.slowStrength).toBeCloseTo(.10);
    expect(second.hp).toBeLessThan(second.maxHp);
  });

  it('stuns and pushes the third Xạ Nhân arrow backwards', () => {
    const state = game(), unit = deployed(state, 'h005');
    const target = enemy(state, unit, { attack: 0, cooldown: 999 });
    const originalZ = target.z;
    for (let n = 0; n < 3; n++) { unit.cooldown = 0; combatStep(state, .05); }
    expect(target.stun).toBeGreaterThan(0);
    expect(target.z).toBeLessThan(originalZ);
  });
});

describe('Huyền skill mechanics', () => {
  it('shields Kim Tra and one ally with 100 rage and reflects melee damage while shield remains', () => {
    const state = game(), caster = deployed(state, 'h009');
    const ally = deployed(state, 'h001', 1);
    ally.x = caster.x; ally.z = caster.z;
    caster.energy = 100;
    command(state, { type: 'cast', unitId: caster.id });
    expect(caster.shield).toBeGreaterThan(caster.attack * 2);
    expect(ally.shield).toBeGreaterThan(0);
    expect(caster.energy).toBe(0);
    caster.orderMode = 'hold'; ally.orderMode = 'hold';
    const attacker = enemy(state, caster, { hp: 1000, maxHp: 1000, attack: 50, cooldown: 0 });
    combatStep(state, .05);
    expect(attacker.hp).toBeLessThan(1000);
    expect(attacker.bleed).toBeDefined();
  });

  it('activates berserk mode on Mộc Tra with 100 rage', () => {
    const state = game(), caster = deployed(state, 'h00A');
    caster.energy = 100;
    command(state, { type: 'cast', unitId: caster.id });
    expect(caster.berserk).toBeDefined();
    expect(caster.berserk?.remaining).toBeCloseTo(6.0);
    expect(caster.energy).toBe(0);
  });

  it('limits Mẫu Đơn healing to four injured allies', () => {
    const state = game(), caster = deployed(state, 'h00F');
    const allies = [caster, ...[1, 2, 3, 4].map(slot => deployed(state, 'h001', slot))];
    for (const ally of allies) { ally.x = caster.x; ally.z = caster.z; ally.hp /= 2; }
    command(state, { type: 'cast', unitId: caster.id });
    expect(state.events.at(-1)?.targets).toHaveLength(4);
    expect(allies.filter(ally => ally.haste)).toHaveLength(4);
  });

  it('converts Nhiếp Tiểu Thiến overheal into a five second frost shield', () => {
    const state = game(), caster = deployed(state, 'h03O');
    command(state, { type: 'cast', unitId: caster.id });
    expect(caster.shield).toBeGreaterThan(0);
    expect(caster.frostShield?.remaining).toBe(5);
    expect(caster.frostShield?.attackSlow).toBe(0.40);
    caster.orderMode = 'hold';
    combatStep(state, 5.1);
    expect(caster.shield).toBe(0);
  });
});
