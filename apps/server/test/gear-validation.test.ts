import { describe, expect, it } from 'vitest';
import { GEAR_UNIQUE_IDS } from '../../../packages/contracts/src/gear-types.js';
import { commandEnvelope } from '../src/validation.js';

describe('gear command boundary', () => {
  const wrap = (command: unknown) => commandEnvelope({ id: 1, command });
  it('accepts inventory actions and each explicitly listed unique', () => {
    expect(wrap({ type: 'equip-item', itemId: 'g1', unitId: 'u1' })).not.toBeNull();
    for (const type of ['unequip-item', 'enhance-item', 'reroll-item', 'salvage-item'])
      expect(wrap({ type, itemId: 'g1' })).not.toBeNull();
    expect(wrap({ type: 'admin-item' })).not.toBeNull();
    for (const unique of GEAR_UNIQUE_IDS) expect(wrap({ type: 'admin-item', unique })).not.toBeNull();
  });
  it('rejects malformed identifiers, client injected fields, old equip and unknown enum values', () => {
    for (const command of [
      { type: 'equip', unitId: 'u1', category: 0 },
      { type: 'equip-item', itemId: '../g1', unitId: 'u1' },
      { type: 'equip-item', itemId: 'g1', unitId: 'x'.repeat(65) },
      { type: 'equip-item', itemId: 'g1', unitId: 'u1', owner: 'p2' },
      { type: 'enhance-item', itemId: 'g1', enhance: 10 },
      { type: 'admin-item', slot: '__proto__' },
      { type: 'admin-item', rarity: 'orange' },
      { type: 'admin-item', unique: 'free-power' },
      { type: 'admin-item', lines: [] },
    ]) expect(wrap(command)).toBeNull();
  });
});
