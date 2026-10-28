import { describe, expect, it } from 'vitest';
import { GEAR_LINE_COUNTS, GEAR_LINES, GEAR_UNIQUES, formatGearLine, gearLevelScale, gearLineFits, gearLineValue } from '../../../content/gear-design.js';
import { DUNGEONS, HEROES } from '../../../content/catalog.js';
import { GEAR_RARITIES, GEAR_SLOTS } from '../../contracts/src/gear-types.js';
import { gearRandom, grantGearItem, onDungeonGearReward, onGearKillDrop, onWaveEndDrought, rollGearItem } from '../src/gear-items.js';
import { random } from '../src/rules.js';
import { deployed, enemy, game } from './fixtures.js';

describe('gear generation and drops', () => {
  it('replays the separate seed without changing main random outcomes', () => {
    const a = game(), b = game();
    a.gearSeed = b.gearSeed = 42;
    const seed = a.seed;
    expect(rollGearItem(a)).toEqual(rollGearItem(b));
    expect(a.seed).toBe(seed);
    gearRandom(a);
    expect(random(a)).toBe(random(b));
  });
  it('changes generated items for different seeds and scales strength for the current twenty-wave run', () => {
    const a = game(), b = game();
    a.gearSeed = 42; b.gearSeed = 43;
    expect(rollGearItem(a)).not.toEqual(rollGearItem(b));
    expect(gearLevelScale(20)).toBe(1);
    expect(gearLevelScale(60)).toBe(1.1);
    expect(gearLineValue({ stat: 'attack-percent', value: 20 }, 10)).toBe(32);
    expect(formatGearLine({ stat: 'attack-percent', value: 20 }, 10)).toContain('32%');
    expect(Object.keys(GEAR_UNIQUES)).toHaveLength(17);
    expect(HEROES.every(hero => !('block' in hero))).toBe(true);
    expect(GEAR_UNIQUES['sea-anchor'].description).toBe('Miễn choáng và đẩy lùi.');
  });
  it('marks shared lines neutral and gates specialized mechanics by the actual hero implementation', () => {
    expect(gearLineFits('attack-percent', 'h01B')).toBeNull();
    expect(gearLineFits('pierce-length', 'h01B')).toBe(false);
    expect(gearLineFits('summon-duration', 'h00R')).toBe(true);
    expect(gearLineFits('summon-duration', 'h00N')).toBe(false);
    expect(gearLineFits('summon-duration', 'unknown')).toBe(false);
  });
  it('keeps line counts, distinct stats and level-scaled values valid for every slot and rarity', () => {
    const state = game();
    for (const slot of GEAR_SLOTS) for (const rarity of GEAR_RARITIES) for (const level of [1, 10, 20, 24]) {
      const item = rollGearItem(state, { slot, rarity, level });
      const [min, max] = GEAR_LINE_COUNTS[rarity];
      expect(item.lines.length).toBeGreaterThanOrEqual(min);
      expect(item.lines.length).toBeLessThanOrEqual(max);
      expect(new Set(item.lines.map(line => line.stat)).size).toBe(item.lines.length);
      expect(!!item.unique).toBe(rarity === 'gold');
      for (const line of item.lines) {
        const def = GEAR_LINES[line.stat], scale = gearLevelScale(level);
        expect(line.value).toBeGreaterThanOrEqual(def.min * scale);
        expect(line.value).toBeLessThanOrEqual(def.max * scale);
        if (def.integer) expect(Number.isInteger(line.value)).toBe(true);
      }
    }
  });
  it('gives every shared boss a blue-or-better item to the actual killer owner, including summons', () => {
    const state = game(), unit = deployed(state, undefined, 0, 'p2');
    unit.summonerId = 'original-owner-unit';
    for (const wave of [5, 10, 15, 20]) {
      state.wave = wave;
      onGearKillDrop(state, unit, enemy(state, unit, { kind: 'boss', rank: 'boss', zone: 0 }));
    }
    expect(state.players.p1.gear).toHaveLength(0);
    expect(state.players.p2.gear).toHaveLength(4);
    expect(state.players.p2.gear.every(item => item.rarity !== 'white')).toBe(true);
    expect(state.events.filter(event => event.kind === 'reward').every(event => event.owner === 'p2')).toBe(true);
  });
  it('waits three empty waves, resets on a natural drop and never treats admin gear as a real drop', () => {
    const state = game(1), player = state.players.p1;
    for (const wave of [1, 2]) { state.wave = wave; onWaveEndDrought(state); }
    expect(player.gear).toHaveLength(0);
    state.wave = 3; onWaveEndDrought(state);
    expect(player.gear).toHaveLength(1);
    expect(player.gear[0].rarity).not.toBe('white');
    state.wave = 4;
    grantGearItem(state, player.id, rollGearItem(state), 'kill');
    onWaveEndDrought(state);
    expect(player.gearDrought).toBe(0);
    state.wave = 5;
    grantGearItem(state, player.id, rollGearItem(state), 'admin');
    onWaveEndDrought(state);
    expect(player.gearDrought).toBe(1);
  });
  it('deduplicates dungeon participants and grants no item to absent owners', () => {
    const state = game();
    onDungeonGearReward(state, DUNGEONS[0].id, ['p2', 'p2', 'missing']);
    expect(state.players.p1.gear).toHaveLength(0);
    expect(state.players.p2.gear).toHaveLength(1);
    expect(['purple', 'gold']).toContain(state.players.p2.gear[0].rarity);
    expect(state.players.p2.gear[0].level).toBe(DUNGEONS[0].wave);
    const item = rollGearItem(state, { source: 'dungeon', dungeonId: 5, rarity: 'purple' });
    expect(item.lines).toHaveLength(4);
  });
});
