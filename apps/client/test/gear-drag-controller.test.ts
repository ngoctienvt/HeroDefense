import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import type { GearItem } from '../../../packages/contracts/src/types.js';
import { grantGearItem, rollGearItem } from '../../../packages/game-core/src/gear-items.js';
import { command, game, summon } from '../../../packages/game-core/test/fixtures.js';
import { gearDragThreshold, gearDropPolicy, type GearDropDecision, type GearInteractionView } from '../src/gear-drop-policy.js';
import { GearPendingStore } from '../src/gear-pending-store.js';

function fixture() {
  const state = game(), source = summon(state), target = summon(state), ally = summon(state, HEROES[0].id, 'p2');
  const item = rollGearItem(state, { slot: 'weapon', rarity: 'blue' });
  const oldItem = rollGearItem(state, { slot: 'weapon', rarity: 'purple' });
  grantGearItem(state, 'p1', item, 'admin'); grantGearItem(state, 'p1', oldItem, 'admin');
  const view: GearInteractionView = { state, selfId: 'p1', status: 'connected', generation: 1 };
  return { state, source, target, ally, item, oldItem, view };
}
function move(decision: GearDropDecision) {
  if (decision.kind !== 'equip' && decision.kind !== 'unequip') throw new Error(`Expected a legal move: ${decision.reason}`);
  return decision;
}

describe('gear target policy', () => {
  it('uses a six CSS pixel Euclidean threshold', () => {
    expect(gearDragThreshold(100, 100, 105.9, 100)).toBe(false);
    expect(gearDragThreshold(100, 100, 106, 100)).toBe(true);
    expect(gearDragThreshold(100, 100, 104, 105)).toBe(true);
  });
  it('allows own dead and reserve heroes and warns about affix fit without adding a rule', () => {
    const { view, target, item } = fixture(); target.hp = 0; target.respawn = 10;
    item.lines = [{ stat: 'rage-gain', value: 10 }];
    expect(gearDropPolicy(view, item.id, { kind: 'unit', unitId: target.id }).kind).toBe('equip');
    expect(gearDropPolicy(view, item.id, { kind: 'unit', unitId: target.id, slot: 'weapon' }).kind).toBe('equip');
  });
  it('rejects ally, summon, missing hero, wrong slot and ordinary empty terrain', () => {
    const { view, target, ally, item } = fixture();
    for (const destination of [ally.id, 'missing']) expect(gearDropPolicy(view, item.id, { kind: 'unit', unitId: destination }).kind).toBe('invalid');
    expect(gearDropPolicy(view, item.id, { kind: 'unit', unitId: target.id, slot: 'armor' }).kind).toBe('invalid');
    expect(gearDropPolicy(view, item.id, { kind: 'invalid' }).kind).toBe('invalid');
    target.summonDuration = 0;
    expect(gearDropPolicy(view, item.id, { kind: 'unit', unitId: target.id }).kind).toBe('invalid');
  });
  it('replaces into the bag without swapping and leaves source gear unchanged during preview', () => {
    const { state, view, source, target, item, oldItem } = fixture();
    command(state, { type: 'equip-item', itemId: item.id, unitId: source.id });
    command(state, { type: 'equip-item', itemId: oldItem.id, unitId: target.id });
    const preview = move(gearDropPolicy(view, item.id, { kind: 'unit', unitId: target.id }));
    expect(preview.replacedItem?.id).toBe(oldItem.id); expect(item.unitId).toBe(source.id);
    command(state, preview.command);
    expect(item.unitId).toBe(target.id); expect(oldItem.unitId).toBeNull();
    expect(gearDropPolicy(view, item.id, { kind: 'unit', unitId: target.id }).kind).toBe('noop');
    expect(move(gearDropPolicy(view, item.id, { kind: 'bag' })).command).toEqual({ type: 'unequip-item', itemId: item.id });
    expect(gearDropPolicy(view, oldItem.id, { kind: 'bag' }).kind).toBe('noop');
  });
  it('revalidates ownership, connection and terminal phase from the latest state', () => {
    const { view, state, target, item } = fixture(), destination = { kind: 'unit', unitId: target.id } as const;
    view.status = 'disconnected'; expect(gearDropPolicy(view, item.id, destination).kind).toBe('invalid');
    view.status = 'connected'; state.phase = 'won'; expect(gearDropPolicy(view, item.id, destination).kind).toBe('invalid');
    state.phase = 'lobby'; state.players.p1.gear = []; expect(gearDropPolicy(view, item.id, destination).kind).toBe('invalid');
  });
});

describe('gear pending receipts', () => {
  it('locks source, destination and displaced gear until the expected snapshot arrives before ack', () => {
    const { state, view, source, target, item, oldItem } = fixture(), pending = new GearPendingStore();
    command(state, { type: 'equip-item', itemId: item.id, unitId: source.id });
    command(state, { type: 'equip-item', itemId: oldItem.id, unitId: target.id });
    const decision = move(gearDropPolicy(view, item.id, { kind: 'unit', unitId: target.id }, pending));
    pending.add(11, 1, decision, state.players.p1.gearVersion, 0);
    expect(pending.isItemPending(item.id)).toBe(true); expect(pending.isItemPending(oldItem.id)).toBe(true);
    expect(pending.isSlotPending(source.id, item.slot)).toBe(true); expect(pending.isSlotPending(target.id, item.slot)).toBe(true);
    expect(gearDropPolicy(view, oldItem.id, { kind: 'unit', unitId: source.id }, pending).kind).toBe('invalid');
    command(state, decision.command);
    expect(pending.snapshot(state.players.p1.gear, state.players.p1.gearVersion, 1)[0].outcome).toBe('confirmed');
    expect(pending.ack({ id: 11, ok: true }, 1)).toBeNull(); expect(pending.size).toBe(0);
  });
  it('a successful ack waits for snapshot; rejected and stale acknowledgements do not fake a gear change', () => {
    const { state, view, target, item } = fixture(), pending = new GearPendingStore();
    pending.add(12, 1, move(gearDropPolicy(view, item.id, { kind: 'unit', unitId: target.id })), state.players.p1.gearVersion, 0);
    expect(pending.ack({ id: 12, ok: false }, 0)).toBeNull(); expect(pending.size).toBe(1);
    expect(pending.ack({ id: 12, ok: true }, 1)).toBeNull(); expect(pending.size).toBe(1);
    expect(pending.snapshot(state.players.p1.gear, state.players.p1.gearVersion, 1)).toEqual([]);
    expect(pending.ack({ id: 12, ok: false, message: 'Bị từ chối' }, 1)?.outcome).toBe('rejected');
    expect(item.unitId).toBeNull(); expect(pending.size).toBe(0);
  });
  it('times out once, retains locks, and resolves uncertainty only on a fresh authoritative snapshot', () => {
    const { state, view, target, item } = fixture(), pending = new GearPendingStore();
    pending.add(13, 1, move(gearDropPolicy(view, item.id, { kind: 'unit', unitId: target.id })), state.players.p1.gearVersion, 0);
    expect(pending.expire(4999)).toEqual([]); expect(pending.expire(5000)).toHaveLength(1);
    expect(pending.isItemPending(item.id)).toBe(true); expect(pending.expire(10000)).toEqual([]);
    expect(pending.snapshot(state.players.p1.gear, state.players.p1.gearVersion, 1)[0].outcome).toBe('synchronized');
    expect(item.unitId).toBeNull(); expect(pending.size).toBe(0);
  });
  it('clears old-generation receipts and does not match missing items to an unequip', () => {
    const { state, view, source, item } = fixture(), pending = new GearPendingStore();
    command(state, { type: 'equip-item', itemId: item.id, unitId: source.id });
    pending.add(14, 1, move(gearDropPolicy(view, item.id, { kind: 'bag' })), state.players.p1.gearVersion, 0);
    expect(pending.snapshot([] satisfies GearItem[], state.players.p1.gearVersion, 1)).toEqual([]);
    expect(pending.size).toBe(1); pending.snapshot(state.players.p1.gear, state.players.p1.gearVersion, 2);
    expect(pending.size).toBe(0); expect(pending.ack({ id: 14, ok: true }, 1)).toBeNull();
  });
});
