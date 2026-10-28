import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { GEAR_UNIQUES } from '../../../content/gear-design.js';
import { LUCNHI } from '../../../content/lucnhi-design.js';
import type { Enemy, GameState, GearItem, GearUniqueId, Unit } from '../../contracts/src/types.js';
import { gearBasicAttack } from '../src/gear-attacks.js';
import { releaseUnitGear } from '../src/gear-commands.js';
import { finishGearTick } from '../src/gear-runtime.js';
import { gearModsOf, unitSpeed } from '../src/gear-stats.js';
import { beginGearWave, gearBasicHit, onGearUniqueKill, resolveGearLightning,
  settleGearRecovery, tryGearMirror, tryGearRewind } from '../src/gear-uniques.js';
import { combatStep, hurtEnemy, hurtUnit } from '../src/combat.js';
import { blessedNormalDamage } from '../src/combat-status.js';
import { lucnhiAbility, stepLucnhiAssault } from '../src/lucnhi-combat.js';
import { attackInterval, effectiveUnitAttack, refreshStats } from '../src/stats.js';
import { deployed, enemy, game } from './fixtures.js';

function equip(state: GameState, unit: Unit, unique: GearUniqueId): GearItem {
  const item: GearItem = { id: `unique-${state.players[unit.owner].gear.length}`, unique,
    slot: GEAR_UNIQUES[unique].slot, rarity: 'gold', level: 20, enhance: 0, rerolls: 0, lines: [], unitId: unit.id };
  state.players[unit.owner].gear.push(item);
  state.players[unit.owner].gearVersion++;
  refreshStats(state, unit.owner);
  return item;
}
function kill(state: GameState, unit: Unit, patch: Partial<Enemy> = {}): Enemy {
  const victim = enemy(state, unit, { hp: 0, ...patch });
  delete state.enemies[victim.id];
  return victim;
}
const damage = (_source: Unit, target: Enemy, amount: number): void => { target.hp -= amount; };
const loss = (state: GameState) => (unit: Unit, amount: number): void => hurtUnit(state, unit, amount, undefined, true);

describe('unique gear rules and limits', () => {
  it('heaven-earth-reversal adds six percent of final max HP to base attack without compounding refreshes', () => {
    const state = game(), unit = deployed(state, 'h006');
    equip(state, unit, 'heaven-earth-reversal');
    expect(unit.attack).toBe(Math.round(HERO_BY_ID[unit.heroId].attack + unit.maxHp * .06));
    const attack = unit.attack;
    refreshStats(state, unit.owner);
    expect(unit.attack).toBe(attack);
  });

  it('sea-anchor removes stun while keeping ordinary attack speed', () => {
    const state = game(), unit = deployed(state, 'h006');
    const interval = attackInterval(state, unit);
    equip(state, unit, 'sea-anchor');
    expect(attackInterval(state, unit)).toBe(interval);
    unit.stun = 5;
    state.phase = 'combat';
    combatStep(state, .01);
    expect(unit.stun ?? 0).toBe(0);
  });

  it('time-reversal saves lethal hits once per wave and restores cooldown and energy', () => {
    const state = game(), unit = deployed(state, 'h00B');
    equip(state, unit, 'time-reversal');
    unit.hp = unit.maxHp * .8;
    beginGearWave(state);
    unit.abilityCooldown = 10; unit.energy = 0; unit.hp = -100;
    expect(tryGearRewind(state, unit)).toBe(true);
    expect(unit.hp).toBeCloseTo(unit.maxHp * .8);
    expect(unit.abilityCooldown).toBe(0); expect(unit.energy).toBe(unit.maxEnergy);
    unit.hp = 1;
    expect(tryGearRewind(state, unit)).toBe(false);
    beginGearWave(state); unit.hp = 0;
    expect(tryGearRewind(state, unit)).toBe(true);
  });

  it('eight-trigram-mirror blocks ranged and boss attacks, reflects 150% attack, and ignores melee', () => {
    const state = game(), unit = deployed(state, 'h006');
    equip(state, unit, 'eight-trigram-mirror');
    const ranged = enemy(state, unit, { kind: 'ranged' }), boss = enemy(state, unit, { kind: 'boss' });
    for (const attacker of [ranged, boss]) {
      state.gearSeed = 1; // The real xorshift stream starts below the 25% threshold.
      expect(tryGearMirror(state, unit, attacker, damage)).toBe(true);
      expect(attacker.maxHp - attacker.hp).toBeCloseTo(unit.attack * 1.5);
    }
    expect(tryGearMirror(state, unit, enemy(state, unit), damage)).toBe(false);
    expect(tryGearMirror(state, unit, undefined, damage)).toBe(false);
  });

  it('inheritance-seal stores ranked base stats once per consumption and never absorbs a sale', () => {
    const state = game(), unit = deployed(state, 'h006'), item = equip(state, unit, 'inheritance-seal');
    unit.rank = 2; unit.attack = unit.maxHp = 1e8;
    releaseUnitGear(state, unit, 'merge');
    const base = HERO_BY_ID[unit.heroId];
    expect(item.absorbedAttack).toBeCloseTo(base.attack * 2.4 * .15);
    expect(item.absorbedHp).toBeCloseTo(base.hp * 2.4 * .15);
    releaseUnitGear(state, unit, 'merge');
    expect(item.absorbedAttack).toBeCloseTo(base.attack * 2.4 * .15);
    item.unitId = unit.id;
    releaseUnitGear(state, unit, 'sell');
    expect(item.absorbedAttack).toBeCloseTo(base.attack * 2.4 * .15);
  });

  it('fate-defiance replaces Pangu native cleave with exactly three decaying bounces within radius five', () => {
    const state = game(), unit = deployed(state, 'h01B');
    equip(state, unit, 'fate-defiance');
    const targets = Array.from({ length: 5 }, (_, i) => enemy(state, unit, { x: unit.x + 1 + i, z: unit.z }));
    const hits: number[] = [];
    gearBasicAttack(state, unit, targets[0], (_target, amount) => hits.push(amount), damage, () => {});
    expect(hits).toEqual([1, .85, .7, .55].map(ratio => unit.attack * ratio));
    expect(targets.every(target => !target.bleed && !target.sunder)).toBe(true);
    targets[1].x = unit.x + 100;
    for (const target of targets.slice(2)) target.x = unit.x + 100;
    hits.length = 0;
    gearBasicAttack(state, unit, targets[0], (_target, amount) => hits.push(amount), damage, () => {});
    expect(hits).toHaveLength(1);
  });

  it('star-absorption counts bosses as twenty, caps at sixty percent and persists after transfer', () => {
    const state = game(), unit = deployed(state, 'h006'), other = deployed(state, 'h001', 1);
    const item = equip(state, unit, 'star-absorption');
    onGearUniqueKill(state, unit, kill(state, unit, { kind: 'boss' }), damage);
    expect(item.stacks).toBe(20);
    expect(gearModsOf(state, unit)['attack-percent']).toBeCloseTo(.45);
    for (let i = 0; i < 12; i++) onGearUniqueKill(state, unit, kill(state, unit, { kind: 'boss' }), damage);
    expect(item.stacks).toBe(240);
    item.unitId = other.id; state.players[unit.owner].gearVersion++;
    expect(gearModsOf(state, other)['attack-percent']).toBeCloseTo(1);
  });

  it('blood-pact keeps forty percent recovery and shields, exempts revives, and fills HP at wave start', () => {
    const state = game(), unit = deployed(state, 'h006');
    equip(state, unit, 'blood-pact');
    unit.hp = unit.maxHp / 2; unit.shield = 10;
    unit.gearRuntime = { hpSeen: unit.hp, shieldSeen: 10 };
    const hp = unit.hp;
    unit.hp += 20; unit.shield += 50;
    settleGearRecovery(state, unit);
    expect(unit.hp).toBeCloseTo(hp + 8); expect(unit.shield).toBeCloseTo(30);
    unit.gearRuntime.hpSeen = 0; unit.hp = unit.maxHp;
    settleGearRecovery(state, unit);
    expect(unit.hp).toBe(unit.maxHp);
    unit.hp = 1; beginGearWave(state);
    expect(unit.hp).toBe(unit.maxHp);
  });

  it('blood-pact scales damage with missing HP and cannot add damage above full HP', () => {
    const state = game(), unit = deployed(state, 'h006'), target = enemy(state, unit);
    equip(state, unit, 'blood-pact');
    unit.hp = unit.maxHp / 2;
    hurtEnemy(state, unit, target, 100);
    expect(target.maxHp - target.hp).toBeCloseTo(160);
    target.hp = target.maxHp; unit.hp = unit.maxHp;
    hurtEnemy(state, unit, target, 100);
    expect(target.maxHp - target.hp).toBeCloseTo(100);
  });

  it('demon-heart grants eighty percent speed and can kill through shields while permitting normal revival', () => {
    const state = game(), unit = deployed(state, 'h006'), target = enemy(state, unit, { attack: 0 });
    const interval = attackInterval(state, unit);
    equip(state, unit, 'demon-heart');
    expect(attackInterval(state, unit)).toBeCloseTo(interval / 1.8);
    unit.hp = 1; unit.shield = 1e6; unit.armor = 1e6; unit.target = target.id;
    state.phase = 'combat';
    finishGearTick(state, 1, damage, loss(state));
    expect(unit.hp).toBe(0); expect(unit.respawn).toBeGreaterThan(0);
    unit.target = null;
    delete state.enemies[target.id];
    const reviveIn = unit.respawn;
    combatStep(state, reviveIn + .01);
    expect(unit.hp).toBeGreaterThan(0); expect(unit.respawn).toBe(0);
  });

  it('seven-kills casts at forty percent without spending cooldown or rage, then restores attack scale', () => {
    const state = game(), unit = deployed(state, 'h00B'), target = enemy(state, unit);
    equip(state, unit, 'seven-kills');
    unit.gearRuntime = { attacks: 6 }; unit.energy = 47; unit.abilityCooldown = 9;
    let casts = 0;
    const attack = effectiveUnitAttack(unit);
    gearBasicAttack(state, unit, target, (victim, amount) => { victim.hp -= amount; }, damage, () => {
      casts++; expect(effectiveUnitAttack(unit)).toBeCloseTo(attack * .4);
      unit.energy = 0; unit.abilityCooldown = 100;
    });
    expect(casts).toBe(1); expect(unit.energy).toBe(47); expect(unit.abilityCooldown).toBe(9);
    expect(effectiveUnitAttack(unit)).toBe(attack);
    gearBasicAttack(state, unit, target, () => {}, damage, () => { casts++; });
    expect(casts).toBe(1);
  });

  it('seven-kills triples the seventh attack for a hero with no ability', () => {
    const state = game(), unit = deployed(state, 'h006'), target = enemy(state, unit);
    equip(state, unit, 'seven-kills'); unit.gearRuntime = { attacks: 5 };
    const hits: number[] = [];
    gearBasicAttack(state, unit, target, (_victim, amount) => hits.push(amount), damage, () => {});
    gearBasicAttack(state, unit, target, (_victim, amount) => hits.push(amount), damage, () => {});
    expect(hits).toEqual([unit.attack, unit.attack * 3]);
  });

  it('lightning-talisman recognizes native critical attacks, hits three other targets and stops', () => {
    const state = game(), unit = deployed(state, 'h001');
    equip(state, unit, 'lightning-talisman'); unit.critBlessing = { remaining: 5, chance: 1 };
    const targets = Array.from({ length: 5 }, (_, i) => enemy(state, unit, { x: unit.x + 1 + i, z: unit.z }));
    const procHits: number[] = [];
    gearBasicAttack(state, unit, targets[0], (victim, amount) => { victim.hp -= amount; },
      (_source, _victim, amount) => procHits.push(amount), () => {});
    expect(procHits).toHaveLength(3);
    const attackEvent = state.events.find(value => value.kind === 'attack' && value.source === unit.id);
    expect(procHits.every(amount => amount === (attackEvent?.value ?? 0) * .5)).toBe(true);
    expect(unit.gearRuntime?.lightning).toHaveLength(0);
    resolveGearLightning(state, unit, (_source, _victim, amount) => procHits.push(amount));
    expect(procHits).toHaveLength(3);
  });

  it('marks blessed native crits only during wrapped normal attacks, preventing stale follow-up markers', () => {
    const state = game(), unit = deployed(state, 'h01D'), target = enemy(state, unit);
    equip(state, unit, 'lightning-talisman');
    unit.critBlessing = { remaining: 5, chance: 1 };
    expect(blessedNormalDamage(state, unit, target, 50)).toBe(100);
    expect(unit.gearRuntime?.nativeCritical).toBeUndefined();
    unit.gearRuntime = { basicActive: true };
    expect(blessedNormalDamage(state, unit, target, 50)).toBe(100);
    expect(unit.gearRuntime.nativeCritical).toMatchObject({ targetId: target.id, damage: 100 });
    delete unit.gearRuntime.nativeCritical;
    unit.critBlessing.chance = 0;
    expect(blessedNormalDamage(state, unit, target, 50)).toBe(50);
    expect(unit.gearRuntime.nativeCritical).toBeUndefined();
  });

  it('lightning queues only one chain when a blessed native hit also rolls a gear critical', () => {
    const state = game(), unit = deployed(state, 'h01D'), item = equip(state, unit, 'lightning-talisman');
    item.lines = [{ stat: 'crit-chance', value: 100 }]; state.players[unit.owner].gearVersion++;
    unit.critBlessing = { remaining: 5, chance: 1 };
    const targets = Array.from({ length: 5 }, (_, i) => enemy(state, unit, { x: unit.x + 1 + i, z: unit.z }));
    const hits: number[] = [];
    gearBasicAttack(state, unit, targets[0], (victim, amount) => { victim.hp -= amount; },
      (_source, _victim, amount) => hits.push(amount), () => {});
    expect(hits).toHaveLength(3);
    expect(hits.every(amount => amount === unit.attack * 2 * 1.5 * .5)).toBe(true);
    expect(unit.gearRuntime?.nativeCritical).toBeUndefined();
    expect(unit.gearRuntime?.basicActive).toBeFalsy();
  });

  it('seven-kills snapshots forty percent attack for delayed Luc Nhi pulses after the cast scale clears', () => {
    const state = game(), unit = deployed(state, LUCNHI.id), target = enemy(state, unit);
    equip(state, unit, 'seven-kills'); unit.gearRuntime = { attacks: 6 };
    const attack = effectiveUnitAttack(unit);
    gearBasicAttack(state, unit, target, () => {}, damage,
      () => lucnhiAbility(state, unit, target));
    expect(unit.gearRuntime.castScale).toBeUndefined();
    const hits: number[] = [];
    stepLucnhiAssault(state, LUCNHI.strikeDuration, (_unit, _enemy, amount) => hits.push(amount));
    expect(hits).toHaveLength(LUCNHI.strikes);
    expect(hits.every(amount => Math.abs(amount - attack * .4 * LUCNHI.strikePower) < 1e-8)).toBe(true);
  });

  it('seated-oblivion grants range and attack but prevents explicit movement', () => {
    const state = game(), unit = deployed(state, 'h006'), range = unit.range;
    equip(state, unit, 'seated-oblivion');
    expect(unit.range).toBeCloseTo(range * 1.6);
    expect(unit.attack).toBe(Math.round(HERO_BY_ID[unit.heroId].attack * 1.4));
    const position = { x: unit.x, z: unit.z };
    state.phase = 'combat'; unit.orderMode = 'move'; unit.destination = { x: unit.x + 5, z: unit.z };
    combatStep(state, .1);
    expect({ x: unit.x, z: unit.z }).toEqual(position);
    expect(unit.orderMode).toBe('hold'); expect(unit.destination).toBeNull();
  });

  it('yin-yang alternates boosted damage and healing the lowest percent ally across owners within eight', () => {
    const state = game(), unit = deployed(state, 'h006'), ally = deployed(state, 'h001', 0, 'p2');
    equip(state, unit, 'yin-yang');
    ally.x = unit.x + 1; ally.z = unit.z; ally.hp = 1;
    const target = enemy(state, unit), before = ally.hp;
    gearBasicAttack(state, unit, target, (victim, amount) => { victim.hp -= amount; }, damage, () => {});
    expect(target.maxHp - target.hp).toBeCloseTo(unit.attack * 1.5); expect(ally.hp).toBe(before);
    gearBasicAttack(state, unit, target, (victim, amount) => { victim.hp -= amount; }, damage, () => {});
    expect(ally.hp).toBeCloseTo(before + unit.attack * .3);
    ally.x = unit.x + 9; const hp = ally.hp;
    gearBasicHit(state, unit, target, 100, amount => { target.hp -= amount; }, true);
    expect(ally.hp).toBe(hp);
  });

  it('heaven-devouring-gourd counts any nearby kill, detonates at twenty-five and ignores distant kills', () => {
    const state = game(), unit = deployed(state, 'h006'), killer = deployed(state, 'h001', 0, 'p2');
    equip(state, unit, 'heaven-devouring-gourd');
    killer.x = unit.x; killer.z = unit.z;
    const target = enemy(state, unit, { x: unit.x + 2 });
    onGearUniqueKill(state, killer, kill(state, killer, { x: unit.x + 7 }), damage);
    expect(unit.gearRuntime?.souls ?? 0).toBe(0);
    for (let i = 0; i < 24; i++) onGearUniqueKill(state, killer, kill(state, killer), damage);
    expect(unit.gearRuntime?.souls).toBe(24); expect(target.hp).toBe(target.maxHp);
    onGearUniqueKill(state, killer, kill(state, killer), damage);
    expect(unit.gearRuntime?.souls).toBe(0);
    expect(target.maxHp - target.hp).toBeCloseTo(unit.attack * .6 * 25);
  });

  it('treasure-basin pays fifteen stones on its real seeded chance and reduces attack by twenty-five percent', () => {
    const state = game(), unit = deployed(state, 'h006');
    equip(state, unit, 'treasure-basin');
    expect(unit.attack).toBe(Math.round(HERO_BY_ID[unit.heroId].attack * .75));
    const gold = state.players[unit.owner].gold;
    state.gearSeed = 1;
    onGearUniqueKill(state, unit, kill(state, unit), damage);
    expect(state.players[unit.owner].gold).toBe(gold + 15);
    const other = deployed(state, 'h001', 1);
    onGearUniqueKill(state, other, kill(state, other), damage);
    expect(state.players[unit.owner].gold).toBe(gold + 15);
  });

  it('celestial-net retains six traps, applies slow and eighty percent attack once, and expires unused traps', () => {
    const state = game(), unit = deployed(state, 'h006');
    equip(state, unit, 'celestial-net');
    for (let i = 0; i < 8; i++) onGearUniqueKill(state, unit, kill(state, unit, { x: unit.x + i * 3 }), damage);
    expect(state.gearTraps).toHaveLength(6);
    const trap = state.gearTraps![0], target = enemy(state, unit, { x: trap.x, z: trap.z });
    finishGearTick(state, .1, damage, loss(state));
    expect(target.slow).toBe(2); expect(target.slowStrength).toBe(.5);
    expect(target.maxHp - target.hp).toBeCloseTo(unit.attack * .8);
    finishGearTick(state, 21, damage, loss(state));
    expect(state.gearTraps).toHaveLength(0);
    expect(target.maxHp - target.hp).toBeCloseTo(unit.attack * .8);
  });

  it('wind-fire-wheels doubles speed and leaves bounded trails every three units without teleport trails', () => {
    const state = game(), unit = deployed(state, 'h006');
    equip(state, unit, 'wind-fire-wheels');
    expect(unitSpeed(unit)).toBe(HERO_BY_ID[unit.heroId].speed * 2);
    state.phase = 'combat'; beginGearWave(state);
    unit.x += 2; finishGearTick(state, .1, damage, loss(state));
    expect(state.groundEffects ?? []).toHaveLength(0);
    for (let i = 0; i < 10; i++) { unit.x += 3; finishGearTick(state, .1, damage, loss(state)); }
    expect(state.groundEffects).toHaveLength(8);
    expect(state.groundEffects?.[0]).toMatchObject({ kind: 'gear-fire-trail', radius: 1.4,
      remaining: 4, damagePerSecond: unit.attack * .4 });
    unit.zone = 1; finishGearTick(state, .1, damage, loss(state));
    expect(state.groundEffects).toHaveLength(8);
  });
});
