import { describe, expect, it } from 'vitest';
import { commandEnvelope, playerName, RateLimit } from '../src/validation.js';

describe('network boundaries', () => {
  it('validates names without silently truncating', () => {
    expect(playerName('  Người chơi  ')).toBe('Người chơi');
    for (const name of ['', 'x'.repeat(25), '<script>', 'hello\nworld', 4, null]) expect(playerName(name)).toBeNull();
  });
  it('rejects malformed, unknown, oversized or nonfinite command fields', () => {
    for (const value of [null, { id: 0, command: { type: 'start' } }, { id: 1, command: { type: 'cash', amount: 9999 } }, { id: 1, playerId: 'victim', command: { type: 'start' } }, { id: 1, command: { type: 'move', unitId: 'u1', x: NaN, z: 0 } }, { id: 1, command: { type: 'deploy', unitId: 'u1', slot: 5 } }, { id: 1, command: { type: 'summon', heroId: 'x'.repeat(65) } }, { id: 1, command: { type: 'dungeon', dungeonId: 1, unitIds: ['u1', 'u1'] } }]) expect(commandEnvelope(value)).toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'summon', pack: 'tien' } })).not.toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'summon', pack: 'invalid' } })).toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'redeem', item: 'embryo-4' } })).not.toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'redeem', item: 'free-gold' } })).toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'choose-hero', heroId: 'h001' } })).not.toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'formation', formation: 8 } })).not.toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'speed', speed: 4 } })).not.toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'bond-action', action: 'am-binh' } })).not.toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'bond-action', action: 'luan-hoi-auto', enabled: false } })).not.toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'bond-action', action: 'luan-hoi-auto' } })).toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'bond-action', action: 'am-binh', enabled: true } })).toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'bond-action', action: 'free-souls' } })).toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'craft', heroId: 'h009' } })).not.toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'craft', heroId: 'h009', unitIds: ['u1'] } })).toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'admin-get-hero', heroId: 'h001', rank: 6, deploy: true } })).not.toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'admin-get-hero', heroId: 'h001' } })).not.toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'admin-get-hero', heroId: 'h001', rank: 11 } })).toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'admin-get-hero', heroId: 'h001', rank: 0 } })).toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'admin-resources', gold: 10000, souls: 5000, pellets: 20, formationPoints: 5 } })).not.toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'admin-resources', gold: -1 } })).toBeNull();
    expect(commandEnvelope({ id: 1, command: { type: 'admin-resources', formationPoints: 101 } })).toBeNull();
  });
  it('bounds command bursts', () => {
    const limit = new RateLimit(2, 0);
    expect(limit.take()).toBe(true); expect(limit.take()).toBe(true); expect(limit.take()).toBe(false);
  });
  it('validates atomic group order shape and limits', () => {
    const wrap = (command: unknown) => commandEnvelope({ id: 1, command });
    expect(wrap({ type: 'order', unitIds: ['u1', 'u2'], order: 'attack-move', x: 0, z: 3 })).not.toBeNull();
    for (const command of [
      { type: 'order', unitIds: ['u1', 'u1'], order: 'hold' },
      { type: 'order', unitIds: ['u1'], order: 'move', x: Infinity, z: 0 },
      { type: 'order', unitIds: ['u1'], order: 'attack', target: 'e1', x: 0 },
      { type: 'order', unitIds: ['u1'], order: 'stop', target: 'e1' },
      { type: 'order', unitIds: Array(6).fill('u1'), order: 'hold' },
    ]) expect(wrap(command)).toBeNull();
  });
  it('accepts the expanded valley edge and rejects orders beyond it', () => {
    const wrap = (command: unknown) => commandEnvelope({ id: 1, command });
    for (const [x, z] of [[-44, -36], [44, 28]]) {
      expect(wrap({ type: 'move', unitId: 'u1', x, z })).not.toBeNull();
      expect(wrap({ type: 'order', unitIds: ['u1'], order: 'move', x, z })).not.toBeNull();
    }
    for (const [x, z] of [[-44.01, 0], [0, 28.01], [0, -36.01]]) {
      expect(wrap({ type: 'move', unitId: 'u1', x, z })).toBeNull();
      expect(wrap({ type: 'order', unitIds: ['u1'], order: 'move', x, z })).toBeNull();
    }
  });
});
