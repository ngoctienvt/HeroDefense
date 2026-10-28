import { describe, expect, it } from 'vitest';
import { SUMMON_PACKS } from '../../../packages/game-core/src/rules.js';
import { HEROES } from '../../../content/catalog.js';
import { addPlayer, createGame } from '../../../packages/game-core/src/index.js';
import { createUnit } from '../../../packages/game-core/src/unit-factory.js';
import type { Player } from '../../../packages/contracts/src/types.js';
import { barColorKey, barFaction } from '../src/bar-style.js';
import { energyLabel, energyState, hpState } from '../src/hero-status.js';
import { summonPackState } from '../src/summon-state.js';
import { gearLabel, packOddsLines, phaseLabel, starText, tierLabel } from '../src/ui-labels.js';
import { PALETTE, shadeHex } from '../src/ui-palette.js';

const player = (patch: Partial<Player> = {}): Player => ({
  id: 'p1', name: 'A', color: '#fff', connected: true, ready: true, gold: 0, souls: 0, pellets: 0, kills: 0, damage: 0,
  summonFailures: { tien: 0, thien: 0 }, pendingChoice: null, embryos: { tier3: 0, tier4: 0, tier4Purchased: false },
  formation: 1, formationLevels: [0, 0, 0, 0, 0, 0, 0, 0], formationPoints: 0, activeSynergies: [],
  bondState: { souls: 0, longUy: 0, thanVi: 0, tamTai: 0, dienTich: 0, kiep: 0, dienHai: 0, usedThisWave: {} }, bondVersion: 0,
  gear: [], gearDust: 0, gearDrought: 0, gearVersion: 0, ...patch,
});

describe('ui labels', () => {
  it('writes ranks as stars up to six, then as a number', () => {
    expect(starText(1)).toBe('★');
    expect(starText(6)).toBe('★★★★★★');
    expect(starText(7)).toBe('7★');
    expect(starText(10)).toBe('10★');
  });
  it('uses Phẩm for hero tier and +N for gear', () => {
    expect(tierLabel(3)).toBe('Phẩm 3');
    expect(gearLabel(0, 2)).toBe('Vũ khí +2');
    expect(gearLabel(2, 5)).toBe('Pháp khí +5');
  });
  it('derives pack odds from the server rule table', () => {
    const tien = packOddsLines('tien').join(' | ');
    expect(tien).toContain(`${Math.round(SUMMON_PACKS.tien.success * 100)}% thành công`);
    expect(tien).toContain('Bảo hiểm');
    expect(packOddsLines('phan').join(' ')).not.toContain('Trượt');
  });
  it('names the base Linh Trụ when the run is lost', () => {
    expect(phaseLabel({ phase: 'lost' }, true)).toContain('Linh Trụ');
  });
});

describe('hero status', () => {
  it('buckets HP like the HUD bars', () => {
    expect(hpState(80, 100)).toEqual({ percent: 80, level: 'high' });
    expect(hpState(50, 100).level).toBe('mid');
    expect(hpState(35, 100).level).toBe('low');
    expect(hpState(5, 0).percent).toBe(0);
  });
  it('reads rage heroes from energy and ignores cooldown', () => {
    const unit = createUnit(createGame('TEST01', 1, 'normal'), 'p1', HEROES[0].id);
    Object.assign(unit, { energyType: 'rage_on_attack', energy: 62, maxEnergy: 100, abilityCooldown: 9 });
    const state = energyState(unit, { ability: { name: 'x', description: '', kind: 'strike' as never, cooldown: 10, power: 1 } });
    expect(state).toMatchObject({ kind: 'rage', percent: 62, ready: false });
    expect(energyLabel(state)).toBe('Nộ 62/100');
  });
  it('uses shared gear cooldown reduction and refreshes across snapshots', () => {
    const hero = { ability: { name: 'x', description: '', kind: 'strike' as never, cooldown: 12, power: 1 } };
    const game = createGame('TEST01', 1, 'normal'); addPlayer(game, 'p1', 'A');
    const definition = HEROES.find(hero => hero.ability && (hero.energyType ?? 'cooldown') === 'cooldown')!;
    const unit = createUnit(game, 'p1', definition.id); unit.abilityCooldown = 4.8;
    game.units[unit.id] = unit;
    game.players.p1.gear.push({ id: 'g1', slot: 'talisman', rarity: 'blue', level: 20, enhance: 0, rerolls: 0, unitId: unit.id, lines: [{ stat: 'cooldown-reduction', value: 20 }] });
    const state = energyState(unit, hero, game);
    expect(state.kind).toBe('cooldown');
    expect(state.max).toBeCloseTo(9.6);
    expect(state.percent).toBe(50);
    expect(energyLabel(state)).toBe('Còn 5s');
    const next = structuredClone(game); next.players.p1.gear = [];
    expect(energyState(next.units[unit.id], hero, next).max).toBe(12);
    unit.abilityCooldown = 0;
    expect(energyState(unit, hero, game).ready).toBe(true);
  });
  it('reports heroes without an active skill as passive', () => {
    const unit = createUnit(createGame('TEST01', 1, 'normal'), 'p1', HEROES[0].id);
    expect(energyLabel(energyState(unit, { ability: null }))).toBe('Bị động');
  });
});

describe('summon pack state', () => {
  const combat = (wave: number) => ({ phase: 'combat' as const, wave });
  it('is available with enough Đạo Duyên after the unlock wave', () => {
    expect(summonPackState('phan', player({ souls: 2 }), combat(1)).status).toBe('available');
  });
  it('reports how much Đạo Duyên is missing', () => {
    expect(summonPackState('phan', player({ souls: 1 }), combat(1))).toMatchObject({ status: 'short', shortBy: 1 });
  });
  it('locks Tiên Chiêu before its wave; preparation counts the coming wave', () => {
    expect(summonPackState('tien', player({ souls: 99 }), combat(5)).status).toBe('locked');
    expect(summonPackState('tien', player({ souls: 99 }), { phase: 'preparation', wave: 5 }).status).toBe('available');
  });
  it('blocks every pack while a choice is pending, and exposes pity', () => {
    const pending = player({ souls: 99, summonFailures: { tien: 2, thien: 0 }, pendingChoice: { source: 'tien', heroIds: ['a', 'b', 'c'] } });
    const state = summonPackState('tien', pending, combat(10));
    expect(state.status).toBe('choosing');
    expect(state.pity).toEqual({ count: 2, max: 4 });
    expect(summonPackState('phan', pending, combat(10)).pity).toBeNull();
  });
});

describe('battlefield bar style', () => {
  it('colours bars by faction, not by HP', () => {
    expect(barFaction({ hero: true, owner: 'me' }, 'me')).toBe('self');
    expect(barFaction({ hero: true, owner: 'friend' }, 'me')).toBe('ally');
    expect(barFaction({ hero: false, kind: 'melee', rank: 'minion' }, 'me')).toBe('enemy');
    expect(barFaction({ hero: false, kind: 'melee', rank: 'chieftain' }, 'me')).toBe('elite');
    expect(barFaction({ hero: false, kind: 'boss' }, 'me')).toBe('elite');
  });
  it('darkens the same hue at low HP and every key exists in the palette', () => {
    expect(barColorKey('ally', .9)).toBe('faction-ally');
    expect(barColorKey('ally', .2)).toBe('faction-ally-low');
    for (const faction of ['self', 'ally', 'enemy', 'elite'] as const) for (const ratio of [1, .1]) expect(PALETTE[barColorKey(faction, ratio)]).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('shades hex colours toward black', () => {
    expect(shadeHex('#ffffff', .5)).toBe('#808080');
    expect(shadeHex('bad', .5)).toBe('bad');
  });
});
