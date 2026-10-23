import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import { handleCommand, stepGame } from '../src/index.js';
import { combatStep } from '../src/combat.js';
import { attackInterval } from '../src/stats.js';
import { command, deployed, enemy, game, start } from './fixtures.js';

function finishWindup(state: ReturnType<typeof game>, unit: ReturnType<typeof deployed>): void {
  for (let tick = 0; tick < 8 && unit.pendingAbility; tick++) combatStep(state, .05);
  expect(unit.pendingAbility).toBeUndefined();
}

describe('all extracted ability definitions', () => {
  it('gives eight Linh heroes passive attacks and keeps all five active combat families', () => {
    expect(HEROES).toHaveLength(70);
    expect(new Set(HEROES.map(h => h.id)).size).toBe(70);
    expect(HEROES.filter(h => h.tier === 1).every(h => h.ability === null && h.trait)).toBe(true);
    expect(new Set(HEROES.flatMap(h => h.ability?.id ? [h.ability.id] : [])).size).toBe(62);
    expect(HEROES.every(h => !h.ability || ['map', 'original', 'adapted'].includes(h.ability.provenance ?? ''))).toBe(true);
    expect(new Set(HEROES.flatMap(h => h.ability ? [h.ability?.kind] : []))).toEqual(new Set(['cleave', 'chain', 'nova', 'shield', 'heal']));
  });
  it.each(HEROES.filter(hero => hero.ability))('$id $name casts its designed web ability with a shared cooldown', (hero) => {
    const ability = hero.ability!;
    const state = game(), unit = deployed(state, hero.id), ally = deployed(state, HEROES[0].id, 1);
    ally.x = unit.x; ally.z = unit.z; unit.hp = unit.maxHp / 2; ally.hp = ally.maxHp / 2;
    const target = enemy(state, unit), other = enemy(state, unit, { x: target.x + .5 });
    const beforeHp = unit.hp + ally.hp;
    if (unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit') {
      unit.energy = 100;
    }
    command(state, { type: 'cast', unitId: unit.id, target: target.id });
    if (unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit') {
      expect(unit.energy).toBeLessThan(100);
    } else {
      expect(unit.abilityCooldown).toBeGreaterThan(0);
    }
    if (unit.pendingAbility) expect(state.events.at(-1)?.kind).toBe('cast');
    expect(handleCommand(state, 'p1', { type: 'cast', unitId: unit.id, target: target.id }).ok).toBe(false);
    finishWindup(state, unit);
    expect(state.events.at(-1)?.ability).toBe(ability.kind);
    if (ability.kind === 'heal') expect(unit.hp + ally.hp).toBeGreaterThan(beforeHp);
    else if (ability.kind === 'shield') expect(unit.shield + ally.shield).toBeGreaterThan(0);
    else expect(target.hp).toBeLessThan(target.maxHp);
    if (ability.effect?.status === 'slow') expect(target.slow).toBeGreaterThan(0);
    if (ability.effect?.status === 'burn') expect(target.burn?.casterId).toBe(unit.id);
    if (ability.effect?.status === 'ward') expect(Math.max(unit.ward?.remaining ?? 0, ally.ward?.remaining ?? 0)).toBeGreaterThan(0);
    if (ability.effect?.status === 'haste') expect(Math.max(unit.haste?.remaining ?? 0, ally.haste?.remaining ?? 0)).toBeGreaterThan(0);
    if (ability.effect?.shape !== 'single' && !['heal', 'shield'].includes(ability.kind) && hero.id !== 'h00H') expect(other.hp).toBeLessThan(other.maxHp);
    expect(state.events.at(-1)?.skillId).toBe(ability.id);
    expect(Number.isFinite(unit.hp)).toBe(true);
  });
  it('rejects out-of-range/cross-zone targets and bench/dead casters', () => {
    const state = game(), unit = deployed(state, HEROES.find(h => h.ability?.kind === 'chain')!.id);
    const far = enemy(state, unit, { x: unit.x + 40 });
    expect(handleCommand(state, 'p1', { type: 'cast', unitId: unit.id, target: far.id }).ok).toBe(false);
    far.x = unit.x; far.zone = 1;
    expect(handleCommand(state, 'p1', { type: 'cast', unitId: unit.id, target: far.id }).ok).toBe(false);
    unit.slot = -1;
    expect(handleCommand(state, 'p1', { type: 'cast', unitId: unit.id }).ok).toBe(false);
    unit.slot = 0; unit.hp = 0;
    expect(handleCommand(state, 'p1', { type: 'cast', unitId: unit.id }).ok).toBe(false);
  });
});

describe('featured hero windup', () => {
  it('emits a cast before applying damage and an impact after the windup', () => {
    const state = game(), unit = deployed(state, 'h00B'), target = enemy(state, unit);
    state.phase = 'preparation';
    command(state, { type: 'cast', unitId: unit.id, target: target.id });
    expect(state.events.at(-1)?.kind).toBe('cast');
    expect(target.hp).toBe(target.maxHp);
    combatStep(state, .2);
    expect(target.hp).toBe(target.maxHp);
    combatStep(state, .05);
    expect(target.hp).toBeLessThan(target.maxHp);
    expect(state.events.at(-1)?.kind).toBe('ability');
    expect(unit.pendingAbility).toBeUndefined();
  });

  it('does not hit a vanished target or continue after the caster leaves its zone', () => {
    const state = game(), unit = deployed(state, 'h00C'), target = enemy(state, unit);
    state.phase = 'preparation';
    unit.energy = 100;
    command(state, { type: 'cast', unitId: unit.id, target: target.id });
    delete state.enemies[target.id];
    combatStep(state, .25);
    expect(state.events.filter(e => e.kind === 'ability')).toHaveLength(0);
    unit.energy = 100;
    const next = enemy(state, unit);
    command(state, { type: 'cast', unitId: unit.id, target: next.id });
    unit.zone = 1;
    combatStep(state, .25);
    expect(next.hp).toBe(next.maxHp);
    expect(unit.pendingAbility).toBeUndefined();
  });

  it('resolves practice casts immediately while the lobby clock is stopped', () => {
    const state = game(), unit = deployed(state, 'h009');
    unit.energy = 100;
    command(state, { type: 'cast', unitId: unit.id });
    expect(unit.pendingAbility).toBeUndefined();
    expect(unit.shield).toBeGreaterThan(0);
    expect(state.events.at(-1)?.kind).toBe('ability');
  });
});

describe('death, rewards and respawn', () => {
  it('records a kill once without granting per-kill resources', () => {
    const state = game(), unit = deployed(state, HEROES.find(h => h.ability?.kind === 'chain')!.id);
    const target = enemy(state, unit, { hp: 1, maxHp: 1 });
    const gold = state.players.p1.gold, souls = state.players.p1.souls;
    command(state, { type: 'cast', unitId: unit.id, target: target.id });
    finishWindup(state, unit);
    expect(state.enemies[target.id]).toBeUndefined(); expect(state.players.p1.gold).toBe(gold);
    expect(state.players.p1.souls).toBe(souls);
    expect(unit.kills).toBe(1); expect(state.players.p1.kills).toBe(1);
    combatStep(state, .05); expect(state.players.p1.gold).toBe(gold);
  });
  it('absorbs shields then dies and respawns at a saved position', () => {
    const state = game(), unit = deployed(state); start(state);
    unit.savedPosition = { x: -10, z: 10 }; unit.stopped = true; unit.shield = 100;
    const killer = enemy(state, unit, { attack: 100000 });
    // Enemy hits land after their wind-up.
    for (let tick = 0; tick < 20 && unit.hp > 0; tick++) stepGame(state, .05);
    expect(unit.hp).toBe(0); expect(unit.deaths).toBe(1); expect(unit.respawn).toBeGreaterThan(5);
    expect(unit.shield).toBe(0); delete state.enemies[killer.id];
    for (let n = 0; n < 120; n++) stepGame(state, .05);
    expect(unit.hp).toBe(unit.maxHp); expect(unit.zone).toBe(0); expect(unit.respawn).toBe(0);
    expect({ x: unit.x, z: unit.z }).toEqual(unit.savedPosition);
  });
});

describe('hero skill statuses', () => {
  it('uses each slow strength for movement and clears it when the slow ends', () => {
    const hero = HEROES.find(h => h.ability?.effect?.status === 'slow')!;
    const state = game(1), unit = deployed(state, hero.id);
    const target = enemy(state, unit);
    command(state, { type: 'cast', unitId: unit.id, target: target.id });
    const strength = hero.ability!.effect!.statusStrength!;
    expect(target.slowStrength).toBeCloseTo(strength);
    unit.slot = -1; target.x = 0; target.z = -15; target.speed = 10;
    combatStep(state, 1);
    expect(target.z).toBeCloseTo(-15 + 10 * (1 - strength));
    combatStep(state, 10);
    expect(target.slow).toBe(0);
    expect(target.slowStrength).toBeUndefined();
  });

  it('retains the longer slow after the shorter one expires', () => {
    const state = game(), long = deployed(state, 'h00I'), short = deployed(state, 'h013', 1);
    short.x = long.x; short.z = long.z;
    const target = enemy(state, long, { speed: 0, attack: 0 });
    command(state, { type: 'cast', unitId: long.id, target: target.id });
    command(state, { type: 'cast', unitId: short.id, target: target.id });
    expect(target.slowStrength).toBeCloseTo(.5);
    long.slot = -1; short.slot = -1;
    combatStep(state, 3.1);
    expect(target.slowStrength).toBeCloseTo(.5);
    combatStep(state, 1);
    expect(target.slow).toBe(0);
    expect(target.slowStrength).toBeUndefined();
  });

  it('reaches secondary radius and chain targets beyond the caster range', () => {
    for (const shape of ['radius', 'chain'] as const) {
      const hero = HEROES.find(h => h.ability?.effect?.shape === shape && !['heal', 'shield'].includes(h.ability?.kind))!;
      const state = game(), unit = deployed(state, hero.id);
      const primary = enemy(state, unit, { x: unit.x + unit.range + 4 });
      const secondary = enemy(state, unit, { x: primary.x + 2 });
      command(state, { type: 'cast', unitId: unit.id, target: primary.id });
      finishWindup(state, unit);
      expect(secondary.hp).toBeLessThan(secondary.maxHp);
      expect(state.events.at(-1)?.targets).toContain(secondary.id);
    }
  });

  it('heals injured allies and grants haste to those selected', () => {
    const hero = HEROES.find(h => h.ability?.kind === 'heal' && h.ability?.effect?.status === 'haste' && h.ability?.effect?.shape === 'radius')!;
    const state = game(), healer = deployed(state, hero.id), healthy = deployed(state, HEROES[0].id, 1);
    healthy.x = healer.x; healthy.z = healer.z; healer.hp = healer.maxHp / 2; healthy.hp = healthy.maxHp / 2;
    command(state, { type: 'cast', unitId: healer.id });
    finishWindup(state, healer);
    expect(healer.hp).toBeGreaterThan(healer.maxHp / 2);
    expect(healthy.haste?.remaining).toBeGreaterThan(0);
    expect(state.events.at(-1)?.targets).toContain(healthy.id);
  });

  it('burn deals timed damage with caster attribution and then expires', () => {
    const hero = HEROES.find(h => h.ability?.effect?.status === 'burn')!;
    const state = game(), unit = deployed(state, hero.id);
    const target = enemy(state, unit, { hp: 100000, maxHp: 100000, attack: 0, speed: 0, cooldown: 999 });
    unit.stopped = true;
    command(state, { type: 'cast', unitId: unit.id, target: target.id });
    finishWindup(state, unit);
    const afterCast = target.hp;
    combatStep(state, .05);
    expect(target.hp).toBeLessThan(afterCast);
    expect(target.burn?.casterId).toBe(unit.id);
    for (let n = 0; n < 120; n++) combatStep(state, .05);
    expect(target.burn).toBeUndefined();
  });

  it('ward reduces incoming damage and haste changes attack interval only while active', () => {
    const wardHero = HEROES.find(h => h.ability?.kind === 'shield' && h.ability?.effect?.status === 'ward')!;
    const hasteHero = HEROES.find(h => h.ability?.effect?.status === 'haste' && h.ability?.kind === 'heal')!;
    const state = game(), guardian = deployed(state, wardHero.id), healer = deployed(state, hasteHero.id, 1);
    guardian.x = healer.x; guardian.z = healer.z;
    if (guardian.energyType === 'rage_on_attack' || guardian.energyType === 'rage_on_hit') guardian.energy = 100;
    command(state, { type: 'cast', unitId: guardian.id });
    finishWindup(state, guardian);
    expect(guardian.ward?.remaining).toBeGreaterThan(0);
    guardian.shield = 0; guardian.stopped = true; healer.stopped = true;
    const attacker = enemy(state, guardian, { attack: 100, speed: 0, cooldown: 0 });
    const before = guardian.hp;
    // One enemy swing (wind-up then hit) fits in 0.6 s.
    for (let tick = 0; tick < 12; tick++) combatStep(state, .05);
    const expectedWithoutWard = 100 * 100 / (100 + guardian.armor * 5);
    expect(before - guardian.hp).toBeLessThan(expectedWithoutWard);
    delete state.enemies[attacker.id];
    // The healer may auto-cast during the ward damage step; reset that cast to
    // isolate the manual haste timing assertion.
    healer.abilityCooldown = 0; healer.haste = undefined;
    healer.hp = healer.maxHp / 2;
    const normalInterval = attackInterval(state, healer);
    command(state, { type: 'cast', unitId: healer.id });
    finishWindup(state, healer);
    expect(attackInterval(state, healer)).toBeLessThan(normalInterval);
    for (let n = 0; n < 140; n++) combatStep(state, .05);
    expect(healer.haste).toBeUndefined();
    expect(attackInterval(state, healer)).toBeCloseTo(normalInterval);
  });
});
