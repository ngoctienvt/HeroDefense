import { describe, expect, it } from 'vitest';
import { handleCommand } from '../src/index.js';
import { RANDOM_SUMMON_COST, sellRefund, SUMMON_FAIL_PELLETS, SUMMON_PITY } from '../src/rules.js';
import { grantGearItem, rollGearItem } from '../src/gear-items.js';
import { command, game, summon } from './fixtures.js';

describe('sell refund shown by the HUD confirm dialog', () => {
  it('matches what the server actually pays back', () => {
    const state = game(1), player = state.players.p1;
    player.souls = 10; player.gold = 10_000;
    const unit = summon(state);
    const item = rollGearItem(state, { slot: 'weapon', rarity: 'white', level: 1 });
    grantGearItem(state, 'p1', item, 'admin');
    command(state, { type: 'equip-item', unitId: unit.id, itemId: item.id });
    command(state, { type: 'enhance-item', itemId: item.id });
    command(state, { type: 'enhance-item', itemId: item.id });
    const expected = sellRefund(unit);
    expect(expected.gold).toBe(0);
    expect(expected.souls).toBe(Math.max(1, Math.floor(RANDOM_SUMMON_COST * 3 ** (unit.rank - 1) / 2)));
    const souls = player.souls, gold = player.gold;
    expect(handleCommand(state, 'p1', { type: 'sell', unitId: unit.id }).ok).toBe(true);
    expect(player.souls - souls).toBe(expected.souls);
    expect(player.gold - gold).toBe(expected.gold);
    expect(item.unitId).toBeNull();
    expect(player.gear).toContain(item);
  });

  it('exports the pity thresholds the summon bar displays', () => {
    expect(SUMMON_PITY).toEqual({ tien: 4, thien: 5 });
    expect(SUMMON_FAIL_PELLETS).toEqual({ tien: 1, thien: 3 });
  });
});
