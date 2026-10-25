import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import { castAbility, combatStep } from '../src/combat.js';
import { effectiveUnitAttack } from '../src/stats.js';
import { deployed, enemy, game } from './fixtures.js';

/**
 * Huyền–Tiên kits keep their identity; these tests pin the three rule fixes:
 * hard control only on specialists, recipient-scaled support, and percentage
 * buffs that never stack over a stronger one.
 */
const NON_SPECIALISTS = ['h00A', 'h00B', 'h00E', 'h00J', 'h00L', 'h00M', 'h00P',
  'h00R', 'h00T', 'h00W', 'h00X', 'h00Z', 'h03V'];

describe('Huyền–Tiên hard control', () => {
  for (const heroId of NON_SPECIALISTS) {
    it(`${heroId} never rolls hard control from skill or basic attacks`, () => {
      const state = game(); // forces every roll to land, so any call would show up
      const unit = deployed(state, heroId);
      state.phase = 'combat';
      const pack = Array.from({ length: 8 }, (_, index) => enemy(state, unit, {
        x: unit.x + 1.5 + (index % 4) * .8, z: unit.z + Math.floor(index / 4) * .8 - .4,
        attack: 0, speed: 0, slow: 1, slowStrength: .3 }));
      unit.energy = unit.maxEnergy ?? 100;
      unit.abilityCooldown = 0;
      expect(castAbility(state, unit, pack[0].id)).toBe(true);
      for (let step = 0; step < 50; step++) combatStep(state, .1);
      expect(state.controlStats?.[heroId]?.rolls ?? 0).toBe(0);
      for (const victim of pack) {
        expect(victim.stun ?? 0).toBe(0);
        expect(victim.root ?? 0).toBe(0);
        expect(victim.frozen ?? 0).toBe(0);
      }
    });
  }

  it('keeps hard control on the Huyền–Tiên control specialists', () => {
    for (const heroId of ['h00N', 'h00Q', 'h00S']) {
      const state = game(), unit = deployed(state, heroId);
      const target = enemy(state, unit, { x: unit.x + 2, slow: 2, slowStrength: .3 });
      expect(castAbility(state, unit, target.id)).toBe(true);
      expect(state.controlStats?.[heroId]?.rolls ?? 0).toBeGreaterThan(0);
    }
  });

  it('turns Trư Bát Giới taunt into a timed block bonus', () => {
    const state = game(), pig = deployed(state, 'h00J');
    const target = enemy(state, pig, { attack: 0 });
    pig.energy = 100;
    expect(castAbility(state, pig, target.id)).toBe(true);
    expect(pig.blockBonus).toEqual({ remaining: 5, amount: 8 });
    expect(state.controlStats?.h00J?.rolls ?? 0).toBe(0);
    state.phase = 'combat'; pig.orderMode = 'hold';
    for (let step = 0; step < 52; step++) combatStep(state, .1);
    expect(pig.blockBonus).toBeUndefined();
  });
});

describe('Huyền–Tiên support scales with the recipient', () => {
  it('adds 6% of each recipient max HP to Mẫu Đơn healing', () => {
    const state = game(), healer = deployed(state, 'h00F');
    const big = deployed(state, 'h00W', 1), small = deployed(state, 'h001', 2);
    for (const ally of [big, small]) { ally.x = healer.x; ally.z = healer.z; ally.hp = 1; }
    const power = effectiveUnitAttack(healer) * 2.2;
    expect(castAbility(state, healer)).toBe(true);
    expect(big.hp - 1).toBeCloseTo(power + big.maxHp * .06, 0);
    expect(big.hp - 1).toBeGreaterThan(small.hp - 1);
  });

  it('sizes the Kim Tra shield by the ally that receives it', () => {
    const state = game(), caster = deployed(state, 'h009');
    const ally = deployed(state, 'h00W', 1);
    ally.x = caster.x; ally.z = caster.z;
    caster.energy = 100;
    expect(castAbility(state, caster)).toBe(true);
    expect(ally.shield).toBeCloseTo(effectiveUnitAttack(caster) * 2.2 + ally.maxHp * .12, 0);
  });

  it('announces the Kim Tra counter-strike so the bell ring-out can be drawn', () => {
    const state = game(), caster = deployed(state, 'h009');
    enemy(state, caster, { attack: 100, armor: 0, speed: 0 });
    state.phase = 'combat'; caster.cooldown = 100; caster.shield = 5000;
    combatStep(state, .1);
    const ring = state.events.find(item => item.skillId === 'reflect-h009');
    expect(ring).toMatchObject({ kind: 'trait', source: caster.id, x: caster.x, z: caster.z });
  });

  it('keeps Kim Thân La Hán immortality and rage transfer with a recipient-scaled heal', () => {
    const state = game(), monk = deployed(state, 'h03U');
    const carry = deployed(state, 'h00R', 1);
    carry.x = monk.x; carry.z = monk.z; carry.hp = 1; carry.energy = 0;
    const attack = effectiveUnitAttack(monk);
    expect(castAbility(state, monk)).toBe(true);
    expect(carry.hp - 1).toBeCloseTo(attack * 3.2 + carry.maxHp * .12, 0);
    expect(carry.tierImmortal?.remaining).toBe(4);
    expect(carry.energy).toBe(35);
  });

  it('still pays Triệu Công Minh Linh Thạch when the coin hits a boss', () => {
    const state = game(), banker = deployed(state, 'h03S');
    const boss = enemy(state, banker, { kind: 'boss', x: banker.x + 3 });
    const gold = state.players.p1.gold;
    banker.energy = 100;
    expect(castAbility(state, banker, boss.id)).toBe(true);
    expect(state.players.p1.gold).toBe(gold + 25);
  });
});

describe('Huyền–Tiên percentage buffs do not stack over stronger ones', () => {
  it('leaves a stronger empower untouched and buffs the others', () => {
    const state = game(), sage = deployed(state, 'h010');
    const strong = deployed(state, 'h00V', 1), plain = deployed(state, 'h00U', 2);
    for (const ally of [strong, plain]) { ally.x = sage.x; ally.z = sage.z; }
    strong.empower = { remaining: 1, attackBonus: .6, armorPierce: 0 };
    const target = enemy(state, sage, { attack: 0 });
    expect(castAbility(state, sage, target.id)).toBe(true);
    expect(strong.empower).toMatchObject({ remaining: 1, attackBonus: .6 });
    expect(plain.empower?.attackBonus).toBe(.3);
  });

  it('keeps a stronger damage amplifier on enemies hit by Đát Kỷ', () => {
    const state = game(), fox = deployed(state, 'h00X');
    const marked = enemy(state, fox, { x: fox.x + 3, pureLand: { remaining: 2, bonusDamage: .4 } });
    const fresh = enemy(state, fox, { x: fox.x + 4 });
    expect(castAbility(state, fox, marked.id)).toBe(true);
    expect(marked.pureLand?.bonusDamage).toBe(.4);
    expect(fresh.pureLand?.bonusDamage).toBe(.25);
  });

  it('does not wipe Dương Tiễn berserk when Ngũ Đạo grants lifesteal', () => {
    const state = game(), general = deployed(state, 'h00Y');
    const yang = deployed(state, 'h00U', 1);
    yang.berserk = { remaining: 3, attackSpeed: .9, lifesteal: 0 };
    const target = enemy(state, general, { attack: 0 });
    expect(castAbility(state, general, target.id)).toBe(true);
    expect(yang.berserk).toMatchObject({ remaining: 3, attackSpeed: .9, lifesteal: .15 });
  });
});

describe('Huyền–Tiên descriptions', () => {
  it('no longer promise damage from enemy HP or removed hard control', () => {
    for (const hero of HEROES.filter(entry => entry.tier >= 2 && entry.tier <= 4)) {
      const text = `${hero.trait?.description ?? ''} ${hero.ability?.description ?? ''}`;
      expect(text, hero.id).not.toMatch(/Máu hiện tại/);
      if (NON_SPECIALISTS.includes(hero.id)) expect(text, hero.id).not.toMatch(/Choáng|Trói|Đóng Băng cứng|Khiêu khích|trói chân/);
    }
  });
});
