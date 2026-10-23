import { describe, expect, it } from 'vitest';
import brief from '../../../content/tier3-tier4-brief.json';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { deployed, enemy, game, summon } from './fixtures.js';
import { effectiveUnitAttack } from '../src/stats.js';
import { resolveTier3Ability } from '../src/tier3-combat.js';
import { resolveTier4Ability } from '../src/tier4-combat.js';

describe('Tier 3 and Tier 4 designs', () => {
  it('keeps Trầm Hương damage targets separate from exact healed allies, including full HP and stronger empower', () => {
    const state = game(), hero = deployed(state, 'h03Q'); hero.x = hero.z = 0;
    const full = deployed(state, 'h00L', 1), stronger = deployed(state, 'h00M', 2);
    const outside = deployed(state, 'h00N', 3), otherZone = deployed(state, 'h00O', 4);
    const otherOwner = deployed(state, 'h00L', 0, 'p2'), reserve = summon(state, 'h00L');
    for (const ally of [full, stronger, outside, otherZone, otherOwner, reserve]) { ally.x = 0; ally.z = 0; }
    full.x = 6; full.hp = full.maxHp; stronger.x = 1; stronger.hp = stronger.maxHp / 2;
    stronger.empower = { remaining: 8, attackBonus: .6, armorPierce: .15 };
    outside.x = 6.01; otherZone.zone = 1;
    const target = enemy(state, hero, { x: 10, z: 0 }), edge = enemy(state, hero, { x: 15, z: 0 });
    const missed = enemy(state, hero, { x: 15.01, z: 0 }), foreign = enemy(state, hero, { x: 10, z: 0, zone: 1 });
    const attack = effectiveUnitAttack(hero), before = stronger.hp, hits: string[] = [];
    resolveTier3Ability(state, hero, { x: 10, z: 0 }, (victim, damage, penetration, trueDamage) => {
      hits.push(victim.id); expect(damage).toBe(attack * 3);
      hurtEnemy(state, hero, victim, damage, penetration, false, trueDamage);
    });
    expect(hits).toEqual([target.id, edge.id]);
    expect(target.hp).toBeLessThan(target.maxHp); expect(edge.hp).toBeLessThan(edge.maxHp);
    expect(missed.hp).toBe(missed.maxHp); expect(foreign.hp).toBe(foreign.maxHp);
    expect(target.sunder).toMatchObject({ remaining: 5, amount: .35, percent: true });
    expect(stronger.hp).toBe(Math.min(stronger.maxHp, before + attack + stronger.maxHp * .05));
    expect(stronger.empower).toEqual({ remaining: 8, attackBonus: .6, armorPierce: .15 });
    expect(full.hp).toBe(full.maxHp); expect(full.empower).toMatchObject({ remaining: 5, attackBonus: .2 });
    for (const ally of [outside, otherZone, otherOwner, reserve]) expect(ally.empower).toBeUndefined();
    const receipt = state.events.find(e => e.kind === 'ability' && e.skillId === 'tier3-tier4-h03Q');
    expect(receipt?.targets).toEqual([target.id, edge.id]);
    expect(receipt?.supportTargets).toEqual([hero.id, full.id, stronger.id]);
    expect(JSON.parse(JSON.stringify(receipt))).toMatchObject({ supportTargets: [hero.id, full.id, stronger.id] });
  });
  it('emits Trầm Hương support receipts without any monsters, leaving other hero metadata optional', () => {
    const state = game(), hero = deployed(state, 'h03Q');
    resolveTier3Ability(state, hero, hero, () => { throw new Error('No monster should be hit'); });
    const receipt = state.events.find(e => e.kind === 'ability');
    expect(receipt).toMatchObject({ targets: [], supportTargets: [hero.id] });
    const another = deployed(state, 'h00K', 1);
    resolveTier3Ability(state, another, another, () => { throw new Error('Support ultimate cannot damage'); });
    expect(state.events.at(-1)).not.toHaveProperty('supportTargets');
  });
  it('preserves Phán Quan soul-link provenance in snapshots and clears it when another source replaces the status', () => {
    const state = game(), judge = deployed(state, 'h00O');
    const front = enemy(state, judge, { x: judge.x + 2, z: judge.z });
    const back = enemy(state, judge, { x: judge.x - 2, z: judge.z });
    resolveTier3Ability(state, judge, { x: judge.x + 4, z: judge.z }, (target, damage, penetration, trueDamage) =>
      hurtEnemy(state, judge, target, damage, penetration, false, trueDamage));
    expect(front.soulLink).toMatchObject({ casterId: judge.id, remaining: 4, sharePercent: .4, group: [front.id] });
    expect(back.soulLink).toBeUndefined();
    const snapshot = JSON.parse(JSON.stringify(state)) as typeof state;
    expect(snapshot.enemies[front.id].soulLink?.casterId).toBe(judge.id);
    const other = deployed(state, 'h00Y', 1);
    resolveTier4Ability(state, other, front, (source, target, damage, penetration, trueDamage) =>
      hurtEnemy(state, source, target, damage, penetration, false, trueDamage));
    expect(front.soulLink).toMatchObject({ remaining: 5, sharePercent: .5 });
    expect(front.soulLink?.casterId).toBeUndefined();
  });
  it('registers every supplied hero with the supplied combat stats and skill name', () => {
    expect(brief.heroes).toHaveLength(24);
    for (const supplied of brief.heroes) {
      expect(HERO_BY_ID[supplied.id]).toMatchObject({
        ...supplied.stats,
        element: supplied.element,
        energyType: supplied.energyType,
        ability: { name: supplied.skillName, id: `tier3-tier4-${supplied.id}` },
      });
    }
  });

  it('explodes Trư Bát Giới water shield once when broken', () => {
    const state = game(); const guardian = deployed(state, 'h00J');
    const target = enemy(state, guardian, { x: guardian.x + 3 });
    state.phase = 'combat'; guardian.energy = 100; guardian.cooldown = 10;
    expect(castAbility(state, guardian, target.id)).toBe(true);
    combatStep(state, .25);
    expect(guardian.tierShield?.kind).toBe('water');
    guardian.shield = 0;
    combatStep(state, 5);
    expect(target.hp).toBeLessThan(target.maxHp);
    expect(state.events.filter(entry => entry.skillId === 'water-shield-burst-h00J')).toHaveLength(1);
  });

  it('heals three allies and reduces their cooldown even when health is full', () => {
    const state = game(); const monk = deployed(state, 'h00K');
    const allies = [deployed(state, 'h00L', 1), deployed(state, 'h00M', 2), deployed(state, 'h00N', 3)];
    state.phase = 'combat'; monk.cooldown = 10;
    for (const ally of allies) { ally.hp = ally.maxHp; ally.abilityCooldown = 8; ally.cooldown = 10; }
    expect(castAbility(state, monk)).toBe(true);
    combatStep(state, .25);
    expect(allies.filter(ally => ally.ward?.reduction === .3)).toHaveLength(3);
    expect(allies.every(ally => ally.abilityCooldown < 6)).toBe(true);
  });

  it('chains Ngũ Đạo soul damage without recursive sharing', () => {
    const state = game(); const general = deployed(state, 'h00Y');
    const first = enemy(state, general), second = enemy(state, general, { x: general.x + 2 });
    state.phase = 'combat'; general.cooldown = 10;
    expect(castAbility(state, general, first.id)).toBe(true);
    combatStep(state, .25);
    expect(first.soulLink?.group).toContain(second.id);
    const before = second.hp;
    hurtEnemy(state, general, first, 100);
    expect(before - second.hp).toBeCloseTo(50);
  });

  it('spawns two temporary monkey clones with the specified strength', () => {
    const state = game(); const monkey = deployed(state, 'h00R');
    const target = enemy(state, monkey);
    state.phase = 'combat'; monkey.energy = 100; monkey.cooldown = 10;
    expect(castAbility(state, monkey, target.id)).toBe(true);
    combatStep(state, .25);
    const clones = Object.values(state.units).filter(unit => unit.summonKind === 'monkey-clone');
    expect(clones).toHaveLength(2);
    expect(clones.every(clone => clone.attack === monkey.attack * .45 && clone.maxHp === monkey.maxHp * .5)).toBe(true);
    combatStep(state, 6.01);
    expect(Object.values(state.units).filter(unit => unit.summonKind === 'monkey-clone')).toHaveLength(0);
  });

  it('gives frozen targets double basic damage for Ứng Long', () => {
    const state = game(); const dragon = deployed(state, 'h00Z');
    const frozen = enemy(state, dragon, { frozen: 2 });
    const normal = enemy(state, dragon, { x: dragon.x + 3 });
    const hurt = (target: typeof frozen, damage: number, penetration = 0) => hurtEnemy(state, dragon, target, damage, penetration);
    executeAttackGeometry(state, dragon, frozen, hurt);
    expect(frozen.maxHp - frozen.hp).toBeGreaterThan(normal.maxHp - normal.hp);
  });
});
