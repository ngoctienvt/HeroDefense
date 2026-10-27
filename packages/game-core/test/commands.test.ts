import { describe, expect, it } from 'vitest';
import { FORMATIONS, HEROES, SYNERGIES } from '../../../content/catalog.js';
import { addPlayer, removePlayer, setPlayerConnected } from '../src/state.js';
import { handleCommand as dispatch, stepGame } from '../src/index.js';
import { equipmentCost, RANDOM_SUMMON_COST, RUN_WAVES, slotPosition } from '../src/rules.js';
import { attackInterval } from '../src/stats.js';
import { combatStep } from '../src/combat.js';
import { command, deployed, enemy, game, start, summon } from './fixtures.js';

describe('lobby and authority', () => {
  it('repositions remaining lobby units when an earlier player seat leaves', () => {
    const state = game(), unit = deployed(state, HEROES[0].id, 2, 'p2');
    const originalX = unit.x;
    unit.savedPosition = { x: unit.x, z: unit.z };
    unit.target = 'old-lane-target'; unit.destination = { x: unit.x + 1, z: unit.z };
    removePlayer(state, 'p1');
    expect(state.host).toBe('p2');
    expect(unit.x).not.toBe(originalX);
    expect({ x: unit.x, z: unit.z }).toEqual(slotPosition(state, 'p2', 2));
    expect(unit.target).toBeNull(); expect(unit.destination).toBeNull(); expect(unit.savedPosition).toBeNull();
    command(state, { type: 'ready', ready: true }, 'p2'); command(state, { type: 'start' }, 'p2');
    const startedPosition = { x: unit.x, z: unit.z };
    removePlayer(state, 'p2');
    expect(state.players.p2.connected).toBe(false);
    expect({ x: unit.x, z: unit.z }).toEqual(startedPosition);
  });
  it('enforces names, capacity, readiness, host and disconnect ownership', () => {
    const state = game(1);
    expect(addPlayer(state, 'blank', '  ').ok).toBe(false);
    expect(addPlayer(state, 'p1', 'duplicate').ok).toBe(false);
    for (let n = 2; n <= 4; n++) expect(addPlayer(state, `p${n}`, `P${n}`).ok).toBe(true);
    expect(addPlayer(state, 'p5', 'P5').ok).toBe(false);
    expect(dispatch(state, 'p2', { type: 'start' }).ok).toBe(false);
    expect(dispatch(state, 'p1', { type: 'start' }).ok).toBe(false);
    setPlayerConnected(state, 'p1', false);
    expect(state.host).toBe('p2');
    expect(dispatch(state, 'p1', { type: 'redeem', item: 'chest-1' }).ok).toBe(false);
    removePlayer(state, 'p1');
    startWithHost(state);
    expect(addPlayer(state, 'late', 'Late').ok).toBe(false);
    removePlayer(state, 'p4');
    expect(state.players.p4.connected).toBe(false);
  });
  it('supports all difficulties with 20 waves and only permits valid host speed', () => {
    const state = game();
    for (const difficulty of ['normal', 'nightmare', 'hell', 'supreme'] as const) {
      command(state, { type: 'difficulty', difficulty });
      expect(state.maxWaves).toBe(RUN_WAVES);
    }
    expect(dispatch(state, 'p2', { type: 'difficulty', difficulty: 'normal' }).ok).toBe(false);
    for (const speed of [-1, 0, 3, NaN, Infinity]) expect(dispatch(state, 'p1', { type: 'speed', speed }).ok).toBe(false);
    expect(dispatch(state, 'p2', { type: 'speed', speed: 4 }).ok).toBe(false);
    command(state, { type: 'speed', speed: 4 });
    start(state);
    expect(dispatch(state, 'p1', { type: 'difficulty', difficulty: 'normal' }).ok).toBe(false);
  });
});

function startWithHost(state: ReturnType<typeof game>) {
  for (const id of Object.keys(state.players)) command(state, { type: 'ready', ready: true }, id);
  command(state, { type: 'start' }, state.host);
}

describe('roster and economy', () => {
  it('charges the base summon and rejects invalid choices and insufficient currency', () => {
    const state = game(), player = state.players.p1;
    player.souls = 0;
    expect(dispatch(state, 'p1', { type: 'summon' }).ok).toBe(false);
    expect(dispatch(state, 'p1', { type: 'choose-hero', heroId: '__missing__' }).ok).toBe(false);
    player.souls = 20;
    command(state, { type: 'summon' });
    expect(player.souls).toBe(20 - RANDOM_SUMMON_COST);
    expect(Object.keys(state.units)).toHaveLength(1);
    expect(dispatch(state, 'p1', { type: 'summon', pack: 'tien' }).ok).toBe(false);
  });
  it('keeps an unlimited collection and swaps deployed units', () => {
    const state = game(), active = deployed(state);
    for (let n = 0; n < 21; n++) summon(state);
    command(state, { type: 'bench', unitId: active.id });
    command(state, { type: 'summon' });
    command(state, { type: 'deploy', unitId: active.id, slot: 0 });
    const reserve = Object.values(state.units).find(u => u.slot < 0)!;
    command(state, { type: 'deploy', unitId: reserve.id, slot: 0 });
    expect(active.slot).toBe(-1); expect(reserve.slot).toBe(0);
    for (const slot of [-1, 5, 1.5, NaN]) expect(dispatch(state, 'p1', { type: 'deploy', unitId: reserve.id, slot }).ok).toBe(false);
    expect(Object.values(state.units).filter(u => u.slot < 0)).toHaveLength(22);
  });
  it('merges exactly three equal copies, retains best gear and prevents rank-2 duplicates', () => {
    const state = game(), copies = Array.from({ length: 6 }, () => summon(state));
    expect(dispatch(state, 'p1', { type: 'merge', unitId: copies[0].id }).ok).toBe(true);
    expect(copies[0].rank).toBe(2); expect(Object.keys(state.units)).toHaveLength(4);
    state.players.p1.gold = 1000;
    command(state, { type: 'equip', unitId: copies[4].id, category: 0 });
    command(state, { type: 'merge', unitId: copies[3].id });
    expect(copies[3].equipment[0]).toBe(1);
    command(state, { type: 'deploy', unitId: copies[0].id, slot: 0 });
    expect(dispatch(state, 'p1', { type: 'deploy', unitId: copies[3].id, slot: 1 }).ok).toBe(false);
    expect(dispatch(state, 'p1', { type: 'merge', unitId: copies[0].id }).ok).toBe(false);
  });
  it('upgrades all gear groups to level five, charges exact costs and refunds on sale', () => {
    const state = game(), unit = summon(state), initial = 100000;
    state.players.p1.gold = initial;
    for (const category of [0, 1, 2]) for (let n = 0; n < 5; n++) command(state, { type: 'equip', unitId: unit.id, category });
    const total = 3 * Array.from({ length: 5 }, (_, i) => equipmentCost(i)).reduce((a, b) => a + b, 0);
    expect(state.players.p1.gold).toBe(initial - total);
    expect(unit.attack).toBeGreaterThan(HEROES[0].attack); expect(unit.maxHp).toBeGreaterThan(HEROES[0].hp);
    expect(dispatch(state, 'p1', { type: 'equip', unitId: unit.id, category: 0 }).ok).toBe(false);
    for (const category of [-1, 3, .5, NaN]) expect(dispatch(state, 'p1', { type: 'equip', unitId: unit.id, category }).ok).toBe(false);
    const souls = state.players.p1.souls;
    command(state, { type: 'sell', unitId: unit.id });
    expect(state.units[unit.id]).toBeUndefined(); expect(state.players.p1.gold).toBe(initial - total / 2);
    expect(state.players.p1.souls).toBe(souls + 1);
  });
  it('rejects every command against another owner without state mutation', () => {
    const state = game(), unit = deployed(state);
    const commands = [
      { type: 'deploy', slot: 1 }, { type: 'bench' }, { type: 'sell' }, { type: 'merge' },
      { type: 'equip', category: 0 }, { type: 'move', x: 0, z: 0 }, { type: 'stop' },
      { type: 'attack', target: 'missing' }, { type: 'cast' }, { type: 'save-position' },
    ];
    const before = JSON.stringify(state);
    for (const value of commands) expect(dispatch(state, 'p2', { ...value, unitId: unit.id } as Parameters<typeof dispatch>[2]).ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });
  it('refuses unaffordable equipment without charging and refuses unknown unit ids', () => {
    const state = game(), unit = summon(state);
    state.players.p1.gold = 79;
    const before = JSON.stringify(state);
    expect(dispatch(state, 'p1', { type: 'equip', unitId: unit.id, category: 0 }).ok).toBe(false);
    expect(dispatch(state, 'p1', { type: 'sell', unitId: 'missing' }).ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('synergies, formations and movement', () => {
  it.each(SYNERGIES)('activates distinct members for synergy $id; copies do not multiply membership', (synergy) => {
    const state = game(), threshold = synergy.thresholds[0];
    for (let i = 0; i < Math.min(threshold, 5); i++) deployed(state, synergy.members[i], i);
    const active = state.players.p1.activeSynergies.find(s => s.id === synergy.id);
    expect(active?.count).toBe(threshold); expect(active?.level).toBeGreaterThan(0);
    const ids = Object.values(state.units);
    command(state, { type: 'bench', unitId: ids.at(-1)!.id });
    expect(state.players.p1.activeSynergies.find(s => s.id === synergy.id)).toBeUndefined();
    const duplicate = summon(state, synergy.members[0]);
    command(state, { type: 'deploy', unitId: duplicate.id, slot: threshold - 1 });
    expect(state.players.p1.activeSynergies.find(s => s.id === synergy.id)).toBeUndefined();
  });
  it.each(FORMATIONS)('upgrades formation $id with points and wave-dependent cap', (formation) => {
    const state = game(), unit = deployed(state);
    command(state, { type: 'formation', formation: formation.id });
    const original = { attack: unit.attack, hp: unit.maxHp, armor: unit.armor, interval: attackInterval(state, unit) };
    state.players.p1.formationPoints = 4;
    for (let n = 0; n < 3; n++) command(state, { type: 'upgrade-formation', formation: formation.id });
    if (formation.bonus === 'attack') expect(unit.attack).toBeGreaterThan(original.attack);
    if (formation.bonus === 'health') expect(unit.maxHp).toBeGreaterThan(original.hp);
    if (formation.bonus === 'armor') expect(unit.armor).toBeGreaterThan(original.armor);
    if (formation.bonus === 'speed') expect(attackInterval(state, unit)).toBeLessThan(original.interval);
    if (formation.bonus === 'regen') { unit.hp /= 2; const injuredHp = unit.hp; combatStep(state, .1); expect(unit.hp).toBeGreaterThan(injuredHp); }
    expect(dispatch(state, 'p1', { type: 'upgrade-formation', formation: formation.id }).ok).toBe(false);
    state.wave = 16; command(state, { type: 'upgrade-formation', formation: formation.id });
    expect(state.players.p1.formationLevels[formation.id - 1]).toBe(4);
    expect(dispatch(state, 'p1', { type: 'upgrade-formation', formation: formation.id }).ok).toBe(false);
  });
  it('refuses unknown formations and upgrades without points', () => {
    const state = game(); state.players.p1.formationPoints = 0;
    const before = JSON.stringify(state);
    for (const formation of [0, 9, NaN]) expect(dispatch(state, 'p1', { type: 'formation', formation }).ok).toBe(false);
    expect(dispatch(state, 'p1', { type: 'upgrade-formation', formation: 1 }).ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });
  it('preserves injured health fraction through repeated health formation switches', () => {
    const state = game(), unit = deployed(state);
    const originalMax = unit.maxHp;
    unit.hp = unit.maxHp * .25;
    command(state, { type: 'upgrade-formation', formation: 6 });
    for (let n = 0; n < 30; n++) {
      command(state, { type: 'formation', formation: 6 });
      expect(unit.maxHp).toBeGreaterThan(originalMax);
      expect(unit.hp / unit.maxHp).toBeCloseTo(.25, 10);
      command(state, { type: 'formation', formation: 1 });
      expect(unit.maxHp).toBe(originalMax);
      expect(unit.hp).toBeCloseTo(originalMax * .25, 8);
    }
  });
  it('preserves injured health fraction when a health synergy repeatedly activates/deactivates', () => {
    const state = game(), synergy = SYNERGIES.find(s => s.bonus === 'health')!;
    const unit = deployed(state, synergy.members[0]), partner = summon(state, synergy.members[1]);
    const originalMax = unit.maxHp; unit.hp = originalMax * .4;
    for (let n = 0; n < 30; n++) {
      command(state, { type: 'deploy', unitId: partner.id, slot: 1 });
      expect(unit.maxHp).toBeGreaterThan(originalMax);
      expect(unit.hp / unit.maxHp).toBeCloseTo(.4, 10);
      command(state, { type: 'bench', unitId: partner.id });
      expect(unit.maxHp).toBe(originalMax);
      expect(unit.hp).toBeCloseTo(originalMax * .4, 8);
    }
  });
  it('validates positions, moves to a destination, stops, attacks and stores/resets position', () => {
    const state = game(), unit = deployed(state); start(state);
    for (const [x, z] of [[NaN, 0], [0, Infinity], [45, 0], [0, 29], [0, -37]]) expect(dispatch(state, 'p1', { type: 'move', unitId: unit.id, x, z }).ok).toBe(false);
    for (const [x, z] of [[44, 28], [-44, -36]]) expect(dispatch(state, 'p1', { type: 'move', unitId: unit.id, x, z }).ok).toBe(true);
    command(state, { type: 'move', unitId: unit.id, x: unit.x + 1, z: unit.z });
    const destination = { ...unit.destination! };
    for (let n = 0; n < 20; n++) stepGame(state, .05);
    expect(unit.x).toBe(destination.x); expect(unit.destination).toBeNull();
    command(state, { type: 'save-position', unitId: unit.id }); expect(unit.savedPosition).toEqual(destination);
    command(state, { type: 'save-position', unitId: unit.id, clear: true }); expect(unit.savedPosition).toBeNull();
    command(state, { type: 'stop', unitId: unit.id }); expect(unit.stopped).toBe(true);
    const target = enemy(state, unit);
    command(state, { type: 'attack', unitId: unit.id, target: target.id }); stepGame(state, .05);
    expect(target.hp).toBeLessThan(target.maxHp); expect(unit.stopped).toBe(false);
  });

  it('gives heroes in a move order distinct destinations', () => {
    const state = game(1), first = deployed(state, 'h001', 0), second = deployed(state, 'h002', 1);
    start(state);
    command(state, { type: 'order', order: 'move', unitIds: [first.id, second.id], x: 0, z: 0 });
    expect(Math.abs(first.destination!.x - second.destination!.x)).toBe(1.9);
  });
});

describe('admin commands', () => {
  it('allows acquiring any hero at chosen rank with instant deploy or to collection', () => {
    const state = game();
    const heroId = HEROES[0].id;
    const r1 = dispatch(state, 'p1', { type: 'admin-get-hero', heroId, rank: 1 });
    expect(r1.ok).toBe(true);
    const unit1 = Object.values(state.units).find(u => u.heroId === heroId && u.rank === 1);
    expect(unit1).toBeDefined();
    expect(unit1?.slot).toBe(-1);

    const heroId2 = HEROES[1].id;
    const r2 = dispatch(state, 'p1', { type: 'admin-get-hero', heroId: heroId2, rank: 3, deploy: true });
    expect(r2.ok).toBe(true);
    const unit2 = Object.values(state.units).find(u => u.heroId === heroId2 && u.rank === 3);
    expect(unit2).toBeDefined();
    expect(unit2?.slot).toBe(0);
    expect(unit2?.hp).toBe(unit2?.maxHp);

    const r3 = dispatch(state, 'p1', { type: 'admin-get-hero', heroId, rank: 6 });
    expect(r3.ok).toBe(true);
    const unit3 = Object.values(state.units).find(u => u.heroId === heroId && u.rank === 6);
    expect(unit3).toBeDefined();

    expect(dispatch(state, 'p1', { type: 'admin-get-hero', heroId: 'non_existent_hero' }).ok).toBe(false);
    expect(dispatch(state, 'p1', { type: 'admin-get-hero', heroId, rank: 11 }).ok).toBe(false);
    expect(dispatch(state, 'p1', { type: 'admin-get-hero', heroId, rank: 0 }).ok).toBe(false);
  });

  it('adds resources via admin-resources', () => {
    const state = game();
    const p = state.players.p1;
    const initialSouls = p.souls;
    const initialGold = p.gold;
    const initialPellets = p.pellets;
    const initialPoints = p.formationPoints;

    const r = dispatch(state, 'p1', {
      type: 'admin-resources',
      souls: 10000,
      gold: 50000,
      pellets: 100,
      formationPoints: 10,
    });
    expect(r.ok).toBe(true);
    expect(p.souls).toBe(initialSouls + 10000);
    expect(p.gold).toBe(initialGold + 50000);
    expect(p.pellets).toBe(initialPellets + 100);
    expect(p.formationPoints).toBe(initialPoints + 10);
  });
});
